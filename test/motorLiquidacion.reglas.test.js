// test/motorLiquidacion.reglas.test.js
// Reglas de cálculo que el panel de administración podía guardar pero que el
// motor ignoraba o resolvía mal. Cada bloque documenta qué pasaba antes.

import { describe, it, expect } from "vitest";
import { procesarRecibo, porcentajeAntiguedad } from "../lib/motorLiquidacion.js";
import convenioGastro from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalasGastro from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, texto) => r.detalle.find((l) => l.concepto.includes(texto));

const entradas = (o = {}) => ({
  zona: "Escala A",
  categoria: "Nivel 6 (Mozo - Maître)",
  carga_horaria: 48,
  antiguedad_años: 0,
  horas_extras_50: 0,
  horas_extras_100: 0,
  afiliado_sindicato: false,
  ...o,
});

// Copia profunda del convenio real, para probar variantes sin tocar el fixture.
const conVariante = (cambios) => {
  const c = JSON.parse(JSON.stringify(convenioGastro));
  c.reglas_calculo = { ...c.reglas_calculo, ...cambios };
  return c;
};

// Los tramos del motor anterior de gastronómicos (lib/calculoFEHGRA.js,
// recuperados con `git show b1f7b31^:lib/calculoFEHGRA.js`).
const TRAMOS_FEHGRA = [
  { desde_años: 1, porcentaje: 0.01 },
  { desde_años: 3, porcentaje: 0.02 },
  { desde_años: 5, porcentaje: 0.04 },
  { desde_años: 7, porcentaje: 0.05 },
  { desde_años: 9, porcentaje: 0.06 },
  { desde_años: 11, porcentaje: 0.07 },
  { desde_años: 13, porcentaje: 0.08 },
  { desde_años: 15, porcentaje: 0.1 },
  { desde_años: 17, porcentaje: 0.12 },
  { desde_años: 19, porcentaje: 0.14 },
];

describe("antigüedad por tramos", () => {
  it("el porcentaje del tramo es el TOTAL, no se multiplica por los años", () => {
    const regla = { modo: "tramos", tramos: TRAMOS_FEHGRA };
    expect(porcentajeAntiguedad(regla, 0)).toBe(0);
    expect(porcentajeAntiguedad(regla, 1)).toBeCloseTo(0.01, 8);
    expect(porcentajeAntiguedad(regla, 5)).toBeCloseTo(0.04, 8);
    expect(porcentajeAntiguedad(regla, 6)).toBeCloseTo(0.04, 8);
    expect(porcentajeAntiguedad(regla, 20)).toBeCloseTo(0.14, 8);
  });

  it("no le importa el orden en que estén cargados los tramos", () => {
    const desordenados = [...TRAMOS_FEHGRA].reverse();
    expect(porcentajeAntiguedad({ modo: "tramos", tramos: desordenados }, 10)).toBeCloseTo(0.06, 8);
  });

  it("un año por debajo del primer tramo no paga antigüedad", () => {
    expect(porcentajeAntiguedad({ modo: "tramos", tramos: TRAMOS_FEHGRA }, 0.5)).toBe(0);
  });

  it("cuánta plata cambia en gastronómicos: a los 5 años hoy paga 5% y debería pagar 4%", () => {
    const lineal = procesarRecibo(convenioGastro, escalasGastro["2026-06"], entradas({ antiguedad_años: 5 }));
    const porTramos = procesarRecibo(
      conVariante({ antiguedad: { aplica_sobre: "basico", modo: "tramos", tramos: TRAMOS_FEHGRA } }),
      escalasGastro["2026-06"],
      entradas({ antiguedad_años: 5 })
    );
    expect(money(linea(lineal, "Antigüedad").monto)).toBe(68834.05);
    expect(money(linea(porTramos, "Antigüedad").monto)).toBe(55067.24);
    // La diferencia se amplifica con la antigüedad: a los 20 años sería 14% vs 20%.
    expect(money(porTramos.totales.neto)).toBeLessThan(money(lineal.totales.neto));
  });

  it("avisa si el convenio dice 'tramos' pero no cargó ninguno", () => {
    expect(() =>
      procesarRecibo(
        conVariante({ antiguedad: { modo: "tramos", tramos: [] } }),
        escalasGastro["2026-06"],
        entradas({ antiguedad_años: 5 })
      )
    ).toThrow(/ningun tramo cargado/i);
  });
});

