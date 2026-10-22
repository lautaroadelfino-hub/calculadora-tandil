// test/vigia/cli.test.js
// El script entero arranca (importa sus piezas, lee el entorno) y, si le
// falta la sesión, frena con un mensaje que nombra las variables y sin tocar
// la red. Es la prueba de humo del orquestador: lo que los tests por módulo
// no ven.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(raiz, "scripts", "vigia.mjs");

const correr = (args, env = {}) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: raiz,
    encoding: "utf8",
    // Sin las variables del vigía: ni .env.local (que puede tener las públicas)
    // ni el entorno de quien corre los tests le alcanzan para abrir sesión.
    env: { PATH: process.env.PATH, VIGIA_EMAIL: "", VIGIA_PASSWORD: "", TELEGRAM_BOT_TOKEN: "x", TELEGRAM_CHAT_ID: "1", ...env },
    timeout: 60000,
  });

describe("scripts/vigia.mjs", () => {
  it("sin sesión frena con código 1 y nombra lo que falta, sin valores", () => {
    const r = correr(["--ensayo"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/FALLÓ: Faltan .*VIGIA_EMAIL, VIGIA_PASSWORD/);
    expect(r.stdout).not.toContain("secreto");
  });

  it("la corrida normal exige también Telegram antes de intentar nada", () => {
    const r = correr([], { TELEGRAM_BOT_TOKEN: "", TELEGRAM_CHAT_ID: "" });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/Faltan TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID/);
  });
});
