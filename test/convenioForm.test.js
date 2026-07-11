// test/convenioForm.test.js
// Garantiza que editar un convenio por el formulario del admin NO cambia cómo
// calcula el motor: la ida y vuelta (doc -> form -> doc) preserva reglas_calculo,
// y el neto del recibo queda idéntico.

import { describe, it, expect } from "vitest";
import { convenioToForm, formToConvenio } from "../lib/convenioForm.js";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const sortDeep = (x) => {
  if (Array.isArray(x)) return x.map(sortDeep);
  if (x && typeof x === "object") {
    return Object.keys(x).sort().reduce((o, k) => ((o[k] = sortDeep(x[k])), o), {});
  }
  return x;
};

describe("Editor de convenios por formulario", () => {
  const form = convenioToForm(convenioComercio);
  const reconstruido = formToConvenio(form, convenioComercio);

  it("lee bien los porcentajes (antigüedad 1%, presentismo 8,333%)", () => {
    expect(form.antiguedadPct).toBe(1);
    expect(form.presentismoPct).toBe(8.333);
    expect(form.retenciones).toHaveLength(4);
  });

  it("la ida y vuelta preserva reglas_calculo EXACTO", () => {
    expect(sortDeep(reconstruido.reglas_calculo)).toEqual(sortDeep(convenioComercio.reglas_calculo));
  });

  it("preserva inputs_requeridos y datos generales", () => {
    expect(reconstruido.inputs_requeridos).toHaveLength(convenioComercio.inputs_requeridos.length);
    expect(reconstruido.nombre).toBe("Empleados de Comercio");
    expect(reconstruido.cct).toBe("130/75");
    expect(reconstruido.activo).toBe(true);
  });

  it("el recibo da el mismo neto usando el convenio reconstruido", () => {
    const entrada = {
      categoria: "Vendedor B",
      carga_horaria: 48,
      antiguedad_años: 5,
      horas_extras_50: 0,
      horas_extras_100: 0,
      afiliado_sindicato: false,
    };
    const original = procesarRecibo(convenioComercio, escalasComercio["2026-07"], entrada);
    const viaForm = procesarRecibo(reconstruido, escalasComercio["2026-07"], entrada);
    expect(money(viaForm.totales.neto)).toBe(money(original.totales.neto));
    expect(money(viaForm.totales.neto)).toBe(1166249.7);
  });

  it("un convenio nuevo genera inputs estándar y respeta afiliación", () => {
    const nuevo = formToConvenio(
      {
        id: "prueba-nuevo",
        nombre: "Gremio de Prueba",
        cct: "999/99",
        activo: true,
        antiguedadPct: 2,
        presentismoPct: "",
        retenciones: [
          { label: "Cuota afiliado", tipoValor: "porcentaje", valor: 2.5, base: "remunerativo", condicion: "solo_afiliado" },
        ],
      },
      null
    );
    expect(nuevo.reglas_calculo.antiguedad.porcentaje_por_año).toBe(0.02);
    expect(nuevo.reglas_calculo.presentismo).toBeUndefined(); // presentismo vacío -> no se incluye
    expect(nuevo.reglas_calculo.retenciones_sindicales["cuota_afiliado"].porcentaje).toBe(0.025);
    // Como hay una retención "solo_afiliado", debe existir el input de afiliación.
    expect(nuevo.inputs_requeridos.some((i) => i.id === "afiliado_sindicato")).toBe(true);
  });
});
