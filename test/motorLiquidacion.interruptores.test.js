// test/motorLiquidacion.interruptores.test.js
// Los dos criterios contables del lado del TRABAJADOR que el dueño decidió el
// 13/9/2026 y que viven en la tabla del período (para poder volver atrás desde
// /admin, sin desplegar):
//   - la obra social del trabajador se calcula sobre la remuneración de SU
//     jornada, prorrateada, como jubilación y PAMI y como Nacional Sistema;
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

describe("la obra social del trabajador se prorratea por la jornada", () => {
  const mediaJornada = entradas({ carga_horaria: 24 });
  const prorrateada = procesarRecibo(convenioComercio, escala, mediaJornada, null, opciones());
  const sinProrratear = procesarRecibo(convenioComercio, escala, mediaJornada, null, opciones({
    tablaContribuciones: conCriterios({ obra_social_trabajador_prorratea_jornada: false }),
  }));

  it("encendido (el default): 3% de la remuneración de la jornada del puesto", () => {
    const base = prorrateada.totales.bruto + prorrateada.totales.noRemunerativo;
    expect(money(linea(prorrateada, "Obra Social (3%)").monto)).toBe(money(base * 0.03));
    expect(prorrateada.metodo.obraSocialProrrateada).toBe(true);
  });

  it("apagado desde la tabla: sobre la remuneración de jornada completa, como antes", () => {
    // Comercio no tiene sumas no remunerativas, así que la base "de jornada
    // completa" es exactamente el doble de la de media jornada.
    expect(money(linea(sinProrratear, "Obra Social (3%)").monto)).toBe(money(linea(prorrateada, "Obra Social (3%)").monto * 2));
    expect(sinProrratear.metodo.obraSocialProrrateada).toBe(false);
  });

  it("sólo cambia la obra social: jubilación, PAMI y bruto son iguales", () => {
    expect(linea(sinProrratear, "Jubilación").monto).toBe(linea(prorrateada, "Jubilación").monto);
    expect(linea(sinProrratear, "Ley 19.032 PAMI").monto).toBe(linea(prorrateada, "Ley 19.032 PAMI").monto);
    expect(sinProrratear.totales.bruto).toBe(prorrateada.totales.bruto);
  });

  it("también vale sin tabla: el default es el default", () => {
    const sinTabla = procesarRecibo(convenioComercio, escala, mediaJornada);
    expect(linea(sinTabla, "Obra Social (3%)").monto).toBe(linea(prorrateada, "Obra Social (3%)").monto);
    expect(sinTabla.metodo.obraSocialProrrateada).toBe(true);
  });

  it("en jornada completa no cambia nada (por eso los canarios no se mueven)", () => {
    const con = procesarRecibo(convenioComercio, escala, entradas(), null, opciones());
    const off = procesarRecibo(convenioComercio, escala, entradas(), null, opciones({
      tablaContribuciones: conCriterios({ obra_social_trabajador_prorratea_jornada: false }),
    }));
    expect(con.totales.neto).toBe(off.totales.neto);
    expect(money(con.totales.neto)).toBe(1166249.7);
  });
});

describe("los topes del art. 9 (Ley 24.241) en los aportes del trabajador", () => {
  it("una jornada mínima queda por debajo de la base mínima: se aporta sobre la mínima", () => {
    const r = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: 2 }), null, opciones());
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
    for (const horas of [2, 8, 24, 48]) {
      const r = procesarRecibo(convenioComercio, escala, entradas({ carga_horaria: horas }), null, opciones());
      expect(r.totales.neto).toBeCloseTo(r.totales.bruto + r.totales.noRemunerativo - r.totales.retenciones, 6);
      expect(r.totales.neto).toBeGreaterThan(0);
    }
  });
});
