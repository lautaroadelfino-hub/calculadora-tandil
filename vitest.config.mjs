// vitest.config.mjs
// Resuelve el alias "@/..." igual que Next.js (ver jsconfig.json).
//
// POR QUÉ HIZO FALTA: lib/calculoEmpleador.js importa sus datos con
// `@/data/basesImponibles.json`. Vitest no lee jsconfig.json, así que cualquier
// test que importara ese módulo fallaba con "Cannot find package '@'". Esa es,
// muy probablemente, la razón por la que el panel del empleador -que produce
// números que la gente usa- era el único módulo de cálculo sin una sola prueba.

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(raiz, "."),
    },
  },
});
