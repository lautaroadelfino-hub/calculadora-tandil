// test/numeros.test.js
// El lector de números es la pieza por la que pasa TODO dato que el dueño
// carga a mano. Los tres primeros casos son bugs reales que estaban en
// producción y que guardaban datos mal sin avisar.

import { describe, it, expect } from "vitest";
import { parsearNumero, aNumero, esNumeroValido, formatearNumero } from "../lib/numeros.js";

const valor = (x) => parsearNumero(x).valor;

describe("los bugs que estaban en producción", () => {
  it('"8,333%" con el signo de porcentaje se lee 8,333 (antes daba NaN y borraba la regla de presentismo)', () => {
    expect(valor("8,333%")).toBeCloseTo(8.333, 6);
    expect(valor("8,333 %")).toBeCloseTo(8.333, 6);
  });

  it('"1.500" es mil quinientos, no uno coma cinco (antes una retención de $1.500 se guardaba como $1,50)', () => {
    expect(valor("1.500")).toBe(1500);
  });

  it('"2.000.030" es el formato en que ARCA publica la escala (antes daba NaN y quedaba en 0)', () => {
    expect(valor("2.000.030")).toBe(2000030);
    expect(valor("2.000.030,50")).toBeCloseTo(2000030.5, 6);
  });
});

describe("formatos que la gente escribe de verdad", () => {
  it("pesos con símbolo y separadores", () => {
    expect(valor("$ 1.273.746,00")).toBe(1273746);
    expect(valor("$1.166.249,70")).toBeCloseTo(1166249.7, 6);
  });

  it("coma decimal", () => {
    expect(valor("1.234,56")).toBeCloseTo(1234.56, 6);
    expect(valor("0,35")).toBeCloseTo(0.35, 6);
    expect(valor("2,5")).toBeCloseTo(2.5, 6);
  });

  it("punto decimal cuando no parece de miles", () => {
    // Dos decimales no son un grupo de miles: "0.35" es treinta y cinco centésimos.
    expect(valor("0.35")).toBeCloseTo(0.35, 6);
    expect(valor("1.5")).toBeCloseTo(1.5, 6);
  });

  it("números sin adornos y negativos", () => {
    expect(valor("48")).toBe(48);
    expect(valor(48)).toBe(48);
    expect(valor("-2,5")).toBeCloseTo(-2.5, 6);
    expect(valor("-1.500")).toBe(-1500);
  });

  it("espacios, incluidos los invisibles que pega Excel", () => {
    expect(valor("  1.500  ")).toBe(1500);
    expect(valor("1 500,25")).toBeCloseTo(1500.25, 6);
  });
});

describe("distingue vacío de cero, y cero de ilegible", () => {
  it("vacío es 'sin cargar', no es cero", () => {
    for (const v of ["", "   ", null, undefined]) {
      const r = parsearNumero(v);
      expect(r.ok).toBe(true);
      expect(r.valor).toBeNull();
    }
  });

  it("cero es cero", () => {
    expect(parsearNumero("0")).toMatchObject({ ok: true, valor: 0 });
    expect(parsearNumero("0,00")).toMatchObject({ ok: true, valor: 0 });
  });

  it("lo ilegible se rechaza en vez de convertirse en cero", () => {
    for (const basura of ["abc", "1,234,56", "1..5", "12-34", "$", "%", "ocho"]) {
      const r = parsearNumero(basura);
      expect(r.ok, `"${basura}" debería rechazarse`).toBe(false);
      expect(r.valor).toBeNull();
      expect(r.motivo).toBeTruthy();
    }
  });

  it("da un motivo entendible para mostrarle al usuario", () => {
    expect(parsearNumero("ocho coma tres").motivo).toMatch(/no son números/);
    expect(parsearNumero("1,234,56").motivo).toMatch(/más de una coma/);
  });
});

describe("aNumero: la versión indulgente", () => {
  it("devuelve el valor por defecto cuando no hay nada legible", () => {
    expect(aNumero("abc")).toBe(0);
    expect(aNumero("")).toBe(0);
    expect(aNumero("abc", 48)).toBe(48);
    expect(aNumero("1.500", 48)).toBe(1500);
  });
});

describe("esNumeroValido y formatearNumero", () => {
  it("esNumeroValido acepta vacío y rechaza basura", () => {
    expect(esNumeroValido("")).toBe(true);
    expect(esNumeroValido("1.500")).toBe(true);
    expect(esNumeroValido("abc")).toBe(false);
  });

  it("formatea en es-AR", () => {
    expect(formatearNumero(1273746)).toBe("1.273.746,00");
    expect(formatearNumero(8.333, 3)).toBe("8,333");
    expect(formatearNumero("")).toBe("");
    expect(formatearNumero(null)).toBe("");
  });

  it("leer y formatear es reversible", () => {
    for (const texto of ["1.273.746,00", "1.234,56", "0,35"]) {
      expect(formatearNumero(valor(texto), texto.split(",")[1]?.length ?? 2)).toBe(texto);
    }
  });
});
