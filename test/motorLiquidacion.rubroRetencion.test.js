// test/motorLiquidacion.rubroRetencion.test.js
// Una retención sindical puede decir en qué rubro del costo laboral cae. El
// aporte fijo a OSECAC (Comercio) es obra social, no sindical: la auditoría
// del 13/9/2026 lo vio sumado en el rubro equivocado.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import { convenioToForm, formToConvenio } from "../lib/convenioForm.js";
import semilla from "../data/contribuciones.seed.json";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalas from "./fixtures/comercio-cct-130-75.escalas.json";

const entradas = { categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 0, horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false };
const opciones = { periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07" };
const conRubro = (rubro) => ({
  ...comercio,
  reglas_calculo: {
    ...comercio.reglas_calculo,
    retenciones_sindicales: { ...comercio.reglas_calculo.retenciones_sindicales, osecac_fijo: { label: "Aporte Fijo OSECAC", valor_fijo: 100, ...(rubro ? { rubro } : {}) } },
  },
});

describe("el rubro de una retención", () => {
  it("sin rubro es sindical, como siempre", () => {
    const r = procesarRecibo(conRubro(null), escalas["2026-07"], entradas, null, opciones);
    expect(r.detalle.find((l) => l.concepto === "Aporte Fijo OSECAC").rubro).toBe("sindical");
  });

  it("con rubro obra_social, el aporte fijo suma en obra social y no en sindical", () => {
    const sin = procesarRecibo(conRubro(null), escalas["2026-07"], entradas, null, opciones);
    const con = procesarRecibo(conRubro("obra_social"), escalas["2026-07"], entradas, null, opciones);
    expect(con.detalle.find((l) => l.concepto === "Aporte Fijo OSECAC").rubro).toBe("obra_social");
    expect(con.costoEmpleador.rubros.obra_social.trabajador).toBeCloseTo(sin.costoEmpleador.rubros.obra_social.trabajador + 100, 6);
    expect(con.costoEmpleador.rubros.sindical.trabajador).toBeCloseTo(sin.costoEmpleador.rubros.sindical.trabajador - 100, 6);
    expect(con.totales.neto).toBe(sin.totales.neto);
  });

  it("un rubro que el motor no conoce frena", () => {
    expect(() => procesarRecibo(conRubro("marciano"), escalas["2026-07"], entradas, null, opciones)).toThrow(/"marciano", que el motor no conoce/);
  });

  it("el formulario lo lee y lo escribe (sólo cuando no es sindical)", () => {
    const doc = conRubro("obra_social");
    const form = convenioToForm(doc);
    const fila = form.retenciones.find((r) => r.id === "osecac_fijo");
    expect(fila.rubro).toBe("obra_social");
    const vuelta = formToConvenio(form, doc);
    expect(vuelta.reglas_calculo.retenciones_sindicales.osecac_fijo.rubro).toBe("obra_social");
    expect(vuelta.reglas_calculo.retenciones_sindicales.sec_solidario?.rubro ?? vuelta.reglas_calculo.retenciones_sindicales.faecys?.rubro).toBeUndefined();
  });
});
