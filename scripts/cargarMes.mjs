// scripts/cargarMes.mjs
// Publica en Firestore las escalas de uno o varios meses (y, si se pide, la
// tabla de contribuciones) desde una carpeta con los CSV y un carga.json que
// dice qué va a dónde (el formato está en lib/cargaDeMes.js). Escribe lo
// mismo que el panel (/admin → Escalas paritarias → Guardar y publicar) con
// las mismas revisiones, pero sin tipear nada: el nombre del período, el de
// la suma sin incidencia y los importes salen de los archivos.
//
//   node scripts/cargarMes.mjs <carpeta> [--aplicar]
//
//   <carpeta>   docs/acuerdos/comercio-2026-10-27 (tiene que tener carga.json)
//
// Sin --aplicar sólo muestra qué haría: qué documentos crea, cuáles reemplaza
// y los avisos de la revisión (cuánto sube cada categoría, qué se borra). Con
// --aplicar pide la contraseña de la cuenta de administrador (la de /admin),
// sin mostrarla, y escribe todo en UNA sola operación: entra todo o no entra
// nada. La contraseña también se puede pasar en la variable de entorno
// ADMIN_PASSWORD, sólo para esa corrida. Las claves de Firebase salen de
// .env.local, como en restaurar.mjs.
//
// Hacé un respaldo antes (respaldar.bat). Para volver atrás está restaurar.mjs.

import { readFileSync, existsSync } from "node:fs";
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
const aplicar = argumentos.includes("--aplicar");
const carpetaArg = argumentos.find((a) => !a.startsWith("--"));
if (!carpetaArg) {
  console.error("Uso: node scripts/cargarMes.mjs <carpeta-con-carga.json> [--aplicar]");
  process.exit(1);
}
const carpeta = resolve(raiz, carpetaArg);
const rutaManifiesto = join(carpeta, "carga.json");
if (!existsSync(rutaManifiesto)) {
  console.error(`No existe ${rutaManifiesto}. La carpeta tiene que tener un carga.json (ver lib/cargaDeMes.js).`);
  process.exit(1);
}

const PROYECTO = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ADMIN = process.env.ADMIN_EMAIL || "admin@liquidar.ar";
if (!PROYECTO) {
  console.error("Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID en .env.local (ver README).");
  process.exit(1);
}
if (aplicar && !API_KEY) {
  console.error("Falta NEXT_PUBLIC_FIREBASE_API_KEY en .env.local: sin ella no se puede iniciar sesión para escribir (ver README).");
  process.exit(1);
}

// Se importa después de cargar .env.local porque firestoreRest.js lee el
// proyecto al cargarse.
const { leerDocumento, listarColeccion, camposARest, nombreDeDocumento, URL_COMMIT } = await import("../lib/firestoreRest.js");
const { planDeCarga } = await import("../lib/cargaDeMes.js");

const manifiesto = JSON.parse(readFileSync(rutaManifiesto, "utf8"));
const csv = {};
for (const [, entrada] of Object.entries(manifiesto.escalas || {}).filter(([k]) => !k.startsWith("_"))) {
  const nombre = entrada && entrada.csv;
  if (!nombre) continue;
  const ruta = join(carpeta, nombre);
  if (!existsSync(ruta)) {
    console.error(`No existe ${ruta}, que pide el carga.json.`);
    process.exit(1);
  }
  csv[nombre] = readFileSync(ruta, "utf8");
}

const porPeriodo = (docs) => Object.fromEntries(docs.map((d) => [d.id, d]));
const convenio = manifiesto.convenio ? await leerDocumento(`convenios/${manifiesto.convenio}`) : null;
const escalasVivas = manifiesto.convenio ? porPeriodo(await listarColeccion(`convenios/${manifiesto.convenio}/escalas`)) : {};
const contribucionesVivas = porPeriodo(await listarColeccion("parametros_contribuciones"));

const plan = planDeCarga({ manifiesto, csv, convenio, escalasVivas, contribucionesVivas });

console.log(`${aplicar ? "Se va a escribir" : "Ensayo: se escribiría"} desde ${carpetaArg} en el proyecto ${PROYECTO}:`);
for (const e of plan.escritos) console.log(`  ${e.reemplaza ? "reemplaza" : "crea     "}  ${e.ruta}  —  ${e.titulo}`);
if (plan.avisos.length) {
  console.log("\nAvisos (lo mismo que mostraría el panel antes de publicar):");
  for (const a of plan.avisos) console.log(`  • ${a}`);
}
if (plan.errores.length) {
  console.error("\nNo se puede publicar:");
  for (const e of plan.errores) console.error(`  • ${e}`);
  process.exit(1);
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

// Una sola escritura con todos los documentos, como el lote del panel: si
// Firestore rechaza uno, no entra ninguno. Sin updateMask el documento se
// reemplaza entero; con ella sólo cambian esos campos (el convenio).
const writes = plan.escritos.map((e) => ({
  update: { name: nombreDeDocumento(e.ruta), fields: camposARest(e.campos) },
  ...(e.mascara ? { updateMask: { fieldPaths: e.mascara } } : {}),
}));
const r = await fetch(URL_COMMIT, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ writes }),
});
if (!r.ok) {
  const e = await r.json().catch(() => ({}));
  console.error(`\nFirestore no aceptó la escritura (${r.status}): ${e?.error?.message || "sin detalle"}. No se escribió nada.`);
  process.exit(1);
}
console.log(`\nListo: ${writes.length} documento(s) escritos. El sitio puede tardar hasta un minuto en reflejarlo.`);
console.log("Después: node scripts/capturarFixtures.mjs " + (manifiesto.convenio || "<convenio>") + " para que los tests vean los meses nuevos.");
