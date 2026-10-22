// scripts/vigia/entorno.mjs
// Qué necesita el vigía para correr y de dónde lo saca.
//
// En la máquina del dueño, las tres variables públicas de Firebase salen de
// .env.local (las mismas del sitio); las contraseñas y el token de Telegram se
// pasan sólo en la consola, para esa corrida, nunca en .env.local
// (docs/continuidad.md). En GitHub Actions todo llega por variables de entorno:
// lo público desde el workflow y lo secreto desde Settings → Secrets.
//
// Este módulo no valida nada ni corta el proceso al importarse: los tests lo
// importan, y quien decide qué es obligatorio es cada modo de scripts/vigia.mjs
// (ensayar no necesita Telegram; probar permisos no necesita nada más que la
// sesión). Y nunca imprime un valor: `enmascarar` tapa los secretos en los logs.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Las variables, con su nombre en el entorno y si hay que esconderlas. */
export const VARIABLES = {
  proyecto: { nombre: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", secreto: false },
  apiKey: { nombre: "NEXT_PUBLIC_FIREBASE_API_KEY", secreto: false },
  bucket: { nombre: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", secreto: false },
  vigiaEmail: { nombre: "VIGIA_EMAIL", secreto: false },
  vigiaPassword: { nombre: "VIGIA_PASSWORD", secreto: true },
  telegramToken: { nombre: "TELEGRAM_BOT_TOKEN", secreto: true },
  telegramChatId: { nombre: "TELEGRAM_CHAT_ID", secreto: false },
};

/**
 * Carga .env.local sin dependencias, como hacen respaldar.mjs y restaurar.mjs.
 * Lo que ya está en el entorno manda: una variable de Actions o de la consola
 * no se pisa con la del archivo. Devuelve si encontró el archivo.
 */
export function cargarEnvLocal(raiz = RAIZ, env = process.env) {
  const archivo = join(raiz, ".env.local");
  if (!existsSync(archivo)) return false;
  for (const linea of readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return true;
}

/** Lo que hay en el entorno, por clave, y la lista de nombres que faltan. */
export function leerEntorno(env = process.env) {
  const valores = {};
  const faltan = [];
  for (const [clave, { nombre }] of Object.entries(VARIABLES)) {
    const v = env[nombre];
    if (v === undefined || v === null || String(v).trim() === "") faltan.push(nombre);
    else valores[clave] = String(v).trim();
  }
  return { valores, faltan };
}

/** Frena, nombrando las variables que faltan (nunca sus valores), si no están todas las pedidas. */
export function exigir(entorno, claves) {
  const faltan = claves.filter((c) => !entorno.valores[c]).map((c) => VARIABLES[c].nombre);
  if (faltan.length) {
    throw new Error(
      `Faltan ${faltan.join(", ")}. Las públicas van en .env.local (o en el workflow); ` +
        "las secretas se pasan sólo para esta corrida (o en Secrets de GitHub Actions)."
    );
  }
}

/** Tapa en un texto todo valor secreto del entorno (y el token de sesión, si se pasa). */
export function enmascarar(texto, entorno, extras = []) {
  let salida = String(texto);
  const secretos = Object.entries(VARIABLES)
    .filter(([, v]) => v.secreto)
    .map(([clave]) => entorno.valores[clave])
    .concat(extras)
    .filter((s) => typeof s === "string" && s.length >= 6);
  for (const s of secretos) salida = salida.split(s).join("***");
  return salida;
}
