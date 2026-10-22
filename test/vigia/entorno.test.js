// test/vigia/entorno.test.js
// El vigía nombra lo que le falta, nunca imprime un secreto, y .env.local no
// pisa lo que ya está en el entorno.
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VARIABLES, cargarEnvLocal, leerEntorno, exigir, enmascarar } from "../../scripts/vigia/entorno.mjs";

const completo = {
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "liquidar-f01ab",
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIza-clave-publica",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "liquidar-f01ab.firebasestorage.app",
  VIGIA_EMAIL: "vigia@liquidar.ar",
  VIGIA_PASSWORD: "contraseña-larga-y-secreta",
  TELEGRAM_BOT_TOKEN: "123456:ABC-token-secreto",
  TELEGRAM_CHAT_ID: "987654321",
};

describe("leer el entorno", () => {
  it("lista lo que falta por su nombre y no exige nada por sí solo", () => {
    const { valores, faltan } = leerEntorno({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: "p", VIGIA_PASSWORD: "  " });
    expect(valores).toEqual({ proyecto: "p" });
    expect(faltan).toEqual(Object.values(VARIABLES).map((v) => v.nombre).filter((n) => n !== "NEXT_PUBLIC_FIREBASE_PROJECT_ID"));
  });

  it("exigir frena nombrando las variables, nunca los valores", () => {
    const entorno = leerEntorno({ ...completo, VIGIA_PASSWORD: "" });
    expect(() => exigir(entorno, ["proyecto", "vigiaEmail"])).not.toThrow();
    expect(() => exigir(entorno, ["proyecto", "vigiaPassword", "telegramToken"])).toThrow(/Faltan VIGIA_PASSWORD\./);
    try { exigir(entorno, ["vigiaPassword"]); } catch (e) { expect(e.message).not.toContain("token-secreto"); }
  });

  it("enmascara los secretos y el token de sesión en cualquier texto", () => {
    const entorno = leerEntorno(completo);
    const texto = `login ok contraseña-larga-y-secreta token 123456:ABC-token-secreto sesion eyJhbGciOi.xxx clave AIza-clave-publica`;
    const tapado = enmascarar(texto, entorno, ["eyJhbGciOi.xxx"]);
    expect(tapado).toBe("login ok *** token *** sesion *** clave AIza-clave-publica");
  });
});

describe("cargar .env.local", () => {
  it("lee el archivo, respeta lo que ya estaba y devuelve si lo encontró", () => {
    const dir = mkdtempSync(join(tmpdir(), "vigia-env-"));
    writeFileSync(join(dir, ".env.local"), 'NEXT_PUBLIC_FIREBASE_PROJECT_ID="del-archivo"\nVIGIA_EMAIL=vigia@liquidar.ar\n# comentario\nRARO = con espacios  \n');
    const env = { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "del-entorno" };
    expect(cargarEnvLocal(dir, env)).toBe(true);
    expect(env).toEqual({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: "del-entorno", VIGIA_EMAIL: "vigia@liquidar.ar", RARO: "con espacios" });
    expect(cargarEnvLocal(join(dir, "no-existe"), env)).toBe(false);
  });
});
