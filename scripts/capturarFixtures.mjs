// scripts/capturarFixtures.mjs
// Uso interno (dev): baja de Firestore un convenio (por omisión Comercio) y
// todas sus escalas, y los guarda como fixtures JSON para los tests. No es un
// respaldo: para eso está scripts/respaldar.mjs.
// Ejecutar: node scripts/capturarFixtures.mjs <id-del-convenio>
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Las claves salen de .env.local, como en respaldar.mjs.
const raizDelRepo = join(dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = join(raizDelRepo, ".env.local");
if (existsSync(envLocal)) {
  if (typeof process.loadEnvFile === "function") process.loadEnvFile(envLocal);
  else for (const linea of readFileSync(envLocal, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const CONVENIO_ID = process.argv[2] || "comercio-cct-130-75";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const convSnap = await getDoc(doc(db, "convenios", CONVENIO_ID));
if (!convSnap.exists()) {
  console.error("No existe el convenio", CONVENIO_ID);
  process.exit(1);
}
const convenio = convSnap.data();

const escalasSnap = await getDocs(collection(db, "convenios", CONVENIO_ID, "escalas"));
const escalas = {};
escalasSnap.forEach((e) => { escalas[e.id] = e.data(); });

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "test", "fixtures");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${CONVENIO_ID}.convenio.json`), JSON.stringify(convenio, null, 2));
writeFileSync(join(outDir, `${CONVENIO_ID}.escalas.json`), JSON.stringify(escalas, null, 2));

console.log("Convenio:", CONVENIO_ID);
console.log("Períodos de escala capturados:", Object.keys(escalas).sort().join(", "));
console.log("OK -> test/fixtures/");
process.exit(0);
