// test/porcentajesDeRegla.test.js
// Un porcentaje del convenio que falta, que viene con coma o que no es un
// número antes anulaba el concepto sin avisar (auditoría del 23/9/2026, A22).
// Ahora hay un solo lector: acepta coma, y lo que no entiende frena.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import { fraccionDeRegla } from "../lib/numeros.js";
import semilla from "../data/contribuciones.seed.json";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalas from "./fixtures/comercio-cct-130-75.escalas.json";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalasCamioneros from "./fixtures/camioneros-cct-40-89.escalas.json";

const entradas = { categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5, horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false };
const conRetencion = (cambio) => ({
  ...comercio,
  reglas_calculo: {
    ...comercio.reglas_calculo,
    retenciones_sindicales: { ...comercio.reglas_calculo.retenciones_sindicales, faecys: { ...comercio.reglas_calculo.retenciones_sindicales.faecys, ...cambio } },
  },
});
const faecys = (r) => r.detalle.find((l) => l.concepto.startsWith("Aporte FAECyS")).monto;

describe("fraccionDeRegla", () => {
  it("acepta número, texto con punto y texto con coma", () => {
    expect(fraccionDeRegla(0.02, "X")).toBe(0.02);
    expect(fraccionDeRegla("0.02", "X")).toBe(0.02);
    expect(fraccionDeRegla("0,02", "X")).toBe(0.02);
    expect(fraccionDeRegla(0, "X")).toBe(0);
  });

  it("frena si falta, si no es un número o si pasa de 1", () => {
    for (const v of [undefined, null, "", "abc", "2%", -0.01, 2]) {
      expect(() => fraccionDeRegla(v, 'La retención "X"')).toThrow(/La retención "X" tiene el porcentaje/);
    }
  });
});

describe("el motor usa ese lector", () => {
  const base = procesarRecibo(comercio, escalas["2026-07"], entradas);

  it("una retención con coma calcula igual que con punto", () => {
    expect(faecys(procesarRecibo(conRetencion({ porcentaje: "0,005" }), escalas["2026-07"], entradas))).toBe(faecys(base));
  });

  it("una retención con un porcentaje ilegible frena", () => {
    expect(() => procesarRecibo(conRetencion({ porcentaje: "medio" }), escalas["2026-07"], entradas)).toThrow(/FAECyS.*porcentaje/);
  });

  it("un adicional sin porcentaje frena", () => {
    const ad = camioneros.reglas_calculo.adicionales_remunerativos;
    const [id] = Object.keys(ad);
    const roto = { ...camioneros, reglas_calculo: { ...camioneros.reglas_calculo, adicionales_remunerativos: { ...ad, [id]: { ...ad[id], porcentaje: undefined, cuando: undefined, depende_de: undefined } } } };
    const cat = Object.keys(escalasCamioneros["2026-08"].categorias)[0];
    expect(() => procesarRecibo(roto, escalasCamioneros["2026-08"], { categoria: cat, carga_horaria: 44, antiguedad_años: 0 })).toThrow(/porcentaje/);
  });

  it("una contribución de la tabla con alícuota ilegible frena", () => {
    const tabla = { ...semilla, universales: semilla.universales };
    const regimenes = Object.fromEntries(Object.entries(semilla.regimenes).map(([k, r]) => [k, { ...r, conceptos: r.conceptos.map((c) => (c.id === "sipa" ? { ...c, alicuota: "diez" } : c)) }]));
    expect(() => procesarRecibo(comercio, escalas["2026-07"], entradas, null, { periodo: "2026-07", tablaContribuciones: { ...tabla, regimenes } })).toThrow(/SIPA.*porcentaje/);
  });
});
