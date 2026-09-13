// test/adicionalesCondicionales.test.js
//
// Un adicional que depende de la situación del empleado tiene que PREGUNTARSE,
// no estar siempre prendido.
//
// El caso que lo destapó: la asistencia perfecta de gastronómicos sumaba un 10%
// todos los meses, hubiera faltado o no. En el motor anterior era opcional
// (`asistenciaPerfecta ? basico * 0.10 : 0`) y se perdió en la migración al
// motor único, sin que nadie lo notara.

import { describe, it, expect } from "vitest";
import { procesarRecibo, reglaCorresponde } from "../lib/motorLiquidacion.js";
import { convenioToForm, formToConvenio, validarFormConvenio } from "../lib/convenioForm.js";
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

/** Gastronómicos con la asistencia perfecta colgada de una pregunta. */
function gastroConPregunta() {
  const c = JSON.parse(JSON.stringify(convenioGastro));
  c.reglas_calculo.adicionales_remunerativos.asistencia_perfecta.depende_de = "asistencia_perfecta";
  c.inputs_requeridos.push({
    id: "asistencia_perfecta", tipo: "boolean",
    label: "¿Tuvo asistencia perfecta este mes?", default: true,
  });
  return c;
}

describe("el caso real: la asistencia perfecta de gastronómicos", () => {
  const conv = gastroConPregunta();

  it("si contesta que sí, cobra igual que siempre", () => {
    const r = procesarRecibo(conv, escala, entradas({ asistencia_perfecta: true }));
    const comoAntes = procesarRecibo(convenioGastro, escala, entradas());
    expect(money(r.totales.neto)).toBe(money(comoAntes.totales.neto));
    expect(money(r.totales.neto)).toBe(1498658.95);
  });

  it("si contesta que faltó, el adicional NO se suma", () => {
    const r = procesarRecibo(conv, escala, entradas({ asistencia_perfecta: false }));
    expect(linea(r, "Asistencia Perfecta")).toBeUndefined();
    expect(money(r.totales.neto)).toBe(1380654.31);
  });

  it("la diferencia es la plata que hoy se está mostrando de más", () => {
    const con = procesarRecibo(conv, escala, entradas({ asistencia_perfecta: true }));
    const sin = procesarRecibo(conv, escala, entradas({ asistencia_perfecta: false }));
    expect(money(con.totales.neto - sin.totales.neto)).toBe(118004.64);
  });

  it("el complemento de servicio, que no es condicional, se sigue cobrando siempre", () => {
    const r = procesarRecibo(conv, escala, entradas({ asistencia_perfecta: false }));
    expect(linea(r, "Complemento de Servicio")).toBeDefined();
  });
});

describe("el mecanismo, en general", () => {
  const conv = gastroConPregunta();

  it("se puede invertir con `cuando: false`", () => {
    const c = JSON.parse(JSON.stringify(conv));
    c.reglas_calculo.adicionales_remunerativos.asistencia_perfecta.cuando = false;
    expect(linea(procesarRecibo(c, escala, entradas({ asistencia_perfecta: false })), "Asistencia")).toBeDefined();
    expect(linea(procesarRecibo(c, escala, entradas({ asistencia_perfecta: true })), "Asistencia")).toBeUndefined();
  });

  it("una regla sin condición se aplica siempre", () => {
    expect(reglaCorresponde({}, {}, convenioGastro, "x")).toBe(true);
  });

  it("las retenciones usan el mismo mecanismo", () => {
    const c = JSON.parse(JSON.stringify(conv));
    c.reglas_calculo.retenciones_sindicales.uthgra_sepelio.depende_de = "asistencia_perfecta";
    expect(linea(procesarRecibo(c, escala, entradas({ asistencia_perfecta: true })), "Sepelio")).toBeDefined();
    expect(linea(procesarRecibo(c, escala, entradas({ asistencia_perfecta: false })), "Sepelio")).toBeUndefined();
  });

  it('la condición vieja "solo_afiliado" sigue funcionando igual', () => {
    const sinAfiliar = procesarRecibo(convenioGastro, escala, entradas({ afiliado_sindicato: false }));
    const afiliado = procesarRecibo(convenioGastro, escala, entradas({ afiliado_sindicato: true }));
    expect(linea(sinAfiliar, "Cuota Afiliado")).toBeUndefined();
    expect(linea(afiliado, "Cuota Afiliado")).toBeDefined();
  });

  it("si la pregunta no está declarada, el motor FRENA en vez de borrar el concepto", () => {
    // Sin la pregunta, la respuesta sería siempre "no" y el adicional
    // desaparecería del recibo sin que nadie se entere.
    const c = JSON.parse(JSON.stringify(convenioGastro));
    c.reglas_calculo.adicionales_remunerativos.asistencia_perfecta.depende_de = "pregunta_que_no_existe";
    expect(() => procesarRecibo(c, escala, entradas())).toThrow(/pregunta_que_no_existe/);
    expect(() => procesarRecibo(c, escala, entradas())).toThrow(/no le hace al usuario/);
  });
});

