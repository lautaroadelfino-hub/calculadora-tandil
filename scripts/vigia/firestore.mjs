// scripts/vigia/firestore.mjs
// Firestore por su API REST, con la sesión del usuario vigía.
//
// El sitio lee Firestore sin sesión (lib/firestoreRest.js), pero las
// colecciones del vigía (`borradores`, `vigia`, `vigia_corridas`, …) sólo las
// pueden leer el administrador y el propio vigía, así que acá TODO viaja con
// `Authorization: Bearer <idToken>`: también lo público, para no tener dos
// caminos. La sesión se abre como en scripts/restaurar.mjs, por Identity
// Toolkit con mail y contraseña.
//
// Tres formas de escribir, a propósito distintas:
//   - crear(ruta, datos): sólo si el documento NO existe (409 si existe). Así
//     dos corridas a la vez no se pisan y un borrador no se duplica.
//   - actualizar(ruta, datos, {updateTime}): sólo los campos que se pasan
//     (updateMask), y si se pasa `updateTime`, sólo si nadie lo tocó desde
//     entonces. Nunca borra un campo que no se nombra.
//   - reemplazar(ruta, datos): el documento entero. Para el estado del vigía.
//
// Los errores llevan el estado HTTP y el mensaje de Firestore, nunca el token.

import { camposARest } from "../../lib/firestoreValores.js";
import { camposDesdeRest } from "../../lib/firestoreRest.js";

const TIMEOUT_MS = 20000;

/** Inicia sesión por Identity Toolkit. En Actions, enmascara el token en el log antes de devolverlo. */
export async function iniciarSesion({ apiKey, email, password, fetchFn = fetch }) {
  const r = await fetchFn(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(`No se pudo iniciar sesión como ${email}: ${(e && e.error && e.error.message) || `HTTP ${r.status}`}`);
  }
  const json = await r.json();
  if (process.env.GITHUB_ACTIONS === "true") {
    // Los logs de Actions de un repo público son públicos: el token se tapa.
    console.log(`::add-mask::${json.idToken}`);
    if (json.refreshToken) console.log(`::add-mask::${json.refreshToken}`);
  }
  return { idToken: json.idToken, uid: json.localId, email: json.email || email, expiraEnSegundos: Number(json.expiresIn) || null };
}

function errorDeFirestore(r, json, que) {
  const mensaje = (json && json.error && json.error.message) || `HTTP ${r.status}`;
  const error = new Error(`Firestore respondió ${r.status} al ${que}: ${mensaje}`);
  error.status = r.status;
  return error;
}

