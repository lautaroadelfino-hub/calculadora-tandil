// test/convenioForm.validacion.test.js
// El formulario de convenios es por donde el dueño carga las reglas que
// después usan TODOS los recibos de ese gremio. Estos tests cubren lo que
// antes pasaba en silencio.

import { describe, it, expect } from "vitest";
import { formToConvenio, validarFormConvenio, ErrorDeFormulario } from "../lib/convenioForm.js";

function form(overrides = {}) {
  return {
    id: "prueba-cct-1-23",
    nombre: "Convenio de prueba",
    cct: "1/23",
    activo: true,
    antiguedadPct: 1,
    presentismoPct: 8.333,
    retenciones: [],
    ...overrides,
  };
}

describe("el bug que hacía desaparecer el presentismo", () => {
  it('escribir "8,333%" con el signo guarda el presentismo, no lo borra', () => {
    // Antes: Number("8.333%") -> NaN -> 0 -> la condición !== 0 fallaba y la
    // regla, que ya se había borrado, no se volvía a escribir. El convenio
    // quedaba sin presentismo y nadie se enteraba.
    const doc = formToConvenio(form({ presentismoPct: "8,333%" }));
    expect(doc.reglas_calculo.presentismo).toBeDefined();
    expect(doc.reglas_calculo.presentismo.porcentaje).toBeCloseTo(0.08333, 8);
  });

  it("lo mismo con la antigüedad", () => {
    const doc = formToConvenio(form({ antiguedadPct: "1,5 %" }));
    expect(doc.reglas_calculo.antiguedad.porcentaje_por_año).toBeCloseTo(0.015, 8);
  });

  it("un valor ilegible ya no se convierte en cero: frena el guardado", () => {
    expect(() => formToConvenio(form({ presentismoPct: "ocho coma tres" }))).toThrow(ErrorDeFormulario);
  });

  it("el error dice qué campo está mal, en castellano", () => {
    const errores = validarFormConvenio(form({ presentismoPct: "abc" }));
    expect(errores).toHaveLength(1);
    expect(errores[0].campo).toBe("presentismoPct");
    expect(errores[0].mensaje).toMatch(/Presentismo/);
  });
});

describe("el bug del monto fijo de cuatro cifras", () => {
  it('una retención fija de "1.500" son mil quinientos pesos, no uno cincuenta', () => {
    const doc = formToConvenio(
      form({ retenciones: [{ label: "Cuota fija", tipoValor: "fijo", valor: "1.500" }] })
    );
    expect(doc.reglas_calculo.retenciones_sindicales.cuota_fija.valor_fijo).toBe(1500);
  });

  it('"1.234,56" se lee completo', () => {
    const doc = formToConvenio(
      form({ retenciones: [{ label: "Cuota fija", tipoValor: "fijo", valor: "1.234,56" }] })
    );
    expect(doc.reglas_calculo.retenciones_sindicales.cuota_fija.valor_fijo).toBeCloseTo(1234.56, 6);
  });
});

describe("otras cosas que no deberían poder guardarse", () => {
  it("un convenio sin identificador", () => {
    expect(validarFormConvenio(form({ id: "" }))).toContainEqual(
      expect.objectContaining({ campo: "id" })
    );
  });

  it("un convenio sin nombre", () => {
    expect(validarFormConvenio(form({ nombre: "  " }))).toContainEqual(
      expect.objectContaining({ campo: "nombre" })
    );
  });

  it("un porcentaje mayor a 100", () => {
    expect(validarFormConvenio(form({ antiguedadPct: 150 }))).toContainEqual(
      expect.objectContaining({ campo: "antiguedadPct" })
    );
  });

  it("una retención porcentual mayor a 100, con un consejo útil", () => {
    const errores = validarFormConvenio(
      form({ retenciones: [{ label: "Cuota", tipoValor: "porcentaje", valor: 1500 }] })
    );
    expect(errores[0].mensaje).toMatch(/monto fijo en pesos/);
  });

  it("una retención sin nombre", () => {
    const errores = validarFormConvenio(
      form({ retenciones: [{ label: "", tipoValor: "porcentaje", valor: 2 }] })
    );
    expect(errores).toContainEqual(expect.objectContaining({ campo: "retenciones[0].label" }));
  });

  it("un porcentaje negativo", () => {
    expect(validarFormConvenio(form({ presentismoPct: -5 }))).toContainEqual(
      expect.objectContaining({ campo: "presentismoPct" })
    );
  });
});

describe("lo que SÍ tiene que seguir funcionando", () => {
  it("un formulario válido no da errores", () => {
    expect(validarFormConvenio(form())).toEqual([]);
  });

  it("dejar el porcentaje vacío significa 'este convenio no tiene esa regla'", () => {
    const doc = formToConvenio(form({ presentismoPct: "" }));
    expect(doc.reglas_calculo.presentismo).toBeUndefined();
    expect(validarFormConvenio(form({ presentismoPct: "" }))).toEqual([]);
  });

  it("un cero también significa que no se aplica la regla", () => {
    // Importante: NO se escribe {porcentaje: 0}, porque el motor hace
    // `regla.porcentaje || 0.08333` y un cero caería en el fallback de Comercio.
    const doc = formToConvenio(form({ presentismoPct: 0 }));
    expect(doc.reglas_calculo.presentismo).toBeUndefined();
  });
});
