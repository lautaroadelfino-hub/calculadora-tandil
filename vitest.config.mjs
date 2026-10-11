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

// Los tests de interfaz (test/ui/*.test.jsx) corren en jsdom y declaran el
// entorno con un comentario `// @vitest-environment jsdom` al principio del
// archivo: el resto de la suite sigue en Node, que es más rápido. El JSX lo
// compila oxc con el runtime automático de React, igual que en Next.
//
// NODE_ENV se fuerza a "test": Cloudflare Pages corre `npm run build` con
// NODE_ENV=production, y con eso React carga su build de producción, que no
// tiene `React.act`, y Testing Library se cae ("React.act is not a function").
// Tres builds del 11/10/2026 no salieron a producción por esto, mientras que
// en GitHub Actions y en la máquina local pasaban.
export default defineConfig({
  test: {
    env: { NODE_ENV: "test" },
  },
  resolve: {
    alias: {
      "@": resolve(raiz, "."),
    },
  },
});
