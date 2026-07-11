// test/calculoGanancias.test.js
// Pruebas de la estimación mensual de Ganancias, usando la plantilla de
// referencia (data/ganancias.seed.json). Verifican la mecánica del cálculo;
// los valores fiscales reales los administra el usuario desde /admin.

import { describe, it, expect } from "vitest";
import { calcularGananciasMensual, aplicarEscala } from "../lib/calculoGanancias.js";
import params from "../data/ganancias.seed.json";

const money = (n) => Math.round(n * 100) / 100;

describe("aplicarEscala — mecánica de tramos progresivos", () => {
  const tramos = [
    { desde: 0, hasta: 100, fijo: 0, alicuota: 0.1 },
    { desde: 100, hasta: 200, fijo: 10, alicuota: 0.2 },
    { desde: 200, hasta: null, fijo: 30, alicuota: 0.3 },
  ];

  it("base 0 o negativa no paga impuesto", () => {
    expect(aplicarEscala(0, tramos).impuesto).toBe(0);
    expect(aplicarEscala(-50, tramos).impuesto).toBe(0);
  });

  it("aplica el tramo correcto y suma fijo + excedente", () => {
    // base 150 -> tramo 2: fijo 10 + 20% de (150-100) = 10 + 10 = 20
    expect(aplicarEscala(150, tramos).impuesto).toBe(20);
    // base 250 -> tramo 3: fijo 30 + 30% de (250-200) = 30 + 15 = 45
    expect(aplicarEscala(250, tramos).impuesto).toBe(45);
  });

  it("el último tramo (hasta null) no tiene tope superior", () => {
    expect(aplicarEscala(1000, tramos).impuesto).toBe(30 + 0.3 * 800);
  });
});

describe("Ganancias — sueldo por debajo del mínimo no imponible", () => {
  it("un sueldo bajo NO paga Ganancias (base imponible 0)", () => {
    const r = calcularGananciasMensual({
      gananciaBrutaMensual: 1500000,
      aportesDeduciblesMensual: 250000,
      params,
      cargas: {},
    });
    expect(r.impuesto).toBe(0);
    expect(r.aplica).toBe(false);
  });
});

describe("Ganancias — deducciones personales mensuales", () => {
  it("soltero sin hijos: deducción ≈ (MNI + especial) / 12", () => {
    const r = calcularGananciasMensual({
      gananciaBrutaMensual: 3000000,
      aportesDeduciblesMensual: 0,
      params,
      cargas: {},
    });
    const esperado =
      (params.deducciones_anuales.ganancia_no_imponible +
        params.deducciones_anuales.deduccion_especial_rel_dependencia) /
      12;
    expect(money(r.deduccionesPersonales)).toBe(money(esperado));
  });

  it("con cónyuge y 2 hijos deduce más que soltero, por lo tanto paga menos o igual", () => {
    const base = { gananciaBrutaMensual: 5000000, aportesDeduciblesMensual: 400000, params };
    const soltero = calcularGananciasMensual({ ...base, cargas: {} });
    const familia = calcularGananciasMensual({
      ...base,
      cargas: { conyuge: true, hijos: 2 },
    });
    expect(familia.deduccionesPersonales).toBeGreaterThan(soltero.deduccionesPersonales);
    expect(familia.impuesto).toBeLessThanOrEqual(soltero.impuesto);
  });
});

describe("Ganancias — caso con impuesto (verificación manual)", () => {
  // Bruto 3.000.000, sin aportes deducibles, soltero.
  // Deducción mensual = (5.151.802,50 + 24.728.652,02)/12 = 2.490.037,88
  // Base = 3.000.000 - 2.490.037,88 = 509.962,12
  // Escala mensual tramo 4 (500.008 a 750.011): fijo 520.008/12=43.334 + 15% del excedente
  // Impuesto = 43.334 + 0,15*(509.962,12 - 500.008) = 43.334 + 1.493,12 = 44.827,12
  const r = calcularGananciasMensual({
    gananciaBrutaMensual: 3000000,
    aportesDeduciblesMensual: 0,
    params,
    cargas: {},
  });

  it("base imponible mensual esperada", () => {
    expect(money(r.baseImponible)).toBe(509962.12);
  });

  it("impuesto mensual estimado esperado", () => {
    expect(money(r.impuesto)).toBe(44827.12);
  });
});

describe("Ganancias — sin parámetros cargados", () => {
  it("si no hay params, no rompe y devuelve impuesto 0", () => {
    const r = calcularGananciasMensual({
      gananciaBrutaMensual: 3000000,
      aportesDeduciblesMensual: 0,
      params: null,
    });
    expect(r.impuesto).toBe(0);
    expect(r.aplica).toBe(false);
  });
});
