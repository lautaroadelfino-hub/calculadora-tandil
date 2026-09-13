// test/motorLiquidacion.sinIncidencia.test.js
// Dos cosas que el modelo no podía expresar hasta el 13/9/2026 y que los
// acuerdos de julio 2026 pusieron sobre la mesa:
//
//  1. Una SEGUNDA suma no remunerativa, sin incidencia: no genera antigüedad,
//     presentismo ni adicionales, y no entra en ninguna base (obra social,
//     sindicales, contribuciones). Va derecho al neto. Es la "Asignación
//     Extraordinaria por Única Vez – Revisión 2026" de Comercio ($25.000 en
//     julio y agosto), que convive con los $120.000 que SÍ generan adicionales.
//  2. Una retención sindical sobre la remuneración HABITUAL (sin horas extras,
//     SAC ni vacaciones): la contribución solidaria del 2% de UTHGRA, que por el
//     tope del Decreto 612/26 se calcula sobre los conceptos mensuales normales
//     y habituales.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import semilla from "../data/contribuciones.seed.json";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import convenioGastro from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalasGastro from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));
const opciones = { periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07" };

describe("la suma no remunerativa sin incidencia", () => {
  // La escala de julio 2026 de Comercio, como quedó cargada en Firestore.
  const conAsignacion = {
    mes_vigencia: "Julio 2026",
    nombre_sin_incidencia: "Asignación Extraordinaria por Única Vez – Revisión 2026",
    categorias: { "Vendedor B": { basico: 1177947, no_remunerativo: 120000, no_remunerativo_sin_incidencia: 25000 } },
  };
  const sinAsignacion = {
    mes_vigencia: "Julio 2026",
    categorias: { "Vendedor B": { basico: 1177947, no_remunerativo: 120000 } },
  };
  const entradas = (o = {}) => ({
    categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5,
    horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: true, ...o,
  });
  const con = procesarRecibo(convenioComercio, conAsignacion, entradas(), null, opciones);
  const sin = procesarRecibo(convenioComercio, sinAsignacion, entradas(), null, opciones);

  it("aparece como línea no remunerativa con el nombre que trae la escala", () => {
    const l = linea(con, "Asignación Extraordinaria");
    expect(l).toBeDefined();
    expect(l.tipo).toBe("no_remunerativo");
    expect(l.monto).toBe(25000);
    expect(l.sinIncidencia).toBe(true);
  });

  it("suma al neto exactamente lo que vale, y a nada más", () => {
    expect(money(con.totales.neto - sin.totales.neto)).toBe(25000);
    expect(money(con.totales.noRemunerativo - sin.totales.noRemunerativo)).toBe(25000);
    expect(con.totales.bruto).toBe(sin.totales.bruto);
    // Ni una retención se mueve: ni obra social, ni sindicales.
    expect(con.totales.retenciones).toBe(sin.totales.retenciones);
    expect(linea(con, "Obra Social (3%)").monto).toBe(linea(sin, "Obra Social (3%)").monto);
    expect(linea(con, "Aporte FAECyS").monto).toBe(linea(sin, "Aporte FAECyS").monto);
    expect(linea(con, "Cuota Afiliado").monto).toBe(linea(sin, "Cuota Afiliado").monto);
  });

  it("no genera antigüedad ni presentismo: los $120.000 sí, los $25.000 no", () => {
    expect(linea(con, "Antigüedad No Remunerativa").monto).toBe(linea(sin, "Antigüedad No Remunerativa").monto);
    expect(money(linea(con, "Antigüedad No Remunerativa").monto)).toBe(6000); // 5% de 120.000
    expect(linea(con, "Presentismo No Remunerativo").monto).toBe(linea(sin, "Presentismo No Remunerativo").monto);
  });

  it("no paga contribuciones del empleador, pero sí es costo laboral", () => {
    expect(con.totales.contribuciones).toBe(sin.totales.contribuciones);
    expect(linea(con, "Obra social (contribución").monto).toBe(linea(sin, "Obra social (contribución").monto);
    expect(money(con.totales.costoEmpleador - sin.totales.costoEmpleador)).toBe(25000);
  });

  it("se prorratea por la jornada, como todo lo de la escala", () => {
    const media = procesarRecibo(convenioComercio, conAsignacion, entradas({ carga_horaria: 24 }), null, opciones);
    expect(linea(media, "Asignación Extraordinaria").monto).toBe(12500);
  });

  it("sin nombre en la escala, usa uno genérico; en cero o ausente, no aparece", () => {
    const sinNombre = { ...conAsignacion, nombre_sin_incidencia: undefined };
    expect(linea(procesarRecibo(convenioComercio, sinNombre, entradas(), null, opciones), "Suma no remunerativa sin incidencia")).toBeDefined();
    const enCero = { categorias: { "Vendedor B": { basico: 1177947, no_remunerativo: 120000, no_remunerativo_sin_incidencia: 0 } } };
    expect(procesarRecibo(convenioComercio, enCero, entradas()).detalle.some((l) => l.sinIncidencia)).toBe(false);
    expect(sin.detalle.some((l) => l.sinIncidencia)).toBe(false);
  });

  it("el neto sigue cerrando y `metodo` lo declara", () => {
    expect(con.totales.neto).toBeCloseTo(con.totales.bruto + con.totales.noRemunerativo - con.totales.retenciones, 6);
    expect(con.metodo.noRemunerativoSinIncidencia).toBe(25000);
    expect(sin.metodo.noRemunerativoSinIncidencia).toBe(0);
  });
});

describe("una retención sobre la remuneración habitual", () => {
  // Gastronómicos con la contribución solidaria del acuerdo de julio 2026.
  const conSolidaria = {
    ...convenioGastro,
    reglas_calculo: {
      ...convenioGastro.reglas_calculo,
      retenciones_sindicales: {
        ...convenioGastro.reglas_calculo.retenciones_sindicales,
        solidaria: {
          label: "Contribución Solidaria UTHGRA (2%)",
          porcentaje: 0.02,
          base: "remunerativo_habitual",
          condicion: "solo_no_afiliado",
        },
      },
    },
  };
  const escala = escalasGastro["2026-06"];
  const entradas = (o = {}) => ({
    zona: "Escala A", categoria: "Nivel 6 (Mozo - Maître)", carga_horaria: 48, antiguedad_años: 5,
    horas_extras_50: 20, horas_extras_100: 0, incluir_sac: true, afiliado_sindicato: false, ...o,
  });

  it("se calcula sin las horas extras ni el SAC, aunque el bruto los tenga", () => {
    const r = procesarRecibo(conSolidaria, escala, entradas());
    const habitual =
      linea(r, "Sueldo Básico").monto + linea(r, "Antigüedad").monto +
      linea(r, "Complemento de Servicio").monto + linea(r, "Asistencia Perfecta").monto;
    expect(money(linea(r, "Contribución Solidaria").monto)).toBe(money(habitual * 0.02));
    expect(linea(r, "Contribución Solidaria").monto).toBeLessThan(r.totales.bruto * 0.02);
    expect(linea(r, "Horas Extras 50%")).toBeDefined();
    expect(linea(r, "SAC")).toBeDefined();
  });

  it("al afiliado no se le retiene", () => {
    const r = procesarRecibo(conSolidaria, escala, entradas({ afiliado_sindicato: true }));
    expect(linea(r, "Contribución Solidaria")).toBeUndefined();
  });

  it("una base que el motor no conoce frena, en vez de caer callada al remunerativo", () => {
    const rota = JSON.parse(JSON.stringify(conSolidaria));
    rota.reglas_calculo.retenciones_sindicales.solidaria.base = "bruto_total";
    expect(() => procesarRecibo(rota, escala, entradas())).toThrow(/"bruto_total", que el motor no conoce/);
  });
});