/** Un cliente atado a un proyecto y a una sesión. */
export function clienteFirestore({ proyecto, idToken, fetchFn = fetch, timeoutMs = TIMEOUT_MS }) {
  if (!proyecto) throw new Error("Falta el id del proyecto de Firebase.");
  if (!idToken) throw new Error("Falta la sesión del vigía.");
  const BASE = `https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents`;
  const cabeceras = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };

  const urlDe = (ruta, query) => {
    const partes = String(ruta).split("/").filter(Boolean);
    if (!partes.length || partes.some((p) => p === "." || p === "..")) throw new Error(`Ruta de Firestore inválida: ${ruta}`);
    const base = `${BASE}/${partes.map(encodeURIComponent).join("/")}`;
    return query && String(query) ? `${base}?${query}` : base;
  };
  const esDocumento = (ruta) => String(ruta).split("/").filter(Boolean).length % 2 === 0;

  async function llamar(metodo, url, cuerpo, que) {
    const r = await fetchFn(url, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = r.status === 204 ? null : await r.json().catch(() => null);
    return { r, json };
  }

  return {
    urlDe,

    /** Los campos del documento, o null si no existe. */
    async leer(ruta) {
      const crudo = await this.leerCrudo(ruta);
      return crudo ? crudo.campos : null;
    },

    /** {campos, updateTime} o null si no existe. `updateTime` sirve para actualizar sin pisar. */
    async leerCrudo(ruta) {
      if (!esDocumento(ruta)) throw new Error(`"${ruta}" es una colección, no un documento.`);
      const { r, json } = await llamar("GET", urlDe(ruta), undefined, `leer ${ruta}`);
      if (r.status === 404) return null;
      if (!r.ok) throw errorDeFirestore(r, json, `leer ${ruta}`);
      return { campos: camposDesdeRest(json.fields), updateTime: json.updateTime || null, createTime: json.createTime || null };
    },

    /** Los documentos de una colección como [{id, …campos}]; con `campos`, sólo esos. */
    async listar(ruta, { campos, pageSize = 300 } = {}) {
      if (esDocumento(ruta)) throw new Error(`"${ruta}" es un documento, no una colección.`);
      const docs = [];
      let token = null;
      do {
        const q = new URLSearchParams();
        q.set("pageSize", String(pageSize));
        for (const c of campos || []) q.append("mask.fieldPaths", c);
        if (token) q.set("pageToken", token);
        const { r, json } = await llamar("GET", urlDe(ruta, q), undefined, `listar ${ruta}`);
        if (!r.ok) throw errorDeFirestore(r, json, `listar ${ruta}`);
        for (const d of (json && json.documents) || []) {
          docs.push({ id: d.name.slice(d.name.lastIndexOf("/") + 1), ...camposDesdeRest(d.fields), _updateTime: d.updateTime || null });
        }
        token = (json && json.nextPageToken) || null;
      } while (token);
      return docs;
    },

    /** Crea el documento sólo si no existe. Devuelve {creado: true} o {creado: false, existia: true}. */
    async crear(ruta, datos) {
      const { r, json } = await llamar("PATCH", urlDe(ruta, "currentDocument.exists=false"), { fields: camposARest(datos) }, `crear ${ruta}`);
      if (r.status === 409) return { creado: false, existia: true };
      if (!r.ok) throw errorDeFirestore(r, json, `crear ${ruta}`);
      return { creado: true, updateTime: json && json.updateTime };
    },

    /**
     * Cambia sólo los campos que vienen en `datos`. Con `updateTime` (el que
     * devolvió leerCrudo) frena con 409 si el documento cambió desde entonces.
     * Devuelve {actualizado: true} o {actualizado: false, cambio: true}.
     */
    async actualizar(ruta, datos, { updateTime } = {}) {
      const q = new URLSearchParams();
      for (const k of Object.keys(datos)) q.append("updateMask.fieldPaths", k.includes(".") || /[^A-Za-z0-9_]/.test(k) ? `\`${k}\`` : k);
      if (updateTime) q.set("currentDocument.updateTime", updateTime);
      else q.set("currentDocument.exists", "true");
      const { r, json } = await llamar("PATCH", urlDe(ruta, q), { fields: camposARest(datos) }, `actualizar ${ruta}`);
      if (r.status === 409) return { actualizado: false, cambio: true };
      if (r.status === 404) return { actualizado: false, noExiste: true };
      if (!r.ok) throw errorDeFirestore(r, json, `actualizar ${ruta}`);
      return { actualizado: true, updateTime: json && json.updateTime };
    },

    /** El documento entero, exista o no. */
    async reemplazar(ruta, datos) {
      const { r, json } = await llamar("PATCH", urlDe(ruta), { fields: camposARest(datos) }, `reemplazar ${ruta}`);
      if (!r.ok) throw errorDeFirestore(r, json, `reemplazar ${ruta}`);
      return { updateTime: json && json.updateTime };
    },

    /** Borra el documento; si no existía, no es un error. */
    async borrar(ruta) {
      const { r, json } = await llamar("DELETE", urlDe(ruta), undefined, `borrar ${ruta}`);
      if (r.status === 404) return { borrado: false };
      if (!r.ok) throw errorDeFirestore(r, json, `borrar ${ruta}`);
      return { borrado: true };
    },
  };
}
