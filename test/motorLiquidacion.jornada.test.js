// test/motorLiquidacion.jornada.test.js
//
// La jornada completa del convenio dejó de estar clavada en 48 horas.
//
// POR QUÉ IMPORTA: la escala salarial de un convenio está publicada PARA SU
// jornada completa. Si un CCT tiene jornada de 44 horas, su básico de escala ya
// es el de 44 horas: alguien que trabaje esas 44 horas cobra el básico entero.
// Mientras el motor suponía 48, a esa persona le prorrateaba 44/48 y le pagaba
// un 8,3% de menos, sin ningún aviso.
//
// El mismo 200 del divisor de horas extras tampoco era universal: el motor
// gastronómico que se borró en julio de 2026 ya lo tenía como parámetro.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import { POR_DEFECTO } from "../lib/vocabularioConvenios.js";
import convenio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalas from "./fixtures/comercio-cct-130-75.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, t) => r.detalle.find((l) => l.concepto.includes(t));

const escala = escalas["2026-07"];
const BASICO_DE_ESCALA = 1273746; // Vendedor B, julio 2026

const conJornada = (jornada) => {
  const c = JSON.parse(JSON.stringify(convenio));
  if (jornada) c.reglas_calculo.jornada = jornada;
  else delete c.reglas_calculo.jornada;
  return c;
};

const entradas = (o = {}) => ({
  categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 0,
  horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false, ...o,
});

describe("un convenio de jornada reducida cobra su escala entera", () => {
  it("con 44 horas declaradas, quien trabaja 44 cobra el básico completo", () => {
    const r = procesarRecibo(
      conJornada({ horas_semanales_completas: 44 }),
      escala,
      entradas({ carga_horaria: 44 })
    );
    expect(money(linea(r, "Sueldo Básico").monto)).toBe(BASICO_DE_ESCALA);
  });

  it("y sin declararla, al mismo trabajador se le pagaba 44/48: un 8,3% menos", () => {
    // Este es exactamente el error que se corrige.
    const r = procesarRecibo(conJornada(null), escala, entradas({ carga_horaria: 44 }));
    expect(money(linea(r, "Sueldo Básico").monto)).toBe(money(BASICO_DE_ESCALA * 44 / 48));
    expect(linea(r, "Sueldo Básico").monto).toBeLessThan(BASICO_DE_ESCALA);
  });

  it("media jornada sigue siendo media jornada, sea cual sea la referencia", () => {
    const de44 = procesarRecibo(
      conJornada({ horas_semanales_completas: 44 }), escala, entradas({ carga_horaria: 22 }));
    const de48 = procesarRecibo(
      conJornada({ horas_semanales_completas: 48 }), escala, entradas({ carga_horaria: 24 }));
    expect(money(linea(de44, "Sueldo Básico").monto)).toBe(money(BASICO_DE_ESCALA / 2));
    expect(money(linea(de48, "Sueldo Básico").monto)).toBe(money(BASICO_DE_ESCALA / 2));
  });

  it("si no se informa la jornada del puesto, se asume la completa del convenio", () => {
    const r = procesarRecibo(
      conJornada({ horas_semanales_completas: 36 }), escala, entradas({ carga_horaria: undefined }));
    expect(money(linea(r, "Sueldo Básico").monto)).toBe(BASICO_DE_ESCALA);
  });
});

describe("el divisor de horas extras también sale del convenio", () => {
  const base = entradas({ horas_extras_50: 10 });

  // El valor de la hora sale de básico + antigüedad + presentismo + adicionales,
  // no sólo del básico. Por eso se compara la RELACIÓN entre dos divisores, que
  // es lo que el cambio tiene que garantizar, y no un número calculado a mano
  // repitiendo la fórmula del motor (si la repito, el test no prueba nada).
  const extraCon = (jornada) =>
    linea(procesarRecibo(conJornada(jornada), escala, base), "Horas Extras 50%").monto;

  it("declarar el divisor por defecto da exactamente lo mismo que no declararlo", () => {
    expect(money(extraCon({ horas_semanales_completas: 48, divisor_horas_mensuales: 200 })))
      .toBe(money(extraCon(null)));
  });

  it("un divisor más chico hace la hora proporcionalmente más cara", () => {
    const con176 = extraCon({ horas_semanales_completas: 48, divisor_horas_mensuales: 176 });
    const con200 = extraCon(null);
    expect(con176).toBeGreaterThan(con200);
    expect(money(con176)).toBe(money(con200 * (200 / 176)));
  });
});

describe("el motor frena en vez de dividir por cero", () => {
  it("una jornada completa de cero horas", () => {
    expect(() =>
      procesarRecibo(conJornada({ horas_semanales_completas: 0 }), escala, entradas())
    ).toThrow(/cero horas semanales/);
  });

  it("un divisor de horas en cero, sólo si de verdad hay horas extras", () => {
    const roto = conJornada({ horas_semanales_completas: 48, divisor_horas_mensuales: 0 });
    expect(() => procesarRecibo(roto, escala, entradas({ horas_extras_50: 5 }))).toThrow(/divisor de horas/);
    // Sin horas extras el divisor no se usa, así que no tiene por qué molestar.
    expect(() => procesarRecibo(roto, escala, entradas())).not.toThrow();
  });
});

describe("el recibo dice con qué supuestos se calculó", () => {
  it("informa la jornada usada y si la declaró el convenio", () => {
    const propia = procesarRecibo(
      conJornada({ horas_semanales_completas: 44, divisor_horas_mensuales: 176 }),
      escala, entradas({ carga_horaria: 22 }));
    expect(propia.metodo).toMatchObject({
      jornadaCompletaSemanal: 44,
      jornadaDelPuesto: 22,
      divisorHorasMensuales: 176,
      laDeclaraElConvenio: true,
    });
  });

  it("y avisa cuando usó los valores por defecto", () => {
    const r = procesarRecibo(conJornada(null), escala, entradas());
    expect(r.metodo.laDeclaraElConvenio).toBe(false);
    expect(r.metodo.jornadaCompletaSemanal).toBe(POR_DEFECTO.jornada.horas_semanales_completas);
    expect(r.metodo.divisorHorasMensuales).toBe(POR_DEFECTO.jornada.divisor_horas_mensuales);
  });
});

describe("los convenios ya cargados no cambian", () => {
  it("el canario de Comercio sigue clavado", () => {
    const r = procesarRecibo(convenio, escala, entradas({ antiguedad_años: 5 }));
    expect(money(r.totales.neto)).toBe(1166249.7);
  });
});
