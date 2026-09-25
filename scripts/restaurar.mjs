// scripts/restaurar.mjs
// Vuelve a subir a Firestore documentos de un respaldo hecho con respaldar.mjs.
// Es el "deshacer" que el panel no tiene: si un mes se publicó mal, se
// restaura el documento del respaldo anterior.
//
//   node scripts/restaurar.mjs <carpeta-del-respaldo> <ruta> [--aplicar] [--borrar-sobrantes]
//
//   <carpeta-del-respaldo>  respaldos/2026-09-24-103000 (o la ruta completa)
//   <ruta>                  un documento: convenios/comercio-cct-130-75/escalas/2026-09
//                           o una colección entera: parametros_contribuciones
//                           o todas las escalas de un convenio: convenios/comercio-cct-130-75/escalas
//
// Sin --aplicar sólo muestra qué haría (ensayo): qué documentos se crean, qué
// documentos se reemplazan y, si la ruta es una colección, cuáles existen hoy
// en Firestore y no estaban en el respaldo ("sobran"). Esos sobrantes no se
// tocan salvo que se pida --borrar-sobrantes.
//
// Restaurar una escala restaura también el documento del convenio del mismo
// respaldo, porque publicar un mes desde /admin escribe los dos juntos (la
// escala y las categorías y zonas del convenio).
//
// Con --aplicar pide la contraseña de la cuenta de administrador (la de
// /admin), sin mostrarla, y escribe por la API REST con esa sesión: respeta
// las mismas reglas de Firestore que el panel. Cada documento se reemplaza
// entero, tal como estaba en el respaldo. La contraseña también se puede
// pasar en la variable de entorno ADMIN_PASSWORD, sólo para esa corrida.
// El mail del administrador sale de ADMIN_EMAIL en .env.local (si no está,
// admin@csueldos.com).

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

