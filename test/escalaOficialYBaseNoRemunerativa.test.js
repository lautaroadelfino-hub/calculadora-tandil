// test/escalaOficialYBaseNoRemunerativa.test.js
//
// Dos cosas que salieron de leer el texto oficial del CCT 389/04 en Infoleg
// (servicios.infoleg.gob.ar, norma 99666, leído el 13 de septiembre de 2026):
//
//   1. La escala de antigüedad del artículo 11.3.1, que ahora se puede cargar
//      de un botón en vez de tipear veinte tramos.
//   2. El artículo 11.3.3, que dice que la base son "únicamente los salarios
//      básicos correspondientes a la categoría". Si las sumas no remunerativas
//      generan adicionales o no pasa a ser una decisión del convenio.

import { describe, it, expect } from "vitest";
import { procesarRecibo, porcentajeAntiguedad } from "../lib/motorLiquidacion.js";
import { convenioToForm, formToConvenio } from "../lib/convenioForm.js";
import {
  ESCALAS_ANTIGUEDAD, escalaOficial, tramosParaElFormulario,
} from "../lib/escalasAntiguedadOficiales.js";
import convenioGastro from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalasGastro from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, t) => r.detalle.find((l) => l.concepto.includes(t));
const escala = escalasGastro["2026-06"];

const entradas = (o = {}) => ({
  zona: "Escala A", categoria: "Nivel 6 (Mozo - Maître)", carga_horaria: 48,
  antiguedad_años: 5, horas_extras_50: 0, horas_extras_100: 0,
  afiliado_sindicato: false, ...o,
});

describe("la escala oficial del CCT 389/04", () => {
  const cct389 = escalaOficial("cct-389-04");

  it("cada escala del catálogo dice de dónde salió", () => {
    for (const e of ESCALAS_ANTIGUEDAD) {
      expect(e.fuente, `${e.id}: sin fuente`).toMatch(/^https?:\/\//);
      expect(e.leidoEl, `${e.id}: sin fecha de lectura`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.articulo, `${e.id}: sin artículo`).toBeTruthy();
    }
  });

  it("los tramos van en orden y no se repiten", () => {
    for (const e of ESCALAS_ANTIGUEDAD) {
      const años = e.tramos.map((t) => t.desde_años);
      expect(años).toEqual([...años].sort((a, b) => a - b));
      expect(new Set(años).size).toBe(años.length);
    }
  });

  it("reproduce el artículo 11.3.1, tramo por tramo", () => {
    // Copiado del texto oficial. El artículo repite cada porcentaje en dos
    // renglones ("a 1 año cumplido y hasta los 2" y "de los 2 años hasta los 3",
    // ambos 1%), así que se verifica año por año y no tramo por tramo.
    const segunElConvenio = {
      1: 1, 2: 1, 3: 2, 4: 2, 5: 4, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6,
      11: 7, 12: 7, 13: 8, 14: 8, 15: 10, 16: 10, 17: 12, 18: 12, 19: 14, 25: 14,
    };
    const regla = { modo: "tramos", tramos: cct389.tramos };
    for (const [años, pct] of Object.entries(segunElConvenio)) {
      expect(
        money(porcentajeAntiguedad(regla, Number(años)) * 100),
        `a los ${años} años el convenio dice ${pct}%`
      ).toBe(pct);
    }
  });

  it("antes de cumplir el año no se paga antigüedad", () => {
    expect(porcentajeAntiguedad({ modo: "tramos", tramos: cct389.tramos }, 0)).toBe(0);
  });

  it("el botón del panel entrega los tramos en el formato del formulario", () => {
    const tramos = tramosParaElFormulario("cct-389-04");
    expect(tramos).toHaveLength(10);
    expect(tramos[0]).toEqual({ desdeAños: 1, porcentajePct: 1 });
    expect(tramos[9]).toEqual({ desdeAños: 19, porcentajePct: 14 });
  });

  it("cargarla desde el panel y guardar da la escala correcta", () => {
    const doc = formToConvenio({
      id: "x-cct-1-1", nombre: "X", cct: "1/1", activo: true,
      presentismoPct: "", retenciones: [], adicionales: [],
      antiguedadModo: "tramos",
      antiguedadTramos: tramosParaElFormulario("cct-389-04"),
    });
    expect(doc.reglas_calculo.antiguedad.tramos).toEqual(cct389.tramos);
  });

  it("cuánto cambia el recibo de gastronómicos, a los 10 años", () => {
    const conTramos = JSON.parse(JSON.stringify(convenioGastro));
    conTramos.reglas_calculo.antiguedad = { modo: "tramos", tramos: cct389.tramos };
    const hoy = procesarRecibo(convenioGastro, escala, entradas({ antiguedad_años: 10 }));
    const oficial = procesarRecibo(conTramos, escala, entradas({ antiguedad_años: 10 }));
    // Hoy aplica 1% por año (10%); el convenio dice 6%.
    expect(money(hoy.totales.neto - oficial.totales.neto)).toBe(47201.86);
  });
});

describe("si las sumas no remunerativas generan adicionales", () => {
  const sinNr = (c) => {
    const x = JSON.parse(JSON.stringify(c));
    x.reglas_calculo.no_remunerativo_genera_adicionales = false;
    return x;
  };

  it("por defecto sí, que es lo que el motor venía haciendo", () => {
    const r = procesarRecibo(convenioGastro, escala, entradas());
    expect(linea(r, "Antigüedad No Remunerativa")).toBeDefined();
    expect(r.metodo.noRemunerativoGeneraAdicionales).toBe(true);
    expect(money(r.totales.neto)).toBe(1498658.95);
  });

  it("si se apaga, la antigüedad se calcula sólo sobre el básico", () => {
    const r = procesarRecibo(sinNr(convenioGastro), escala, entradas());
    expect(linea(r, "Antigüedad No Remunerativa")).toBeUndefined();
    expect(r.metodo.noRemunerativoGeneraAdicionales).toBe(false);
  });

  it("la suma no remunerativa en sí se sigue cobrando: lo que cambia es lo que genera", () => {
    const r = procesarRecibo(sinNr(convenioGastro), escala, entradas());
    expect(linea(r, "Asignación No Remunerativa Base")).toBeDefined();
    expect(r.totales.noRemunerativo).toBeGreaterThan(0);
  });

  it("también afecta al presentismo y a los adicionales", () => {
    const con = procesarRecibo(convenioGastro, escala, entradas());
    const sin = procesarRecibo(sinNr(convenioGastro), escala, entradas());
    expect(linea(con, "Complemento de Servicio (12%) s/ No Remunerativo")).toBeDefined();
    expect(linea(sin, "Complemento de Servicio (12%) s/ No Remunerativo")).toBeUndefined();
    expect(sin.totales.neto).toBeLessThan(con.totales.neto);
  });

  it("se configura desde el panel y sobrevive la ida y vuelta", () => {
    const form = convenioToForm(sinNr(convenioGastro));
    expect(form.nrGeneraAdicionales).toBe(false);
    expect(formToConvenio(form, convenioGastro).reglas_calculo.no_remunerativo_genera_adicionales)
      .toBe(false);
  });

  it("el 'sí' no se guarda: es el valor por defecto y ensuciaría el documento", () => {
    const form = convenioToForm(convenioGastro);
    expect(form.nrGeneraAdicionales).toBe(true);
    const doc = formToConvenio(form, convenioGastro);
    expect("no_remunerativo_genera_adicionales" in doc.reglas_calculo).toBe(false);
  });
});
