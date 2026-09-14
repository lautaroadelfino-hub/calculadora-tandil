// test/explicarLinea.test.js
import { describe, it, expect } from "vitest";
import { explicarLinea } from "../lib/explicarLinea.js";

describe("explicarLinea", () => {
  it("sin detalle no inventa nada", () => {
    expect(explicarLinea({ concepto: "X", monto: 1 })).toBeNull();
    expect(explicarLinea(null)).toBeNull();
    expect(explicarLinea({ detalle: { tipo: "algo_raro" } })).toBeNull();
  });

  it("escala completa y prorrateada", () => {
    expect(explicarLinea({ detalle: { tipo: "escala", base: 1000, factor: 1 } })).toBe("Escala del convenio: $1.000,00");
    expect(explicarLinea({ detalle: { tipo: "escala", base: 1000, factor: 0.5, horas: 24, horasCompletas: 48 } })).toBe("Escala del convenio: $1.000,00 × 24/48 hs");
  });

  it("porcentaje lineal, por tramos y simple", () => {
    expect(explicarLinea({ detalle: { tipo: "porcentaje", alicuota: 0.05, porAño: 0.01, años: 5, base: 200, baseLabel: "el básico" } })).toBe("1% × 5 años = 5% sobre $200,00 (el básico)");
    expect(explicarLinea({ detalle: { tipo: "porcentaje", alicuota: 0.04, tramo: { desde_años: 5, porcentaje: 0.04 }, años: 6, base: 200 } })).toBe("4% (tramo desde 5 años, 6 de antigüedad) sobre $200,00");
    expect(explicarLinea({ detalle: { tipo: "porcentaje", alicuota: 0.03, base: 1500.5, baseLabel: "remunerativo" } })).toBe("3% sobre $1.500,50 (remunerativo)");
  });

  it("por unidad, hora extra, proporción, vacaciones, suma fija, ganancias", () => {
    expect(explicarLinea({ detalle: { tipo: "por_unidad", cantidad: 22, unidad: "dia", valorUnitario: 16463.15 } })).toBe("22 días × $16.463,15");
    expect(explicarLinea({ detalle: { tipo: "por_unidad", cantidad: 1, unidad: "dia", valorUnitario: 10 } })).toBe("1 día × $10,00");
    expect(explicarLinea({ detalle: { tipo: "hora_extra", cantidad: 10, valorHora: 5403.88, recargo: 1.5, baseHora: 1037544.76, divisor: 192 } })).toBe("10 horas × $5.403,88 × 1,5 · valor hora: $1.037.544,76 / 192 hs");
    expect(explicarLinea({ detalle: { tipo: "proporcion", alicuota: 0.5, base: 100, baseLabel: "la remuneración habitual" } })).toBe("50% de $100,00 (la remuneración habitual)");
    expect(explicarLinea({ detalle: { tipo: "vacaciones", cantidad: 7, valorUnitario: 10, baseLabel: "remuneración habitual / 150" } })).toBe("7 días × $10,00 (remuneración habitual / 150)");
    expect(explicarLinea({ detalle: { tipo: "suma_fija", baseLabel: "sólo afiliados" } })).toBe("Suma fija (sólo afiliados)");
    expect(explicarLinea({ detalle: { tipo: "ganancias", alicuota: 0.27, base: 250000 } })).toBe("Escala del 27% sobre una base imponible de $250.000,00");
  });
});
