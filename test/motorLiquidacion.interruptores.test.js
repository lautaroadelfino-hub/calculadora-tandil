// test/motorLiquidacion.interruptores.test.js
// Los dos criterios contables del lado del TRABAJADOR que el dueño decidió el
// 13/9/2026 y que viven en la tabla del período (para poder volver atrás desde
// /admin, sin desplegar):
//   - (reemplazado el 5/10/2026: la obra social va siempre sobre la jornada
//     completa, y eso ya no es un interruptor de la tabla);
//   - los topes mínimo y máximo del art. 9 (Ley 24.241) se aplican a los
//     aportes (jubilación, PAMI, obra social).
// Los dos canarios son de jornada completa y están dentro del rango del art. 9,
// así que no se mueven. Lo que se mueve, y se prueba acá, son las jornadas
// parciales, las muy reducidas y los sueldos altos.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import semilla from "../data/contribuciones.seed.json";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const escala = escalasComercio["2026-07"];
const entradas = (o = {}) => ({
  categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5,
  horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false, ...o,
});
const opciones = (extra = {}) => ({ periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07", ...extra });
const conCriterios = (criterios) => ({ ...semilla, criterios_contables: { ...semilla.criterios_contables, ...criterios } });
const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));
const { minima, maxima } = semilla.bases_art9;

describe("la obra social va siempre sobre la jornada completa (art. 92 ter inc. 4 LCT)", () => {
  // Decidido con el dueño el 5/10/2026: el 3% del trabajador y el 6% del
  // empleador se calculan sobre la remuneración de jornada completa de la
  // categoría. Lo fijo del mes se lleva a jornada completa; lo variable
  // (horas extras, por unidad, SAC, vacaciones) va como se cobró.
  const mediaJornada = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 24 }), null, opciones());
  const completa = procesarRecibo(convenioComercio, escala, entradas(), null, opciones());
  const contribucion = (r) => r.detalle.find((l) => l.tipo === "contribucion" && l.rubro === "obra_social" && l.id === "obra_social");

  it("media jornada: el 3% del trabajador es el mismo que en jornada completa", () => {
    expect(money(linea(mediaJornada, "Obra Social (3%)").monto)).toBe(money(linea(completa, "Obra Social (3%)").monto));
    expect(linea(mediaJornada, "Obra Social (3%)").detalle.baseLabel).toMatch(/de jornada completa/);
    expect(linea(completa, "Obra Social (3%)").detalle.baseLabel).not.toMatch(/jornada completa/);
  });

  it("media jornada: el 6% del empleador también", () => {
    expect(money(contribucion(mediaJornada).monto)).toBe(money(contribucion(completa).monto));
    expect(contribucion(mediaJornada).baseLabel).toMatch(/jornada completa/);
    expect(contribucion(completa).baseLabel).not.toMatch(/jornada completa/);
  });

  it("sólo cambia la obra social: jubilación, PAMI y bruto siguen la jornada", () => {
    expect(money(mediaJornada.totales.bruto * 2)).toBe(money(completa.totales.bruto));
    expect(money(linea(mediaJornada, "Jubilación").monto * 2)).toBe(money(linea(completa, "Jubilación").monto));
    expect(money(linea(mediaJornada, "Ley 19.032 PAMI").monto * 2)).toBe(money(linea(completa, "Ley 19.032 PAMI").monto));
  });

  it("las horas extras van como se cobraron, sin llevarlas a jornada completa", () => {
    const conExtras = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 24, horas_extras_50: 10 }), null, opciones());
    const extras = conExtras.totales.bruto - mediaJornada.totales.bruto;
    expect(extras).toBeGreaterThan(0);
    expect(money(linea(conExtras, "Obra Social (3%)").monto)).toBe(money(linea(completa, "Obra Social (3%)").monto + extras * 0.03));
  });

  it("vale también sin tabla, y el viejo interruptor de la tabla ya no la prorratea", () => {
    const sinTabla = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 24 }));
    expect(linea(sinTabla, "Obra Social (3%)").monto).toBe(linea(mediaJornada, "Obra Social (3%)").monto);
    const conInterruptorViejo = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 24 }), null, opciones({
      tablaContribuciones: conCriterios({ obra_social_trabajador_prorratea_jornada: true }),
    }));
    expect(linea(conInterruptorViejo, "Obra Social (3%)").monto).toBe(linea(mediaJornada, "Obra Social (3%)").monto);
    expect(mediaJornada.metodo.obraSocialJornadaCompleta).toBe(true);
  });

  it("en jornada completa no cambia nada (por eso los canarios no se mueven)", () => {
    expect(money(completa.totales.neto)).toBe(1166249.7);
    expect(money(linea(completa, "Obra Social (3%)").monto)).toBe(money((completa.totales.bruto + completa.totales.noRemunerativo) * 0.03));
  });
});

