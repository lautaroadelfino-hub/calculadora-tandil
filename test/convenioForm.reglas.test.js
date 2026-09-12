// test/convenioForm.reglas.test.js
// El formulario del panel ahora puede expresar todo lo que el motor entiende.
// Antes no: los adicionales remunerativos, la antigüedad por tramos y la base
// de cálculo se guardaban desde otro lado o no se guardaban.

import { describe, it, expect } from "vitest";
import { convenioToForm, formToConvenio, validarFormConvenio } from "../lib/convenioForm.js";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenioGastro from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalasGastro from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const entradas = {
  zona: "Escala A",
  categoria: "Nivel 6 (Mozo - Maître)",
  carga_horaria: 48,
  antiguedad_años: 5,
  horas_extras_50: 0,
  horas_extras_100: 0,
  afiliado_sindicato: true,
};
const money = (n) => Math.round(n * 100) / 100;

describe("ida y vuelta con gastronómicos, el convenio con adicionales", () => {
  // El test de round-trip que ya existía usa Comercio, que no tiene adicionales
  // remunerativos. Este cubre el convenio que sí los usa.
  const form = convenioToForm(convenioGastro);
  const vuelta = formToConvenio(form, convenioGastro);

  it("el formulario ahora LEE los adicionales (antes ni los miraba)", () => {
    expect(form.adicionales).toHaveLength(2);
    const complemento = form.adicionales.find((a) => a.id === "complemento_servicio");
    expect(complemento.valorPct).toBeCloseTo(12, 6);
    expect(complemento.label).toBe("Complemento de Servicio (12%)");
  });

  it("y los vuelve a escribir igual", () => {
    expect(vuelta.reglas_calculo.adicionales_remunerativos).toMatchObject({
      complemento_servicio: { porcentaje: 0.12 },
      asistencia_perfecta: { porcentaje: 0.1 },
    });
  });

  it("editar el convenio desde el panel no cambia ni un peso del recibo", () => {
    const antes = procesarRecibo(convenioGastro, escalasGastro["2026-06"], entradas);
    const despues = procesarRecibo(vuelta, escalasGastro["2026-06"], entradas);
    expect(money(despues.totales.neto)).toBe(money(antes.totales.neto));
    expect(despues.detalle.length).toBe(antes.detalle.length);
  });
});

describe("un convenio NUEVO ya puede tener adicionales sin tocar Firebase", () => {
  const base = {
    id: "nuevo-cct-9-99",
    nombre: "Convenio nuevo",
    cct: "9/99",
    activo: true,
    antiguedadModo: "lineal",
    antiguedadPct: 1,
    presentismoPct: "",
    retenciones: [],
  };

  it("se crean desde el formulario", () => {
    const doc = formToConvenio({
      ...base,
      adicionales: [{ label: "Plus por zona fría", valorPct: 20, base: "basico" }],
    });
    expect(doc.reglas_calculo.adicionales_remunerativos.plus_por_zona_fria).toMatchObject({
      label: "Plus por zona fría",
      porcentaje: 0.2,
      aplica_sobre: "basico",
    });
  });

  it("se puede elegir que se calculen sobre básico + antigüedad", () => {
    const doc = formToConvenio({
      ...base,
      adicionales: [{ label: "Plus", valorPct: 10, base: "basico_mas_antiguedad" }],
    });
    expect(doc.reglas_calculo.adicionales_remunerativos.plus.aplica_sobre).toBe("basico_mas_antiguedad");
  });

  it("un adicional sin nombre no se guarda", () => {
    expect(validarFormConvenio({ ...base, adicionales: [{ label: "", valorPct: 10 }] }))
      .toContainEqual(expect.objectContaining({ campo: "adicionales[0].label" }));
  });

  it("un adicional con porcentaje ilegible tampoco", () => {
    expect(validarFormConvenio({ ...base, adicionales: [{ label: "Plus", valorPct: "diez" }] }))
      .toContainEqual(expect.objectContaining({ campo: "adicionales[0].valorPct" }));
  });
});

