// test/canarioProduccion.test.js
// El canario de producción del README: Comercio, Vendedor B, 5 años, jornada
// 48, no afiliado, septiembre 2026 → neto $1.251.841,10, verificado a mano en
// la app. Corre sobre las capturas vivas de test/fixtures/ (las que refresca
// scripts/capturarFixtures.mjs), no sobre la foto congelada de patron/.
//
// Si al recapturar los fixtures este test falla, cambió la escala o las reglas
// de Comercio en Firestore (o el motor): hay que mirar cuál y, si el nuevo
// número está bien, volver a verificarlo a mano antes de actualizarlo acá y en
// el README.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalas from "./fixtures/comercio-cct-130-75.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));

describe("canario de producción: Comercio, Vendedor B, 5 años, septiembre 2026", () => {
  const recibo = procesarRecibo(convenio, escalas["2026-09"], {
    categoria: "Vendedor B",
    carga_horaria: 48,
    antiguedad_años: 5,
    horas_extras_50: 0,
    horas_extras_100: 0,
    afiliado_sindicato: false,
  });

  it("básico, antigüedad (1 % por año) y presentismo (8,33 % sobre básico más antigüedad)", () => {
    expect(money(linea(recibo, "Sueldo Básico").monto)).toBe(1226349);
    expect(money(linea(recibo, "Antigüedad").monto)).toBe(61317.45);
    expect(money(linea(recibo, "Presentismo").monto)).toBe(107301.25);
  });

  it("la suma no remunerativa del acuerdo, con su antigüedad y su presentismo", () => {
    expect(money(linea(recibo, "Asignación No Remunerativa Base").monto)).toBe(120000);
    expect(money(linea(recibo, "Antigüedad No Remunerativa").monto)).toBe(6000);
    expect(money(linea(recibo, "Presentismo No Remunerativo").monto)).toBe(10499.58);
  });

  it("totales", () => {
    expect(money(recibo.totales.bruto)).toBe(1394967.7);
    expect(money(recibo.totales.noRemunerativo)).toBe(136499.58);
    expect(money(recibo.totales.retenciones)).toBe(279626.18);
  });

  it("NETO A COBRAR: $1.251.841,10", () => {
    expect(money(recibo.totales.neto)).toBe(1251841.1);
  });
});