describe("los topes del art. 9 (Ley 24.241) en los aportes del trabajador", () => {
  it("una jornada mínima queda por debajo de la base mínima: se aporta sobre la mínima", () => {
    // Desde 20 horas ningún sueldo cargado queda abajo de la mínima: se prueba
    // con un básico inventado, bien bajo, en jornada completa.
    const bajo = { ...escala, categorias: { ...escala.categorias, "Vendedor B": { basico: 100000, no_remunerativo: 0 } } };
    const r = procesarRecibo(convenioComercio, bajo, entradas(), null, opciones());
    expect(r.totales.bruto).toBeLessThan(minima);
    expect(money(linea(r, "Jubilación").monto)).toBe(money(minima * 0.11));
    expect(money(linea(r, "Ley 19.032 PAMI").monto)).toBe(money(minima * 0.03));
    expect(money(linea(r, "Obra Social (3%)").monto)).toBe(money(minima * 0.03));
    expect(r.metodo.topeArt9).toEqual({ minima, maxima });
  });

  it("un sueldo por encima de la base máxima se topea", () => {
    // 300 horas extras al 50% llevan el bruto bien arriba del máximo.
    const r = procesarRecibo(convenioComercio, escala, entradas({ horas_extras_50: 300 }), null, opciones());
    expect(r.totales.bruto).toBeGreaterThan(maxima);
    expect(money(linea(r, "Jubilación").monto)).toBe(money(maxima * 0.11));
    expect(money(linea(r, "Obra Social (3%)").monto)).toBe(money(maxima * 0.03));
  });

  it("en el medio del rango no toca nada", () => {
    const r = procesarRecibo(convenioComercio, escala, entradas(), null, opciones());
    expect(money(linea(r, "Jubilación").monto)).toBe(money(r.totales.bruto * 0.11));
  });

  it("apagado desde la tabla: sobre la remuneración real, como antes", () => {
    const r = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 2 }), null, opciones({
      tablaContribuciones: conCriterios({ tope_art9_en_aportes: false }),
    }));
    expect(money(linea(r, "Jubilación").monto)).toBe(money(r.totales.bruto * 0.11));
    expect(r.metodo.topeArt9).toBeNull();
  });

  it("sin tabla no hay bases, así que no se aplica y `metodo` lo dice", () => {
    const r = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 2 }));
    expect(money(linea(r, "Jubilación").monto)).toBe(money(r.totales.bruto * 0.11));
    expect(r.metodo.topeArt9).toBeNull();
  });

  it("las contribuciones del empleador NO se topean: van sobre el bruto completo", () => {
    const r = procesarRecibo(convenioComercio, escala, entradas({ horas_extras_50: 300 }), null, opciones());
    expect(money(linea(r, "Obra social (contribución").monto)).toBe(money((r.totales.bruto + r.totales.noRemunerativo) * 0.06));
  });

  it("el neto sigue cerrando con los topes puestos", () => {
    // Desde 20 horas, el mínimo que acepta la calculadora (validacionEntradas.js).
    for (const horas of [20, 24, 36, 48]) {
      const r = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: horas }), null, opciones());
      expect(r.totales.neto).toBeCloseTo(r.totales.bruto + r.totales.noRemunerativo - r.totales.retenciones, 6);
      expect(r.totales.neto).toBeGreaterThan(0);
    }
  });
});

describe("el SAC tiene su propio tope: la mitad de la base máxima (decidido con el dueño el 5/10/2026)", () => {
  // Un básico inventado de $6 millones: el mes y el SAC pasan sus topes.
  const alto = { ...escala, categorias: { ...escala.categorias, "Vendedor B": { basico: 6000000, no_remunerativo: 0 } } };
  const r = procesarRecibo(convenioComercio, alto, entradas({ incluir_sac: true }), null, opciones());
  const sac = linea(r, "SAC").monto;

  it("se topea el mes y, aparte, el SAC", () => {
    expect(r.totales.bruto - sac).toBeGreaterThan(maxima);
    expect(sac).toBeGreaterThan(maxima / 2);
    expect(money(linea(r, "Jubilación").monto)).toBe(money(maxima * 1.5 * 0.11));
    expect(money(linea(r, "Obra Social (3%)").monto)).toBe(money(maxima * 1.5 * 0.03));
  });

  it("un SAC chico entra entero, aunque el mes esté topeado", () => {
    const chico = procesarRecibo(convenioComercio, escala, entradas({ horas_extras_50: 120, incluir_sac: true }), null, opciones());
    const sacChico = linea(chico, "SAC").monto;
    if (chico.totales.bruto - sacChico > maxima) {
      expect(money(linea(chico, "Jubilación").monto)).toBe(money((maxima + Math.min(sacChico, maxima / 2)) * 0.11));
    } else {
      expect(money(linea(chico, "Jubilación").monto)).toBe(money(chico.totales.bruto * 0.11));
    }
  });
});