describe("aplica_sobre dejó de ser decorativo", () => {
  const base = { porcentaje: 0.1 };

  it("presentismo sobre básico + antigüedad (el default de siempre)", () => {
    const r = procesarRecibo(
      conVariante({ presentismo: { ...base, aplica_sobre: "basico_mas_antiguedad" } }),
      escalasGastro["2026-06"],
      entradas({ antiguedad_años: 5 })
    );
    // 10% de (1376681 + 68834.05)
    expect(money(linea(r, "Presentismo").monto)).toBe(144551.51);
  });

  it("presentismo SÓLO sobre el básico: antes se guardaba así y se liquidaba mal", () => {
    const r = procesarRecibo(
      conVariante({ presentismo: { ...base, aplica_sobre: "basico" } }),
      escalasGastro["2026-06"],
      entradas({ antiguedad_años: 5 })
    );
    expect(money(linea(r, "Presentismo").monto)).toBe(137668.1);
  });

  it("sin aplica_sobre se comporta como antes, así ningún convenio cargado cambia", () => {
    const conCampo = procesarRecibo(
      conVariante({ presentismo: { ...base, aplica_sobre: "basico_mas_antiguedad" } }),
      escalasGastro["2026-06"], entradas({ antiguedad_años: 5 }));
    const sinCampo = procesarRecibo(
      conVariante({ presentismo: { ...base } }),
      escalasGastro["2026-06"], entradas({ antiguedad_años: 5 }));
    expect(money(linea(sinCampo, "Presentismo").monto)).toBe(money(linea(conCampo, "Presentismo").monto));
  });

  it("un aplica_sobre que el motor no conoce se denuncia en vez de calcular cualquier cosa", () => {
    expect(() =>
      procesarRecibo(
        conVariante({ presentismo: { ...base, aplica_sobre: "sobre_la_luna" } }),
        escalasGastro["2026-06"],
        entradas()
      )
    ).toThrow(/sobre_la_luna/);
  });

  it("los adicionales remunerativos también lo respetan", () => {
    const sobreBasico = procesarRecibo(convenioGastro, escalasGastro["2026-06"], entradas({ antiguedad_años: 5 }));
    const conAntiguedad = procesarRecibo(
      conVariante({
        adicionales_remunerativos: {
          complemento_servicio: { porcentaje: 0.12, label: "Complemento", aplica_sobre: "basico_mas_antiguedad" },
        },
      }),
      escalasGastro["2026-06"],
      entradas({ antiguedad_años: 5 })
    );
    expect(money(linea(conAntiguedad, "Complemento").monto)).toBeGreaterThan(
      money(linea(sobreBasico, "Complemento de Servicio").monto)
    );
  });
});

describe("los fallbacks que convertían un convenio incompleto en un Comercio disfrazado", () => {
  it("una regla de antigüedad sin porcentaje ya no aplica 1% por su cuenta", () => {
    expect(() =>
      procesarRecibo(
        conVariante({ antiguedad: { aplica_sobre: "basico" } }),
        escalasGastro["2026-06"],
        entradas({ antiguedad_años: 5 })
      )
    ).toThrow(/porcentaje por anio/i);
  });

  it("una regla de presentismo sin porcentaje ya no aplica 8,333% por su cuenta", () => {
    expect(() =>
      procesarRecibo(conVariante({ presentismo: {} }), escalasGastro["2026-06"], entradas())
    ).toThrow(/porcentaje/i);
  });
});

describe("la retención que reemplaza la obra social", () => {
  const conRetencion = (id, extra) =>
    conVariante({
      retenciones_sindicales: {
        [id]: { label: "Obra social del gremio", porcentaje: 0.03, base: "remunerativo", ...extra },
      },
    });

  it("con el flag explícito no se suma dos veces", () => {
    const r = procesarRecibo(
      conRetencion("obra_social_del_gremio", { reemplaza_obra_social: true }),
      escalasGastro["2026-06"],
      entradas()
    );
    expect(linea(r, "Obra social del gremio")).toBeUndefined();
  });

  it("el id mágico viejo se sigue respetando, para no romper lo ya cargado", () => {
    const r = procesarRecibo(conRetencion("obra_social_extra", {}), escalasGastro["2026-06"], entradas());
    expect(linea(r, "Obra social del gremio")).toBeUndefined();
  });

  it("sin flag ni id mágico, se cobra como cualquier retención", () => {
    const r = procesarRecibo(conRetencion("obra_social_del_gremio", {}), escalasGastro["2026-06"], entradas());
    expect(linea(r, "Obra social del gremio")).toBeDefined();
  });
});

describe("detalles del recibo", () => {
  it('un adicional sin nombre ya no imprime "undefined s/ No Remunerativo"', () => {
    const r = procesarRecibo(
      conVariante({ adicionales_remunerativos: { premio_x: { porcentaje: 0.05 } } }),
      escalasGastro["2026-06"],
      entradas()
    );
    const nr = r.detalle.find((l) => l.concepto.includes("s/ No Remunerativo") && l.concepto.includes("premio_x"));
    expect(nr).toBeDefined();
    expect(r.detalle.some((l) => l.concepto.includes("undefined"))).toBe(false);
  });
});
