// scripts/vigia/storage.mjs
// Firebase Storage por su API REST, con la sesión del usuario vigía.
//
// Es lo que lib/archivos.js hace desde el navegador con el SDK (subir el
// archivo de un acuerdo), pero desde Node. La cabecera de Storage es
// `Authorization: Firebase <idToken>` (no Bearer). Al subir, Firebase genera un
// token de descarga; con él se arma la URL pública que guarda el documento,
// igual que `getDownloadURL` en el panel.
//
// Las reglas (storage.rules) deciden dónde puede escribir el vigía.

const TIMEOUT_MS = 60000;

function errorDeStorage(r, json, que) {
  const mensaje = (json && json.error && json.error.message) || `HTTP ${r.status}`;
  const error = new Error(`Storage respondió ${r.status} al ${que}: ${mensaje}`);
  error.status = r.status;
  return error;
}

export function clienteStorage({ bucket, idToken, fetchFn = fetch, timeoutMs = TIMEOUT_MS }) {
  if (!bucket) throw new Error("Falta el bucket de Storage (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).");
  if (!idToken) throw new Error("Falta la sesión del vigía.");
  const BASE = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o`;
  const objeto = (ruta) => `${BASE}/${encodeURIComponent(ruta)}`;
  const auth = { Authorization: `Firebase ${idToken}` };

  return {
    /** La URL de descarga que el sitio guarda en el documento. */
    urlDeDescarga(ruta, token) {
      return `${objeto(ruta)}?alt=media&token=${encodeURIComponent(token)}`;
    },

    /** Sube bytes a `ruta` y devuelve lo que se guarda en el documento (como lib/archivos.js). */
    async subir({ ruta, buffer, contentType, nombre }) {
      if (!ruta || !buffer) throw new Error("Para subir hace falta ruta y contenido.");
      const r = await fetchFn(`${BASE}?uploadType=media&name=${encodeURIComponent(ruta)}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": contentType || "application/octet-stream" },
        body: buffer,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const json = await r.json().catch(() => null);
      if (!r.ok) throw errorDeStorage(r, json, `subir ${ruta}`);
      let token = json && json.downloadTokens ? String(json.downloadTokens).split(",")[0] : null;
      if (!token) {
        // Algunas respuestas no traen el token hasta que se piden los metadatos.
        const m = await fetchFn(objeto(ruta), { headers: auth, signal: AbortSignal.timeout(timeoutMs) });
        const meta = await m.json().catch(() => null);
        token = meta && meta.downloadTokens ? String(meta.downloadTokens).split(",")[0] : null;
      }
      return {
        ruta,
        url: token ? this.urlDeDescarga(ruta, token) : null,
        nombre: nombre || ruta.slice(ruta.lastIndexOf("/") + 1),
        tipo: contentType || (json && json.contentType) || null,
        bytes: buffer.length,
      };
    },

    /** Borra el archivo; si no existe, no es un error. */
    async borrar(ruta) {
      const r = await fetchFn(objeto(ruta), { method: "DELETE", headers: auth, signal: AbortSignal.timeout(timeoutMs) });
      if (r.status === 404) return { borrado: false };
      if (!r.ok) throw errorDeStorage(r, await r.json().catch(() => null), `borrar ${ruta}`);
      return { borrado: true };
    },
  };
}
