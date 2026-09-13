// test/contribucionesForm.test.js
// La tabla de contribuciones patronales: la semilla tiene la forma correcta, y
// el formulario del panel la lee y la escribe sin perder ni inventar nada.

import { describe, it, expect } from "vitest";
import semilla from "../data/contribuciones.seed.json";
import {
  tablaToForm, formToTabla, validarFormContribuciones, regimenPredeterminado,
  CRITERIOS_CONTABLES, conceptoVacio, regimenVacio,
} from "../lib/contribucionesForm.js";
import { RUBROS_DEL_COSTO_LABORAL } from "../lib/vocabularioConvenios.js";

const RUBROS = RUBROS_DEL_COSTO_LABORAL.map((r) => r.id);
const regimenes = Object.values(semilla.regimenes);
const conceptos = regimenes.flatMap((r) => r.conceptos);
const suma = (xs) => Math.round(xs.reduce((a, c) => a + c.alicuota, 0) * 1e6) / 1e6;

describe("la semilla de contribuciones", () => {
  it("las alícuotas son fracciones, nunca puntos", () => {
    // El cazador del ×100. El panel viejo guardaba 12.35 y el motor usa 0.11:
    // una tabla con puntos cobraría cien veces más sin que nadie lo note.
    for (const c of conceptos.filter((c) => c.unidad === "porcentaje")) {
      expect(c.alicuota, c.id).toBeGreaterThan(0);
      expect(c.alicuota, c.id).toBeLessThan(1);
    }
  });

  it("todo concepto pertenece a uno de los siete rubros del decreto", () => {
    expect(RUBROS).toHaveLength(7);
    for (const c of [...conceptos, ...semilla.universales]) expect(RUBROS, c.id).toContain(c.rubro);
  });

  it("hay exactamente un régimen predeterminado, y es MiPyME", () => {
    expect(regimenes.filter((r) => r.predeterminado).length).toBe(1);
    expect(regimenPredeterminado(semilla)).toBe("resto_mipyme");
  });

  it("seguridad social suma 18% (MiPyME) y 20,40% (grandes); la obra social es 6% en los dos", () => {
    const sinOS = (r) => r.conceptos.filter((c) => c.id !== "obra_social");
    expect(suma(sinOS(semilla.regimenes.resto_mipyme))).toBe(0.18);
    expect(suma(sinOS(semilla.regimenes.servicios_comercio_grande))).toBe(0.204);
    for (const r of regimenes) expect(r.conceptos.find((c) => c.id === "obra_social").alicuota).toBe(0.06);
  });

  it("la detracción se resta sólo en SIPA, INSSJP, asignaciones y FNE, nunca en obra social", () => {
    for (const r of regimenes) {
      for (const c of r.conceptos) expect(c.aplica_detraccion, `${c.id}`).toBe(c.id !== "obra_social");
    }
    expect(semilla.detraccion.monto).toBe(7003.68);
    expect(semilla.detraccion.prorratea_por_jornada).toBe(true);
  });

  it("el no remunerativo paga la contribución de obra social y ninguna otra (decisión del dueño)", () => {
    for (const r of regimenes) {
      for (const c of r.conceptos) {
        expect(c.base, c.id).toBe(c.id === "obra_social" ? "remunerativo_mas_no_remunerativo" : "remunerativo");
      }
    }
  });

  it("FFEP y SCVO son sumas fijas universales, con su rubro", () => {
    const porId = Object.fromEntries(semilla.universales.map((u) => [u.id, u]));
    expect(porId.ffep).toMatchObject({ unidad: "suma_fija", monto: 1624, rubro: "art" });
    expect(porId.scvo).toMatchObject({ unidad: "suma_fija", monto: 424.62, rubro: "otros" });
  });

  it("las bases del art. 9 tienen mínimo menor que máximo", () => {
    expect(semilla.bases_art9.minima).toBeGreaterThan(0);
    expect(semilla.bases_art9.maxima).toBeGreaterThan(semilla.bases_art9.minima);
  });

  it("los tres criterios contables arrancan encendidos, como se decidió", () => {
    expect(CRITERIOS_CONTABLES.map((c) => c.key).sort()).toEqual(Object.keys(semilla.criterios_contables).sort());
    for (const c of CRITERIOS_CONTABLES) expect(semilla.criterios_contables[c.key]).toBe(true);
  });
});