describe("configurarlo desde el panel", () => {
  const base = {
    id: "x-cct-1-1", nombre: "X", cct: "1/1", activo: true,
    antiguedadPct: "", presentismoPct: "", retenciones: [],
  };
  const conAdicional = (extra) => ({
    ...base,
    adicionales: [{ label: "Asistencia perfecta", valorPct: 10, base: "basico", ...extra }],
  });

  it("marcar la casilla crea la pregunta y la engancha", () => {
    const doc = formToConvenio(conAdicional({
      condicional: true, pregunta: "¿Tuvo asistencia perfecta?", preguntaPorDefecto: true,
    }));
    const adicional = doc.reglas_calculo.adicionales_remunerativos.asistencia_perfecta;
    expect(adicional.depende_de).toBe("asistencia_perfecta");

    const pregunta = doc.inputs_requeridos.find((i) => i.id === "asistencia_perfecta");
    expect(pregunta).toMatchObject({
      tipo: "boolean", label: "¿Tuvo asistencia perfecta?", default: true,
    });
  });

  it("se puede elegir que venga contestada que no", () => {
    const doc = formToConvenio(conAdicional({
      condicional: true, pregunta: "¿Corresponde?", preguntaPorDefecto: false,
    }));
    expect(doc.inputs_requeridos.find((i) => i.id === "asistencia_perfecta").default).toBe(false);
  });

  it("sin marcar la casilla, no hay pregunta ni condición", () => {
    const doc = formToConvenio(conAdicional({}));
    expect(doc.reglas_calculo.adicionales_remunerativos.asistencia_perfecta.depende_de).toBeUndefined();
    expect(doc.inputs_requeridos.find((i) => i.id === "asistencia_perfecta")).toBeUndefined();
  });

  it("destildarla borra la pregunta: no queda dando vueltas sin afectar a nada", () => {
    const conPregunta = formToConvenio(conAdicional({ condicional: true, pregunta: "¿Corresponde?" }));
    const sinPregunta = formToConvenio(conAdicional({ condicional: false }), conPregunta);
    expect(sinPregunta.inputs_requeridos.find((i) => i.id === "asistencia_perfecta")).toBeUndefined();
  });

  it("renombrar el adicional no deja la pregunta vieja huérfana", () => {
    const primero = formToConvenio(conAdicional({ condicional: true, pregunta: "¿Corresponde?" }));
    const form = convenioToForm(primero);
    form.adicionales[0].label = "Premio por presentismo";
    form.adicionales[0].id = "";
    const segundo = formToConvenio(form, primero);
    const preguntas = segundo.inputs_requeridos.filter((i) => i.origen === "adicional");
    expect(preguntas).toHaveLength(1);
    expect(preguntas[0].id).toBe("premio_por_presentismo");
  });

  it("ida y vuelta sin perder la configuración", () => {
    const doc = formToConvenio(conAdicional({
      condicional: true, pregunta: "¿Tuvo asistencia perfecta?", preguntaPorDefecto: false,
    }));
    const form = convenioToForm(doc);
    expect(form.adicionales[0]).toMatchObject({
      condicional: true, pregunta: "¿Tuvo asistencia perfecta?", preguntaPorDefecto: false,
    });
    expect(formToConvenio(form, doc).reglas_calculo).toEqual(doc.reglas_calculo);
  });

  it("no deja marcarla sin escribir la pregunta", () => {
    expect(validarFormConvenio(conAdicional({ condicional: true, pregunta: "" })))
      .toContainEqual(expect.objectContaining({ campo: "adicionales[0].pregunta" }));
  });
});
