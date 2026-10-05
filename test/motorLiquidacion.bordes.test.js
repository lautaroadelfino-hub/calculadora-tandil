// test/motorLiquidacion.bordes.test.js
// Errores de carga que antes daban un recibo absurdo sin avisar (auditoría del
// 23/9/2026, A17 y A18): un básico con texto daba NaN, uno en cero daba neto
// negativo. Ahora el motor frena con un mensaje.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";
import semilla from "../data/contribuciones.seed.json";

const escala = escalasComercio["2026-07"];
const entradas = (o = {}) => ({
  categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5,
  horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false, ...o,
});
const conVendedorB = (cambios) => ({
  ...escala,
  categorias: { ...escala.categorias, "Vendedor B": { ...escala.categorias["Vendedor B"], ...cambios } },
});

describe("la escala mal cargada frena", () => {
  it("básico con texto", () => {
    expect(() => procesarRecibo(convenioComercio, conVendedorB({ basico: "un millón" }), entradas())).toThrow(/básico de "Vendedor B"/);
  });

  it("básico negativo", () => {
    expect(() => procesarRecibo(convenioComercio, conVendedorB({ basico: -5 }), entradas())).toThrow(/básico de "Vendedor B"/);
  });

  it("no remunerativo con texto", () => {
    expect(() => procesarRecibo(convenioComercio, conVendedorB({ no_remunerativo: "abc" }), entradas())).toThrow(/no remunerativ/);
  });

  it("básico en cero y sin no remunerativo", () => {
    expect(() => procesarRecibo(convenioComercio, conVendedorB({ basico: 0, no_remunerativo: 0 }), entradas())).toThrow(/no tiene cargado el básico/);
  });

  it("un número guardado como texto con punto sí se acepta", () => {
    const r = procesarRecibo(convenioComercio, conVendedorB({ basico: "1196632" }), entradas());
    expect(Number.isFinite(r.totales.neto)).toBe(true);
  });
});

describe("neto negativo", () => {
  it("frena en vez de dar un recibo con neto negativo", () => {
    // 2 horas con los topes del art. 9: los aportes van sobre la base mínima y la
    // obra social sobre la jornada completa, y se comen el sueldo.
    const opciones = { periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07" };
    expect(() => procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 2 }), null, opciones)).toThrow(/neto da negativo/);
  });
});

describe("detracción de la Ley 27.541 en el mes del SAC (decidido con el dueño el 5/10/2026)", () => {
  const opciones = { periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07" };
  const detraccion = (r) => r.costoEmpleador.detraccion;

  it("con SAC, la detracción sube un 50%", () => {
    const sin = procesarRecibo(convenioComercio, escala, entradas(), null, opciones);
    const con = procesarRecibo(convenioComercio, escala, entradas({ incluir_sac: true }), null, opciones);
    expect(detraccion(con).prorrateada).toBeCloseTo(detraccion(sin).prorrateada * 1.5, 6);
    expect(detraccion(con).conSac).toBe(true);
  });
});
