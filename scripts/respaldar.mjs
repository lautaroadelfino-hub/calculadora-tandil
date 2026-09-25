// scripts/respaldar.mjs
// Baja una copia completa de la base de datos (Firestore) a la carpeta
// respaldos/, con la fecha y la hora en el nombre. Doble clic en
// respaldar.bat, o: node scripts/respaldar.mjs
//
// POR QUÉ EXISTE: la auditoría del 23/9/2026 encontró que no había ningún
// respaldo. Publicar un mes desde /admin reemplaza el período entero, y la
// única copia que existía (el CSV de la pestaña Escalas) no incluía los
// "valores del período" ni las tablas de Ganancias y contribuciones.
//
// Lee por la API REST pública, igual que el sitio (lib/firestoreRest.js): las
// reglas de Firestore dejan leer sin sesión exactamente las colecciones que
// se respaldan acá. No hace falta contraseña. Sólo necesita el id del proyecto,
// que sale de .env.local (NEXT_PUBLIC_FIREBASE_PROJECT_ID).
//
// Se guardan dos copias de cada colección:
//   - <coleccion>.rest.json: los documentos tal como los devuelve Firestore,
//     con sus tipos (timestamps, enteros, mapas). Es lo que usa restaurar.mjs,
//     y no pierde nada.
//   - <coleccion>.json: los mismos datos en JSON común, para leerlos a ojo.
// Las escalas de todos los convenios van juntas en escalas.*.json; cada
// documento lleva su ruta completa en `name`.
//
// Todo se baja a memoria primero y se escribe al final, en una carpeta
// provisoria que se renombra recién cuando está completa: un respaldo a
// medias no puede confundirse con uno bueno. Un respaldo sin documentos
// termina con error, nunca con "listo".
//
// No importa nada de lib/: el script tiene que correr con "node" pelado, sin
// que Node tenga que adivinar el formato de los módulos del sitio.

import { mkdirSync, writeFileSync, existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

// .env.local sin dependencias: Node 20.12+ lo lee solo; si no, se parsea a mano.
function cargarEnv() {
  const archivo = join(raiz, ".env.local");
  if (!existsSync(archivo)) return;
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(archivo);
    return;
  }
  for (const linea of readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
cargarEnv();

const PROYECTO = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!PROYECTO) {
  console.error("Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID. Tiene que estar en .env.local (ver README).");
  process.exit(1);
}
const BASE = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;

// La misma conversión que lib/firestoreRest.js (valorDesdeRest), copiada para
// que el script no dependa del sitio. Sólo para la copia legible.
function valorPlano(v) {
  if (v == null || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return camposPlanos(v.mapValue && v.mapValue.fields);
  if ("arrayValue" in v) return ((v.arrayValue && v.arrayValue.values) || []).map(valorPlano);
  if ("referenceValue" in v) return v.referenceValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}
function camposPlanos(fields) {
  const out = {};
  for (const k of Object.keys(fields || {})) out[k] = valorPlano(fields[k]);
  return out;
}

/** Todos los documentos de una colección, crudos ({name, fields, …}), recorriendo las páginas. */
async function listarCrudo(ruta) {
  const docs = [];
  let token = null;
  do {
    const q = new URLSearchParams({ pageSize: "300" });
    if (token) q.set("pageToken", token);
    const r = await fetch(`${BASE}/${ruta}?${q}`, { signal: AbortSignal.timeout(20000) });
    // Una colección vacía llega como 200 sin `documents`; un 404 es un error
    // de ruta o de proyecto, y un respaldo no puede darlo por "vacío".
    if (!r.ok) throw new Error(`Firestore respondió ${r.status} al pedir ${ruta}`);
    const json = await r.json();
    for (const d of json.documents || []) docs.push(d);
    token = json.nextPageToken || null;
  } while (token);
  return docs;
}

const idDe = (doc) => doc.name.slice(doc.name.lastIndexOf("/") + 1);
const rutaRelativa = (doc) => doc.name.slice(doc.name.indexOf("/documents/") + "/documents/".length);

// Las colecciones que el sitio usa (las mismas que firestore.rules deja leer).
const COLECCIONES = ["convenios", "parametros_ganancias", "parametros_contribuciones", "novedades"];

const ahora = new Date();
const dos = (n) => String(n).padStart(2, "0");
const sello = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;
const fechaLegible = `${dos(ahora.getDate())}/${dos(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${dos(ahora.getHours())}:${dos(ahora.getMinutes())}`;

// 1. Todo a memoria.
const archivos = {};
const resumen = [];
let total = 0;
for (const coleccion of COLECCIONES) {
  const docs = await listarCrudo(coleccion);
  archivos[coleccion] = docs;
  total += docs.length;
  resumen.push(`${coleccion}: ${docs.length} documento(s)`);
  if (coleccion === "convenios") {
    const escalas = [];
    for (const conv of docs) {
      const propias = await listarCrudo(`convenios/${encodeURIComponent(idDe(conv))}/escalas`);
      escalas.push(...propias);
      resumen.push(`  escalas de ${idDe(conv)}: ${propias.map(idDe).sort().join(", ") || "ninguna"}`);
    }
    archivos.escalas = escalas;
    total += escalas.length;
    resumen.push(`escalas: ${escalas.length} documento(s)`);
  }
}
if (total === 0) {
  console.error("Firestore no devolvió ningún documento: no se guardó nada. Revisá el id del proyecto en .env.local.");
  process.exit(1);
}

// 2. A disco, en una carpeta provisoria, y recién al final el nombre definitivo.
const carpetaFinal = join(raiz, "respaldos", sello);
const carpetaParcial = join(raiz, "respaldos", `.parcial-${sello}`);
rmSync(carpetaParcial, { recursive: true, force: true });
mkdirSync(carpetaParcial, { recursive: true });
for (const [nombre, docs] of Object.entries(archivos)) {
  writeFileSync(join(carpetaParcial, `${nombre}.rest.json`), JSON.stringify(docs, null, 1));
  const plano = docs.map((d) => ({ ruta: rutaRelativa(d), ...camposPlanos(d.fields) }));
  writeFileSync(join(carpetaParcial, `${nombre}.json`), JSON.stringify(plano, null, 2));
}
const texto = [`Respaldo de ${PROYECTO} del ${fechaLegible}`, "", ...resumen, "", `${total} documentos en total.`, "Para volver atrás: node scripts/restaurar.mjs (ver docs/continuidad.md)."].join("\n");
writeFileSync(join(carpetaParcial, "resumen.txt"), texto);
renameSync(carpetaParcial, carpetaFinal);

console.log(texto);
console.log(`\nGuardado en ${carpetaFinal}`);
