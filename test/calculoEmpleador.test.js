// test/calculoEmpleador.test.js
// El panel del empleador produce números que la gente usa para decidir si
// contrata a alguien, y hasta hoy era el único módulo de cálculo del proyecto
// SIN UNA SOLA PRUEBA.
//
// La razón era mecánica: importa sus datos con el alias "@/data/...", vitest no
// leía jsconfig.json y cualquier test que lo importara fallaba. Se arregló con
// vitest.config.mjs.

import { describe, it, expect } from "vitest";
import { calcularCostoEmpleador, basesArt9, ultimoPeriodoConBases } from "../lib/calculoEmpleador.js";
import { aplicarTopeArt9 } from "../lib/parametrosLaborales.js";

const money = (n) => Math.round(n * 100) / 100;

const caso = (o = {}) =>
  calcularCostoEmpleador({
    regimenId: "resto_mipyme",
    bruto: 1000000,
    horasMensuales: 200,
    periodo: "2026-07",
    ...o,
  });

describe("contribuciones patronales", () => {
  it("suma las alícuotas del régimen elegido", () => {
    // resto_mipyme: SIPA 10,77 + PAMI 1,58 + asignaciones 4,7 + FNE 0,95 + OS 6 = 24%
    const r = caso();
    expect(money(r.totalContribuciones)).toBe(240000);
    expect(r.detalleContribuciones).toHaveLength(5);
  });

  it("el régimen de empresas grandes es más caro", () => {
    const grande = caso({ regimenId: "servicios_comercio_grande" });
    expect(money(grande.totalContribuciones)).toBe(264000); // 26,4%
    expect(grande.totalContribuciones).toBeGreaterThan(caso().totalContribuciones);
  });

  it("un régimen que no existe cae en resto_mipyme y lo dice", () => {
    const r = caso({ regimenId: "no-existe" });
    expect(r.regimenId).toBe("resto_mipyme");
    expect(r.regimenLabel).toBeTruthy();
  });

  it("la ART y los otros aportes se suman sobre el bruto", () => {
    const r = caso({ artPct: 3, otrosPct: 1 });
    expect(money(r.art.monto)).toBe(30000);
    expect(money(r.otros.monto)).toBe(10000);
    expect(money(r.totalContribuciones)).toBe(280000);
  });

  it("los conceptos no remunerativos suman al costo pero no pagan contribuciones", () => {
    const sinNr = caso();
    const conNr = caso({ noRem: 200000 });
    expect(money(conNr.totalContribuciones)).toBe(money(sinNr.totalContribuciones));
    expect(money(conNr.costoTotal)).toBe(money(sinNr.costoTotal) + 200000);
  });
});

describe("el porcentaje sobre el bruto se calcula una sola vez", () => {
  it("viene en el resultado, no en la pantalla", () => {
    // Antes estaba escrito DOS VECES dentro del JSX, con 1 y con 2 decimales,
    // así que la misma pantalla mostraba dos valores del mismo número.
    const r = caso({ artPct: 3 });
    expect(money(r.porcentajeSobreBruto)).toBe(27);
  });

  it("no explota si el bruto es cero", () => {
    expect(() => caso({ bruto: 0 })).toThrow();
  });
});

describe("topes del artículo 9 (Ley 24.241)", () => {
  it("un sueldo por debajo del mínimo usa el mínimo como base de aportes", () => {
    const r = caso({ bruto: 50000 });
    expect(r.baseAportesArt9).toBe(r.baseMinima);
    expect(r.baseAportesArt9).toBeGreaterThan(50000);
  });

  it("un sueldo por encima del máximo se topea", () => {
    const r = caso({ bruto: 9000000 });
    expect(r.baseAportesArt9).toBe(r.baseMaxima);
    expect(r.baseAportesArt9).toBeLessThan(9000000);
  });

  it("un sueldo en el medio queda igual", () => {
    const r = caso({ bruto: 1000000 });
    expect(r.baseAportesArt9).toBe(1000000);
  });

  it("las contribuciones NO se topean: van sobre el bruto completo", () => {
    const r = caso({ bruto: 9000000 });
    expect(r.baseContribuciones).toBe(9000000);
    expect(money(r.totalContribuciones)).toBe(money(9000000 * 0.24));
  });

  it("la función de tope es la misma que puede usar el recibo del empleado", () => {
    const bases = { minima: 100, maxima: 1000 };
    expect(aplicarTopeArt9(50, bases)).toBe(100);
    expect(aplicarTopeArt9(500, bases)).toBe(500);
    expect(aplicarTopeArt9(5000, bases)).toBe(1000);
  });
});

describe("cuando el período no está cargado", () => {
  it("lo avisa en vez de inventar un tope de $999.999.999", () => {
    // Antes caía al default {minima: 0, maxima: 999999999} y la pantalla lo
    // mostraba como si fuera un dato real.
    const r = caso({ periodo: "2026-09" });
    expect(r.basesVencidas).toBe(true);
    expect(r.baseMaxima).toBeLessThan(999999999);
    expect(r.textoExplicacion).toMatch(/ATENCIÓN/);
  });

  it("usa el último período disponible y dice cuál es", () => {
    const r = caso({ periodo: "2026-09" });
    expect(r.basesDelPeriodo).toBe(ultimoPeriodoConBases());
  });

  it("un período cargado no dispara el aviso", () => {
    const r = caso({ periodo: "2026-07" });
    expect(r.basesVencidas).toBe(false);
    expect(r.textoExplicacion).not.toMatch(/ATENCIÓN/);
  });

  it("basesArt9 marca vencido y devuelve el período que usó", () => {
    expect(basesArt9("2026-07")).toMatchObject({ vencido: false, periodoUsado: "2026-07" });
    expect(basesArt9("2030-01").vencido).toBe(true);
  });
});

describe("costos derivados", () => {
  it("el costo por hora sale de las horas informadas", () => {
    const r = caso({ horasMensuales: 200 });
    expect(money(r.costoHora)).toBe(money(r.costoTotal / 200));
  });

  it("el costo por día usa 30 días", () => {
    const r = caso();
    expect(money(r.costoDia)).toBe(money(r.costoTotal / 30));
  });
});

describe("datos que faltan", () => {
  it("sin bruto no calcula", () => {
    expect(() => calcularCostoEmpleador({ regimenId: "resto_mipyme", horasMensuales: 200 })).toThrow(/Faltan datos/);
  });

  it("sin horas mensuales tampoco", () => {
    expect(() => calcularCostoEmpleador({ regimenId: "resto_mipyme", bruto: 1000 })).toThrow(/Faltan datos/);
  });
});
