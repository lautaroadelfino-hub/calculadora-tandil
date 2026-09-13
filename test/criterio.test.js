// test/criterio.test.js
// Las reglas de docs/criterio.md que se pueden hacer cumplir leyendo el código.
// La Regla 1 (lo que se guarda, se lee) ya la vigila test/vocabulario.test.js.
// Acá van la 3 (la calculadora no lee data/) y una parte de la 2 (ningún número
// suelto adentro del motor).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const fuente = (p) => readFileSync(join(raiz, p), "utf8");

// El motor y todo lo que el motor importa. Si se agrega un módulo de cálculo,
// va acá.
const MODULOS_DEL_MOTOR = [
  "lib/motorLiquidacion.js",
  "lib/calculoContribuciones.js",
  "lib/calculoGanancias.js",
  "lib/parametrosLaborales.js",
  "lib/vocabularioConvenios.js",
];

describe("Regla 3: la calculadora no lee archivos de data/", () => {
  it.each(MODULOS_DEL_MOTOR)("%s no importa de data/", (modulo) => {
    // Los datos que el dueño actualiza viven en Firestore y se cargan desde
    // /admin; los archivos de data/ son semilla del panel, no fuente del motor.
    // Hasta el 13/9/2026 calculoEmpleador.js y parametrosLaborales.js lo hacían.
    expect(fuente(modulo)).not.toMatch(/from\s+["'][^"']*\bdata\//);
  });

  it("y los módulos que importa el motor son exactamente los de la lista", () => {
    const imports = [...fuente("lib/motorLiquidacion.js").matchAll(/from\s+["']\.\/([^"']+)["']/g)].map((m) => `lib/${m[1]}`);
    for (const i of imports) expect(MODULOS_DEL_MOTOR, `${i} no está en la lista de este test`).toContain(i);
  });
});

describe("Regla 2: ningún número suelto adentro del motor", () => {
  // Sin comentarios: la historia de un número ("estuvo clavado en 48") puede
  // nombrarlo; el código, no.
  const motor = fuente("lib/motorLiquidacion.js")
    .replace(//*[sS]*?*//g, "")
    .replace(///.*$/gm, "");

  it.each([
    ["* 0.11", "la jubilación"],
    ["* 0.03", "PAMI y obra social"],
    ["* 1.5 ", "el recargo de la hora extra al 50%"],
    ["* 2.0 ", "el recargo de la hora extra al 100%"],
    ["* 0.5;", "el medio aguinaldo"],
    ["/ 150", "el plus vacacional"],
    ["/ 30", "el costo por día"],
  ])("no contiene '%s' (%s): está con nombre en parametrosLaborales.js", (literal) => {
    expect(motor).not.toContain(literal);
  });

  it("el 48 y el 200 de la jornada tampoco están en el motor: son del convenio", () => {
    expect(motor).not.toMatch(/[^0-9.]48[^0-9.]/);
    expect(motor).not.toMatch(/[^0-9.]200[^0-9.]/);
  });
});
