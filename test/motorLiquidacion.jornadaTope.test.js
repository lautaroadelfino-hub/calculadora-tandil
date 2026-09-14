// test/motorLiquidacion.jornadaTope.test.js
// La jornada por encima de la completa ya no infla el básico. Hasta el
// 13/9/2026, 60 horas semanales en Comercio daban básico × 60/48: el
// prorrateo funcionaba para arriba, cuando por encima de la jornada completa
// lo que hay son horas extras. La auditoría en frío lo sacó a la luz.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalas from "./fixtures/comercio-cct-130-75.escalas.json";

const escala = escalas["2026-07"];
const entradas = (o = {}) => ({
  categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 0,
  horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false, ...o,
});
const basicoDe = (r) => r.detalle.find((l) => l.concepto === "Sueldo Básico").monto;

describe("horas por encima de la jornada completa", () => {
  it("60 hs dan el mismo básico que 48, y el recibo lo avisa", () => {
    const completa = procesarRecibo(convenio, escala, entradas());
    const demas = procesarRecibo(convenio, escala, entradas({ carga_horaria: 60 }));
    expect(basicoDe(demas)).toBe(basicoDe(completa));
    expect(demas.totales.neto).toBe(completa.totales.neto);
    expect(demas.metodo.jornadaDelPuesto).toBe(48);
    expect(demas.metodo.jornadaPedida).toBe(60);
    expect(demas.avisos.join(" ")).toMatch(/60 hs semanales, más que la jornada completa de 48/);
  });

  it("por debajo de la completa se sigue prorrateando, sin aviso", () => {
    const media = procesarRecibo(convenio, escala, entradas({ carga_horaria: 24 }));
    expect(basicoDe(media)).toBeCloseTo(basicoDe(procesarRecibo(convenio, escala, entradas())) / 2, 6);
    expect(media.avisos.some((a) => /jornada completa/.test(a))).toBe(false);
  });
});

describe("horas vacías o en cero", () => {
  it("vacías: calcula jornada completa y lo dice", () => {
    const r = procesarRecibo(convenio, escala, entradas({ carga_horaria: "" }));
    expect(r.metodo.jornadaDelPuesto).toBe(48);
    expect(r.avisos.join(" ")).toMatch(/No cargaste las horas semanales/);
  });

  it("en cero: lo mismo", () => {
    const r = procesarRecibo(convenio, escala, entradas({ carga_horaria: 0 }));
    expect(r.metodo.jornadaDelPuesto).toBe(48);
    expect(r.avisos.join(" ")).toMatch(/No cargaste las horas semanales/);
  });

  it("si quien llama no pasa el campo (uso por código), no hay aviso", () => {
    const sinCampo = entradas();
    delete sinCampo.carga_horaria;
    const r = procesarRecibo(convenio, escala, sinCampo);
    expect(r.metodo.jornadaDelPuesto).toBe(48);
    expect(r.avisos.some((a) => /horas semanales/.test(a))).toBe(false);
  });
});