describe("el formulario de la pestaña Contribuciones", () => {
  const { _nota, _fuente, ...datos } = semilla;
  const form = tablaToForm(semilla);

  it("muestra las alícuotas como porcentaje", () => {
    const sipa = form.regimenes.find((r) => r.id === "resto_mipyme").conceptos.find((c) => c.id === "sipa");
    expect(sipa.alicuotaPct).toBe(10.77);
    expect(sipa.aplicaDetraccion).toBe(true);
  });

  it("la ida y vuelta devuelve la semilla tal cual: no pierde ni inventa nada", () => {
    expect(formToTabla(form)).toEqual(datos);
  });

  it("guardar dos veces seguidas da lo mismo que guardar una", () => {
    const una = formToTabla(form);
    expect(formToTabla(tablaToForm(una))).toEqual(una);
  });

  it("un documento vacío arranca con los criterios encendidos y sin regímenes", () => {
    const vacio = tablaToForm({});
    expect(vacio.regimenes).toEqual([]);
    for (const c of CRITERIOS_CONTABLES) expect(vacio.criterios[c.key]).toBe(true);
  });

  it("un criterio apagado en el documento se respeta", () => {
    const f = tablaToForm({ ...datos, criterios_contables: { ...datos.criterios_contables, tope_art9_en_aportes: false } });
    expect(f.criterios.tope_art9_en_aportes).toBe(false);
    expect(formToTabla(f).criterios_contables.tope_art9_en_aportes).toBe(false);
  });
});

describe("lo que el formulario frena antes de guardar", () => {
  const base = () => tablaToForm(semilla);
  const mensajes = (f) => validarFormContribuciones(f).map((e) => e.mensaje).join("\n");

  it("la semilla pasa limpia", () => {
    expect(validarFormContribuciones(base())).toEqual([]);
  });

  it("dos regímenes predeterminados, o ninguno", () => {
    const dos = base(); dos.regimenes[1].predeterminado = true;
    expect(mensajes(dos)).toMatch(/más de un régimen predeterminado/);
    const ninguno = base(); ninguno.regimenes[0].predeterminado = false;
    expect(mensajes(ninguno)).toMatch(/Marcá un régimen como predeterminado/);
  });

  it("una alícuota mayor a 100 (alguien escribió 1077 en vez de 10,77)", () => {
    const f = base(); f.regimenes[0].conceptos[0].alicuotaPct = "1077";
    expect(mensajes(f)).toMatch(/SIPA.*entre 0 y 100/);
  });

  it("un número ilegible no se guarda como cero", () => {
    const f = base(); f.detraccion.monto = "siete mil";
    expect(mensajes(f)).toMatch(/Detracción: no se entiende/);
    expect(() => formToTabla(f)).toThrow(/Detracción/);
  });

  it("un campo vacío tampoco", () => {
    const f = base(); f.universales[0].monto = "";
    expect(mensajes(f)).toMatch(/FFEP.*falta el número/);
  });

  it("un rubro que no es de los siete", () => {
    const f = base(); f.regimenes[0].conceptos[0].rubro = "impuestos";
    expect(mensajes(f)).toMatch(/siete rubros/);
  });

  it("bases del art. 9 al revés", () => {
    const f = base(); f.basesArt9 = { minima: 100, maxima: 50 };
    expect(mensajes(f)).toMatch(/mayor que la mínima/);
  });

  it("un régimen sin conceptos", () => {
    const f = base(); f.regimenes.push({ ...regimenVacio(), label: "Vacío" });
    expect(mensajes(f)).toMatch(/Vacío.*ningún concepto/);
  });

  it("un concepto nuevo recibe un id a partir del nombre, sin pisar uno existente", () => {
    const f = base();
    f.regimenes[0].conceptos.push({ ...conceptoVacio(), label: "Fondo Nacional de Empleo", alicuotaPct: 1, rubro: "otros" });
    const ids = formToTabla(f).regimenes.resto_mipyme.conceptos.map((c) => c.id);
    expect(ids).toContain("fne");
    expect(ids).toContain("fondo_nacional_de_empleo");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
