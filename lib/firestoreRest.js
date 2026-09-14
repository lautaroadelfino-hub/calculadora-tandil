// lib/firestoreRest.js
// Lectura de Firestore por su API REST pública, sin el SDK de Firebase.
//
// POR QUÉ EXISTE: la portada y la calculadora bajaban sus datos desde el
// navegador con el SDK: primero había que descargar el SDK (cientos de KB) y
// después abrir el canal con Firestore, que en frío tarda dos o tres segundos.
// Mientras tanto la persona veía "Cargando…". Leyendo por REST desde el
// servidor de Cloudflare (edge), la página llega armada en el HTML y el
// navegador no necesita el SDK. Las reglas de Firestore permiten leer sin
// sesión justo lo que la calculadora necesita (ver firestore.rules).
//
// Sirve también desde el navegador (fetch nativo) para lo que se carga después
// de la primera pintada, por ejemplo la escala de otro período.
//
// Las respuestas se cachean en el edge `REVALIDAR_SEGUNDOS` (por datacenter de
// Cloudflare): un cambio hecho en /admin puede tardar hasta ese tiempo en verse.
// Es un minuto y no más porque no hay forma de purgar la caché desde el panel;
// las lecturas son pocas y baratas.

const PROYECTO = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!PROYECTO) {
  // Es una variable de build: si falta en Cloudflare Pages, ninguna lectura funciona.
  console.error("[firestoreRest] Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID: las lecturas de Firestore van a fallar.");
}
const BASE = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;
export const REVALIDAR_SEGUNDOS = 60;
// Si Firestore no contesta en este tiempo, se corta: en el edge la página entera
// espera esta respuesta, y una pestaña en blanco es peor que un aviso.
export const TOPE_MS = 5000;

/** Un valor tipado de la API REST ({stringValue: "x"}, {mapValue: {…}}) a su valor de JS. */
export function valorDesdeRest(v) {
  if (v == null || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return camposDesdeRest(v.mapValue && v.mapValue.fields);
  if ("arrayValue" in v) return ((v.arrayValue && v.arrayValue.values) || []).map(valorDesdeRest);
  if ("referenceValue" in v) return v.referenceValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}

/** Los `fields` de un documento REST a un objeto plano (lo que el SDK devuelve en `doc.data()`). */
export function camposDesdeRest(fields) {
  const out = {};
  if (!fields || typeof fields !== "object") return out;
  for (const k of Object.keys(fields)) out[k] = valorDesdeRest(fields[k]);
  return out;
}

/** Un documento REST ({name, fields}) a {id, …campos}, como arma la app sus listas. */
export function documentoDesdeRest(doc) {
  if (!doc || typeof doc.name !== "string") return null;
  const id = doc.name.slice(doc.name.lastIndexOf("/") + 1);
  return { id, ...camposDesdeRest(doc.fields) };
}

function rutaCodificada(ruta) {
  const partes = String(ruta).split("/").filter(Boolean);
  // Un id sale de la URL del navegador: "." o ".." no son documentos.
  if (!partes.length || partes.some((p) => p === "." || p === "..")) throw new Error(`Ruta de Firestore inválida: ${ruta}`);
  return partes.map(encodeURIComponent).join("/");
}

async function pedir(url, revalidate) {
  const r = await fetch(url, {
    next: { revalidate: revalidate == null ? REVALIDAR_SEGUNDOS : revalidate },
    signal: AbortSignal.timeout(TOPE_MS),
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    // La URL completa queda en el log; a la persona le llega un mensaje sin
    // detalles internos (este error se muestra en pantalla al calcular).
    console.error(`[firestoreRest] Firestore respondió ${r.status} al pedir ${url}`);
    throw new Error(`No se pudo leer la base de datos (HTTP ${r.status}). Probá de nuevo en unos segundos.`);
  }
  return r.json();
}

/** Los campos de un documento, o null si no existe. `ruta` es "coleccion/id[/subcoleccion/id]". */
export async function leerDocumento(ruta, { revalidate } = {}) {
  const json = await pedir(`${BASE}/${rutaCodificada(ruta)}`, revalidate);
  return json ? camposDesdeRest(json.fields) : null;
}

/**
 * Los documentos de una colección como [{id, …campos}]. Con `campos` se pide
 * sólo esa lista de campos (menos bytes); sin ella, el documento entero.
 * Recorre las páginas que hagan falta.
 */
export async function listarColeccion(ruta, { campos, revalidate, pageSize = 300 } = {}) {
  const docs = [];
  let token = null;
  do {
    const q = new URLSearchParams();
    q.set("pageSize", String(pageSize));
    for (const c of campos || []) q.append("mask.fieldPaths", c);
    if (token) q.set("pageToken", token);
    const json = await pedir(`${BASE}/${rutaCodificada(ruta)}?${q.toString()}`, revalidate);
    for (const d of (json && json.documents) || []) {
      const doc = documentoDesdeRest(d);
      if (doc) docs.push(doc);
    }
    token = (json && json.nextPageToken) || null;
  } while (token);
  return docs;
}

/** Sólo los ids de una colección (una máscara vacía trae los documentos sin campos). */
export async function listarIds(ruta, opciones = {}) {
  const docs = await listarColeccion(ruta, { ...opciones, campos: ["__name__"] });
  return docs.map((d) => d.id);
}
