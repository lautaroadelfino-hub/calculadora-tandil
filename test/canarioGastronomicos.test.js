// test/canarioGastronomicos.test.js
// El canario de Gastronómicos con su configuración actual de producción:
// antigüedad por tramos, la asistencia perfecta como pregunta y la suma no
// remunerativa que no genera adicionales (cambios posteriores a la foto
// congelada de test/fixtures/patron, que todavía tiene la configuración vieja).
// Escala A, Nivel 1, 5 años, jornada 48, no afiliado, con asistencia perfecta,
// septiembre 2026 → neto $1.153.941,46. Sólo el lado del trabajador: sin la
// tabla de contribuciones del período, que acá no se carga.
//
// Corre sobre las capturas vivas de test/fixtures/ (las que refresca
// scripts/capturarFixtures.mjs). Si al recapturar este test falla, cambió la
// escala o las reglas de Gastronómicos en Firestore (o el motor): hay que mirar
// cuál y, si el nuevo número está bien, volver a verificarlo a mano antes de
// actualizarlo acá.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenio from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalas from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));

describe("canario de Gastronómicos: Escala A, Nivel 1, 5 años, septiembre 2026", () => {
  const recibo = procesarRecibo(convenio, escalas["2026-09"], {
    zona: "Escala A",
    categoria: "Nivel 1 (Peón - Lavacopas)",
    carga_horaria: 48,
    antiguedad_años: 5,
    horas_extras_50: 0,
    horas_extras_100: 0,
    afiliado_sindicato: false,
    asistencia_perfecta: true,
  });

  it("básico y antigüedad por tramos: con 5 años toca el tramo del 4%, sobre el básico", () => {
    expect(money(linea(recibo, "Sueldo Básico").monto)).toBe(1074307);
    expect(money(linea(recibo, "Antigüedad").monto)).toBe(42972.28);
    expect(linea(recibo, "Antigüedad").detalle.baseLabel).toBe("el básico");
  });

  it("complemento de servicio (12%) y asistencia perfecta (10%), los dos sobre el básico", () => {
    expect(money(linea(recibo, "Complemento de Servicio").monto)).toBe(128916.84);
    expect(money(linea(recibo, "Asistencia Perfecta").monto)).toBe(107430.7);
  });

  it("la suma no remunerativa va sola: no genera antigüedad ni adicionales", () => {
    expect(money(linea(recibo, "Asignación No Remunerativa Base").monto)).toBe(74000);
    expect(recibo.detalle.filter((l) => l.tipo === "no_remunerativo")).toHaveLength(1);
  });

  it("aportes, sepelio y solidaria, cada uno sobre su base", () => {
    expect(money(linea(recibo, "Jubilación").monto)).toBe(148898.95);
    expect(money(linea(recibo, "Ley 19.032 PAMI").monto)).toBe(40608.8);
    // La obra social y el sepelio llevan la suma no remunerativa.
    expect(money(linea(recibo, "Obra Social (3%)").monto)).toBe(42828.8);
    expect(money(linea(recibo, "Seguro de Vida y Sepelio").monto)).toBe(14276.27);
    // La solidaria va sobre la remuneración habitual (Decreto 612/2026).
    expect(money(linea(recibo, "Contribución Solidaria UTHGRA").monto)).toBe(27072.54);
  });

  it("bruto y neto", () => {
    expect(money(recibo.totales.bruto)).toBe(1353626.82);
    expect(money(recibo.totales.retenciones)).toBe(273685.36);
    expect(money(recibo.totales.neto)).toBe(1153941.46);
  });
});
