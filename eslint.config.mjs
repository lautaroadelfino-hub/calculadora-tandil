import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // Dos reglas que asumen el compilador de React, que este proyecto no usa.
    // set-state-in-effect: los efectos que setean estado al montar son a
    // propósito (el HTML del servidor no sabe el ancho de la pantalla ni los
    // parámetros de la URL). immutability: en el panel las funciones se
    // declaran después del efecto que las usa, lo cual es válido porque el
    // efecto corre después del render.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Lo que no es el sitio: el paquete de diseño (Claude Design) con su
    // bundle y las herramientas de sincronización. El sitio no los importa.
    "design/**",
    "ds-bundle/**",
    ".ds-sync/**",
    ".design-sync/**",
  ]),
]);

export default eslintConfig;