function cargarEnv() {
  const archivo = join(raiz, ".env.local");
  if (!existsSync(archivo)) return;
  if (typeof process.loadEnvFile === "function") { process.loadEnvFile(archivo); return; }
  for (const linea of readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
cargarEnv();

const argumentos = process.argv.slice(2);
const banderas = new Set(argumentos.filter((a) => a.startsWith("--")));
const [carpetaArg, rutaArg] = argumentos.filter((a) => !a.startsWith("--"));
const aplicar = banderas.has("--aplicar");
const borrarSobrantes = banderas.has("--borrar-sobrantes");
if (!carpetaArg || !rutaArg) {
  console.error("Uso: node scripts/restaurar.mjs <carpeta-del-respaldo> <ruta> [--aplicar] [--borrar-sobrantes]");
  process.exit(1);
}
const carpeta = resolve(raiz, carpetaArg);
if (!existsSync(carpeta)) {
  console.error(`No existe la carpeta ${carpeta}. Los respaldos están en respaldos/.`);
  process.exit(1);
}
if (!existsSync(join(carpeta, "resumen.txt"))) {
  console.error(`${carpeta} no tiene resumen.txt: ese respaldo quedó a mitad de camino y no se puede usar.`);
  process.exit(1);
}

const PROYECTO = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ADMIN = process.env.ADMIN_EMAIL || "admin@csueldos.com";
if (!PROYECTO || !API_KEY) {
  console.error("Faltan NEXT_PUBLIC_FIREBASE_PROJECT_ID o NEXT_PUBLIC_FIREBASE_API_KEY en .env.local (ver README).");
  process.exit(1);
}
const BASE = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;
const urlDe = (ruta) => `${BASE}/${ruta.split("/").map(encodeURIComponent).join("/")}`;

// Todos los documentos crudos del respaldo, de todos los archivos *.rest.json.
const documentos = [];
for (const archivo of readdirSync(carpeta).filter((f) => f.endsWith(".rest.json"))) {
  documentos.push(...JSON.parse(readFileSync(join(carpeta, archivo), "utf8")));
}
const rutaDe = (doc) => doc.name.slice(doc.name.indexOf("/documents/") + "/documents/".length);
const porRuta = new Map(documentos.map((d) => [rutaDe(d), d]));

// Un documento exacto, o los documentos directos de una colección (la ruta
// con una cantidad impar de partes es una colección).
const pedida = rutaArg.replace(/^\/+|\/+$/g, "");
const partes = pedida.split("/");
const esColeccion = partes.length % 2 === 1;
const hijosDirectos = (coleccion) => documentos.filter((d) => rutaDe(d).startsWith(coleccion + "/") && rutaDe(d).slice(coleccion.length + 1).split("/").length === 1);
let elegidos = esColeccion ? hijosDirectos(pedida) : documentos.filter((d) => rutaDe(d) === pedida);

if (!elegidos.length) {
  console.error(`En ${carpetaArg} no hay ningún documento para "${pedida}".`);
  console.error("Rutas disponibles (primeras 20):");
  documentos.slice(0, 20).forEach((d) => console.error("  " + rutaDe(d)));
  process.exit(1);
}

// Una escala va siempre con su convenio, y el convenio se escribe primero.
const esEscala = partes[0] === "convenios" && partes[2] === "escalas";
if (esEscala) {
  const convenio = porRuta.get(`${partes[0]}/${partes[1]}`);
  if (convenio && !elegidos.includes(convenio)) elegidos = [convenio, ...elegidos];
}
for (const d of elegidos) {
  if (!d.fields || typeof d.fields !== "object") {
    console.error(`El documento ${rutaDe(d)} del respaldo no tiene campos: no se restaura nada.`);
    process.exit(1);
  }
}

// Qué hay hoy en Firestore, para decir qué se crea, qué se reemplaza y qué sobra.
async function existeHoy(ruta) {
  const r = await fetch(urlDe(ruta), { signal: AbortSignal.timeout(20000) });
  if (r.status === 404) return false;
  if (!r.ok) throw new Error(`Firestore respondió ${r.status} al leer ${ruta}`);
  return true;
}
async function idsVivos(coleccion) {
  const ids = [];
  let token = null;
  do {
    const q = new URLSearchParams({ pageSize: "300" });
    q.append("mask.fieldPaths", "__name__");
    if (token) q.set("pageToken", token);
    const r = await fetch(`${urlDe(coleccion)}?${q}`, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`Firestore respondió ${r.status} al listar ${coleccion}`);
    const json = await r.json();
    for (const d of json.documents || []) ids.push(rutaDe(d));
    token = json.nextPageToken || null;
  } while (token);
  return ids;
}

console.log(`${aplicar ? "Se va a escribir" : "Ensayo: se escribiría"} desde ${carpetaArg}:`);
for (const d of elegidos) {
  const ruta = rutaDe(d);
  console.log(`  ${(await existeHoy(ruta)) ? "reemplaza" : "crea     "}  ${ruta}`);
}
let sobrantes = [];
if (esColeccion) {
  const enRespaldo = new Set(elegidos.map(rutaDe));
  sobrantes = (await idsVivos(pedida)).filter((r) => !enRespaldo.has(r));
  for (const r of sobrantes) console.log(`  ${borrarSobrantes ? "BORRA    " : "sobra    "}  ${r}${borrarSobrantes ? "" : " (existe hoy y no está en el respaldo; se deja como está)"}`);
  if (sobrantes.length && !borrarSobrantes) console.log("  Para borrar los que sobran, agregá --borrar-sobrantes.");
}
if (!aplicar) {
  console.log("\nNada se escribió. Para hacerlo de verdad, agregá --aplicar al final.");
  process.exit(0);
}

async function pedirContrasena(pregunta) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const escribir = rl._writeToOutput;
  // Mientras se tipea la contraseña no se muestra nada; el Enter sí.
  rl._writeToOutput = (s) => { if (s.includes("\n") || s.includes("\r")) escribir.call(rl, s); };
  process.stdout.write(pregunta);
  const r = await rl.question("");
  rl.close();
  return r;
}

const password = process.env.ADMIN_PASSWORD || (await pedirContrasena(`Contraseña de ${ADMIN} (no se muestra): `));
const login = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: ADMIN, password, returnSecureToken: true }),
});
if (!login.ok) {
  const e = await login.json().catch(() => ({}));
  console.error(`No se pudo iniciar sesión como ${ADMIN}: ${e?.error?.message || login.status}`);
  process.exit(1);
}
const { idToken } = await login.json();
const cabeceras = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };

let fallas = 0;
for (const doc of elegidos) {
  const ruta = rutaDe(doc);
  // PATCH sin updateMask reemplaza el documento entero (los campos que no
  // vienen se borran): queda exactamente como en el respaldo.
  const r = await fetch(urlDe(ruta), { method: "PATCH", headers: cabeceras, body: JSON.stringify({ fields: doc.fields }) });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    console.error(`  FALLÓ ${ruta}: ${e?.error?.message || r.status}`);
    fallas += 1;
    continue;
  }
  console.log(`  restaurado ${ruta}`);
}
if (borrarSobrantes) {
  for (const ruta of sobrantes) {
    const r = await fetch(urlDe(ruta), { method: "DELETE", headers: cabeceras });
    if (!r.ok) {
      console.error(`  NO SE PUDO BORRAR ${ruta}: ${r.status}`);
      fallas += 1;
      continue;
    }
    console.log(`  borrado ${ruta}`);
  }
}
console.log(`\n${elegidos.length - fallas} de ${elegidos.length} documento(s) restaurado(s)${borrarSobrantes ? `, ${sobrantes.length} sobrante(s) borrado(s)` : ""}. El sitio puede tardar hasta un minuto en reflejarlo.`);
process.exit(fallas ? 1 : 0);