describe("antigüedad por tramos desde el formulario", () => {
  const base = {
    id: "x-cct-1-1", nombre: "X", cct: "1/1", activo: true,
    presentismoPct: "", retenciones: [], adicionales: [],
  };

  it("se guardan ordenados por año aunque se carguen desordenados", () => {
    const doc = formToConvenio({
      ...base,
      antiguedadModo: "tramos",
      antiguedadTramos: [
        { desdeAños: 5, porcentajePct: 4 },
        { desdeAños: 1, porcentajePct: 1 },
        { desdeAños: 3, porcentajePct: 2 },
      ],
    });
    expect(doc.reglas_calculo.antiguedad.modo).toBe("tramos");
    expect(doc.reglas_calculo.antiguedad.tramos.map((t) => t.desde_años)).toEqual([1, 3, 5]);
    expect(doc.reglas_calculo.antiguedad.tramos[2].porcentaje).toBeCloseTo(0.04, 8);
  });

  it("ida y vuelta sin perder nada", () => {
    const doc = formToConvenio({
      ...base, antiguedadModo: "tramos",
      antiguedadTramos: [{ desdeAños: 1, porcentajePct: 1 }, { desdeAños: 5, porcentajePct: 4 }],
    });
    const form = convenioToForm(doc);
    expect(form.antiguedadModo).toBe("tramos");
    expect(form.antiguedadTramos).toEqual([
      { desdeAños: 1, porcentajePct: 1 },
      { desdeAños: 5, porcentajePct: 4 },
    ]);
  });

  it("avisa si se eligió tramos y no se cargó ninguno", () => {
    expect(validarFormConvenio({ ...base, antiguedadModo: "tramos", antiguedadTramos: [] }))
      .toContainEqual(expect.objectContaining({ campo: "antiguedadTramos" }));
  });

  it("avisa si hay dos tramos que empiezan el mismo año", () => {
    const errores = validarFormConvenio({
      ...base, antiguedadModo: "tramos",
      antiguedadTramos: [{ desdeAños: 5, porcentajePct: 4 }, { desdeAños: 5, porcentajePct: 6 }],
    });
    expect(errores.some((e) => e.mensaje.includes("dos tramos"))).toBe(true);
  });
});

describe("la retención que reemplaza la obra social", () => {
  it("el id mágico viejo se lee como un campo visible", () => {
    const form = convenioToForm({
      id: "x", nombre: "X",
      reglas_calculo: { retenciones_sindicales: { obra_social_extra: { label: "OS gremial", porcentaje: 0.03 } } },
    });
    expect(form.retenciones[0].reemplazaObraSocial).toBe(true);
  });

  it("al guardar queda el flag explícito, que ya no depende del nombre", () => {
    const doc = formToConvenio({
      id: "x-cct-1-1", nombre: "X", cct: "1/1", activo: true,
      antiguedadPct: "", presentismoPct: "", adicionales: [],
      retenciones: [{ label: "OS gremial", tipoValor: "porcentaje", valor: 3, reemplazaObraSocial: true }],
    });
    expect(doc.reglas_calculo.retenciones_sindicales.os_gremial.reemplaza_obra_social).toBe(true);
  });
});

describe("la base del presentismo", () => {
  const base = {
    id: "x-cct-1-1", nombre: "X", cct: "1/1", activo: true,
    antiguedadPct: 1, retenciones: [], adicionales: [],
  };

  it("se puede elegir sólo el básico", () => {
    const doc = formToConvenio({ ...base, presentismoPct: 10, presentismoBase: "basico" });
    expect(doc.reglas_calculo.presentismo.aplica_sobre).toBe("basico");
  });

  it("sin elegir nada sigue siendo básico + antigüedad, como siempre", () => {
    const doc = formToConvenio({ ...base, presentismoPct: 10 });
    expect(doc.reglas_calculo.presentismo.aplica_sobre).toBe("basico_mas_antiguedad");
  });
});
