// test/invariantes.test.js
// Reglas que TODO convenio tiene que cumplir, corridas contra todos los
// fixtures capturados de producción. No comprueban un número en particular:
// comprueban que la calculadora no se rompa ni mienta.
//
// Es data-driven a propósito: cada vez que se capture un convenio nuevo con
// `node scripts/capturarFixtures.mjs <id>`, queda cubierto sin escribir tests.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import { valoresIniciales, selectsConDefaultInvalido } from "../lib/inputsIniciales.js";

const dirFixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const leer = (f) => JSON.parse(readFileSync(join(dirFixtures, f), "utf8"));

const convenios = readdirSync(dirFixtures)
  .filter((f) => f.endsWith(".convenio.json"))
  .map((f) => {
    const id = f.replace(".convenio.json", "");
    return { id, convenio: leer(f), escalas: leer(`${id}.escalas.json`) };
  });

it("hay fixtures capturados para probar", () => {
  expect(convenios.length).toBeGreaterThan(0);
});

describe.each(convenios)("$id", ({ convenio, escalas }) => {
  const periodos = Object.keys(escalas).sort();

  it("los ids de período tienen formato AAAA-MM", () => {
    // Si alguno fuera "2026-8", el orden alfabético lo pondría por encima de
    // "2026-12" y la calculadora elegiría el período equivocado por defecto.
    for (const p of periodos) expect(p).toMatch(/^\d{4}-\d{2}$/);
  });

  it("cada input de tipo select declara opciones", () => {
    const selects = (convenio.inputs_requeridos || []).filter((i) => i.tipo === "select");
    for (const s of selects) {
      expect(Array.isArray(s.opciones), `el select "${s.id}" no declara opciones`).toBe(true);
      expect(s.opciones.length, `el select "${s.id}" tiene la lista de opciones vacía`).toBeGreaterThan(0);
    }
  });

  it("el estado inicial de la pantalla siempre es elegible", () => {
    // Esto es lo que evita el error "La categoría y escala seleccionada no
    // existe" para quien entra y no toca el desplegable.
    const valores = valoresIniciales(convenio.inputs_requeridos);
    for (const input of (convenio.inputs_requeridos || []).filter((i) => i.tipo === "select")) {
      expect(input.opciones).toContain(valores[input.id]);
    }
  });

  it("toda combinación ofrecida en pantalla existe en todas las escalas", () => {
    const opcionesDe = (id) =>
      (convenio.inputs_requeridos || []).find((i) => i.id === id)?.opciones || [];
    const categorias = opcionesDe("categoria");
    const zonas = opcionesDe("zona");
    const faltantes = [];

    for (const periodo of periodos) {
      for (const categoria of categorias) {
        const claves = zonas.length ? zonas.map((z) => `${z}|${categoria}`) : [categoria];
        for (const clave of claves) {
          if (!escalas[periodo]?.categorias?.[clave]) faltantes.push(`${periodo} :: ${clave}`);
        }
      }
    }
    expect(faltantes, `combinaciones ofrecidas que no están cargadas:\n${faltantes.join("\n")}`).toEqual([]);
  });

  it("ninguna categoría usa el separador de clave en su nombre", () => {
    // El motor parte la clave por "|". Una categoría que lo contenga rompería
    // la búsqueda de la escala.
    for (const input of (convenio.inputs_requeridos || []).filter((i) => i.tipo === "select")) {
      for (const opcion of input.opciones || []) expect(String(opcion)).not.toContain("|");
    }
  });

  describe.each(periodos)("período %s", (periodo) => {
    const recibo = procesarRecibo(convenio, escalas[periodo], valoresIniciales(convenio.inputs_requeridos));

    it("liquida sin romperse y sin producir NaN", () => {
      const rotas = recibo.detalle.filter((l) => !Number.isFinite(l.monto));
      expect(rotas.map((l) => l.concepto)).toEqual([]);
      for (const total of Object.values(recibo.totales)) expect(Number.isFinite(total)).toBe(true);
    });

    it("el neto cierra: bruto + no remunerativo - retenciones", () => {
      const esperado = recibo.totales.bruto + recibo.totales.noRemunerativo - recibo.totales.retenciones;
      expect(recibo.totales.neto).toBeCloseTo(esperado, 6);
    });

    it("ningún concepto es negativo y el neto es positivo", () => {
      for (const l of recibo.detalle) expect(l.monto, `"${l.concepto}" es negativo`).toBeGreaterThanOrEqual(0);
      expect(recibo.totales.neto).toBeGreaterThan(0);
    });

    it("las retenciones no se comen el sueldo", () => {
      const total = recibo.totales.bruto + recibo.totales.noRemunerativo;
      expect(recibo.totales.retenciones).toBeLessThan(total * 0.5);
    });
  });
});

describe("calidad del dato cargado en Firestore", () => {
  // Estos NO son errores de código: son convenios que quedaron con datos
  // inconsistentes en la base. El código ya los tolera (ver lib/inputsIniciales.js),
  // pero conviene tenerlos a la vista para arreglarlos desde /admin.
  it("informa qué convenios tienen un default fuera de sus opciones", () => {
    const problemas = convenios.flatMap(({ id, convenio }) =>
      selectsConDefaultInvalido(convenio.inputs_requeridos).map((p) => ({ id, ...p }))
    );
    for (const p of problemas) {
      console.warn(
        `[dato a corregir en /admin] ${p.id}: el input "${p.id}" tiene default ${JSON.stringify(p.default)}, que no está entre sus opciones`
      );
    }
    // No falla: el código lo tolera. Sirve como recordatorio visible.
    expect(Array.isArray(problemas)).toBe(true);
  });
});
