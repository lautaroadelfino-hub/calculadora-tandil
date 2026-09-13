// test/motorLiquidacion.gastronomicos.test.js
// Caracterización del convenio Gastronómicos (UTHGRA, CCT 389/04) con datos
// REALES de Firestore capturados el 2026-09-12.
//
// Hasta hoy el motor no tenía NINGUNA prueba de este convenio, que es el único
// que ejercita dos caminos del motor: los adicionales remunerativos dinámicos
// y las escalas con zona ("Escala A|Nivel 6 ...").
//
// OJO: estos números congelan lo que el motor produce HOY, incluidas dos
// regresiones conocidas que se corrigen más adelante (ver abajo). No son
// "el número correcto": son "el número actual", para que cualquier cambio
// futuro se vea y se decida a propósito.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenio from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalas from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const money = (n) => Math.round(n * 100) / 100;

function inputs(overrides = {}) {
  return {
    zona: "Escala A",
    categoria: "Nivel 6 (Mozo - Maître)",
    carga_horaria: 48,
    antiguedad_años: 0,
    horas_extras_50: 0,
    horas_extras_100: 0,
    afiliado_sindicato: false,
    ...overrides,
  };
}

const linea = (recibo, texto) => recibo.detalle.find((l) => l.concepto.includes(texto));

describe("Gastronómicos CCT 389/04 — caso patrón (regresión)", () => {
  // Mozo/Maître, Escala A, 5 años de antigüedad, jornada 48hs, no afiliado,
  // período junio 2026 (el último cargado para este convenio).
  const recibo = procesarRecibo(convenio, escalas["2026-06"], inputs({ antiguedad_años: 5 }));

  it("sueldo básico según la escala de junio 2026", () => {
    expect(money(linea(recibo, "Sueldo Básico").monto)).toBe(1376681);
  });

  it("antigüedad", () => {
    // REGRESIÓN CONOCIDA: el motor aplica 1% por año de forma lineal (5% a los
    // 5 años). El motor anterior de este convenio (lib/calculoFEHGRA.js, borrado
    // en b1f7b31) usaba tramos NO proporcionales: a los 5 años correspondía 4%
    // del básico, no 5%. Se corrige cuando el motor soporte antigüedad por
    // tramos; ahí este número pasa a 55067.24 y hay que actualizarlo a mano.
    expect(money(linea(recibo, "Antigüedad").monto)).toBe(68834.05);
  });

  it("adicionales remunerativos dinámicos: complemento de servicio 12%", () => {
    expect(money(linea(recibo, "Complemento de Servicio").monto)).toBe(165201.72);
  });

  it("adicionales remunerativos dinámicos: asistencia perfecta 10%", () => {
    // REGRESIÓN CONOCIDA: en el motor anterior este adicional era OPCIONAL
    // (`asistenciaPerfecta ? basico * 0.10 : 0`). Hoy se aplica siempre, así que
    // todo recibo de gastronómicos lo cobra aunque el empleado haya faltado.
    expect(money(linea(recibo, "Asistencia Perfecta").monto)).toBe(137668.1);
  });

  it("los adicionales también se calculan sobre el no remunerativo", () => {
    expect(money(linea(recibo, "Complemento de Servicio (12%) s/ No Remunerativo").monto)).toBe(6396);
    expect(money(linea(recibo, "Asistencia Perfecta (10%) s/ No Remunerativo").monto)).toBe(5330);
  });

  it("totales", () => {
    expect(money(recibo.totales.bruto)).toBe(1748384.87);
    expect(money(recibo.totales.noRemunerativo)).toBe(67691);
    expect(money(recibo.totales.retenciones)).toBe(317416.92);
  });

  it("NETO A COBRAR", () => {
    expect(money(recibo.totales.neto)).toBe(1498658.95);
  });
});

describe("Gastronómicos — retenciones sindicales por afiliación", () => {
  const base = inputs({ antiguedad_años: 5 });

  it("NO afiliado: paga sepelio, no paga cuota de afiliado", () => {
    const recibo = procesarRecibo(convenio, escalas["2026-06"], base);
    expect(linea(recibo, "Cuota Afiliado UTHGRA")).toBeUndefined();
    expect(money(linea(recibo, "Seguro de Vida y Sepelio").monto)).toBe(18160.76);
  });

  it("afiliado: suma la cuota del 2,5% sobre remunerativo + no remunerativo", () => {
    const recibo = procesarRecibo(convenio, escalas["2026-06"], { ...base, afiliado_sindicato: true });
    expect(money(linea(recibo, "Cuota Afiliado UTHGRA").monto)).toBe(45401.9);
    expect(money(recibo.totales.neto)).toBe(1453257.06);
  });
});

describe("Gastronómicos — escalas con zona", () => {
  it("resuelve la clave 'zona|categoria' y la Escala B da distinto que la A", () => {
    const a = procesarRecibo(convenio, escalas["2026-06"], inputs({ categoria: "Nivel 1 (Peón - Lavacopas)" }));
    const b = procesarRecibo(convenio, escalas["2026-06"], inputs({ zona: "Escala B", categoria: "Nivel 1 (Peón - Lavacopas)" }));
    expect(money(b.totales.neto)).toBe(1045145.21);
    expect(money(a.totales.neto)).not.toBe(money(b.totales.neto));
  });

  it("una combinación de zona y categoría que no existe falla con un error claro", () => {
    expect(() =>
      procesarRecibo(convenio, escalas["2026-06"], inputs({ zona: "Escala Z" }))
    ).toThrow(/no existe en los registros/);
  });
});
