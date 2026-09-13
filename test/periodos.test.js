// test/periodos.test.js
// La regla de "qué tabla uso para este mes", que antes estaba escrita dos
// veces (pantalla del recibo para Ganancias, parametrosLaborales para las bases
// del art. 9) y ahora una sola.

import { describe, it, expect } from "vitest";
import { elegirPeriodo, nombreDePeriodo, esPeriodoValido } from "../lib/periodos.js";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";

describe("elegirPeriodo", () => {
  const cargados = ["2026-01", "2026-07", "2025-07"]; // desordenados a propósito

  it("si el período pedido está cargado, usa ése", () => {
    expect(elegirPeriodo(cargados, "2026-07")).toMatchObject({ periodo: "2026-07", exacto: true });
  });

  it("si no está, usa el más reciente anterior y lo marca como no exacto", () => {
    // Septiembre no está: corresponde julio (el último ANTES), no enero.
    expect(elegirPeriodo(cargados, "2026-09")).toMatchObject({ periodo: "2026-07", exacto: false });
    expect(elegirPeriodo(cargados, "2026-03")).toMatchObject({ periodo: "2026-01", exacto: false });
  });

  it("nunca elige uno posterior", () => {
    // Para liquidar marzo de 2025 no sirve la tabla de julio de 2025.
    expect(elegirPeriodo(cargados, "2025-03").periodo).toBeNull();
  });

  it("sin nada cargado, no hay período", () => {
    expect(elegirPeriodo([], "2026-07").periodo).toBeNull();
    expect(elegirPeriodo(undefined, "2026-07").periodo).toBeNull();
  });

  it("un pedido sin formato no elige nada", () => {
    expect(elegirPeriodo(cargados, "").periodo).toBeNull();
    expect(elegirPeriodo(cargados, "2026-7").periodo).toBeNull();
    expect(elegirPeriodo(cargados, undefined).periodo).toBeNull();
  });

  it("los ids mal escritos no se usan, pero se informan", () => {
    // "2026-8" ordena alfabéticamente DESPUÉS de "2026-12". Si se lo dejara
    // participar, elegiría mal en silencio. Se lo aparta y se lo devuelve.
    const r = elegirPeriodo(["2026-8", "2026-06", "cualquier-cosa"], "2026-09");
    expect(r.periodo).toBe("2026-06");
    expect(r.ignorados).toEqual(["2026-8", "cualquier-cosa"]);
  });

  it("los repetidos no molestan", () => {
    expect(elegirPeriodo(["2026-06", "2026-06"], "2026-06")).toMatchObject({ periodo: "2026-06", exacto: true });
  });
});

describe("esPeriodoValido", () => {
  it("acepta AAAA-MM y nada más", () => {
    expect(esPeriodoValido("2026-07")).toBe(true);
    expect(esPeriodoValido("2026-7")).toBe(false);
    expect(esPeriodoValido("07-2026")).toBe(false);
    expect(esPeriodoValido(null)).toBe(false);
  });
});

describe("nombreDePeriodo", () => {
  it("traduce al castellano", () => {
    expect(nombreDePeriodo("2026-07")).toBe("julio de 2026");
    expect(nombreDePeriodo("2025-12")).toBe("diciembre de 2025");
  });

  it("lo que no entiende lo devuelve como vino, sin inventar un mes", () => {
    expect(nombreDePeriodo("2026-13")).toBe("2026-13");
    expect(nombreDePeriodo("2026-7")).toBe("2026-7");
    expect(nombreDePeriodo(null)).toBe("otro período");
  });
});

describe("el motor recibe el período que se liquida", () => {
  const entradas = {
    categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5,
    horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false,
  };

  it("y lo expone en `metodo`, para que el recibo diga de qué mes es la cuenta", () => {
    const r = procesarRecibo(convenioComercio, escalasComercio["2026-07"], entradas, null, { periodo: "2026-07" });
    expect(r.metodo.periodo).toBe("2026-07");
  });

  it("si nadie se lo pasa, queda en null: no lo adivina", () => {
    const r = procesarRecibo(convenioComercio, escalasComercio["2026-07"], entradas);
    expect(r.metodo.periodo).toBeNull();
  });

  it("pasárselo no mueve un peso (canario)", () => {
    const sin = procesarRecibo(convenioComercio, escalasComercio["2026-07"], entradas);
    const con = procesarRecibo(convenioComercio, escalasComercio["2026-07"], entradas, null, { periodo: "2026-07" });
    expect(con.totales).toEqual(sin.totales);
    expect(Math.round(con.totales.neto * 100) / 100).toBe(1166249.7);
  });
});
