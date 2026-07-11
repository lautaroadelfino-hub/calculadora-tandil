// test/motorLiquidacion.test.js
// Pruebas del motor de liquidación con datos REALES de Firestore
// (capturados en test/fixtures/). Si un cambio en el motor altera
// alguno de estos números, la prueba falla y avisa antes de publicar.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";
import paramsGanancias from "../data/ganancias.seed.json";

// Redondea a 2 decimales para comparar pesos sin ruido de coma flotante.
const money = (n) => Math.round(n * 100) / 100;

// Arma el objeto de entrada del usuario con valores por defecto sensatos.
function inputs(overrides = {}) {
  return {
    categoria: "Administrativo A",
    carga_horaria: 48,
    antiguedad_años: 0,
    horas_extras_50: 0,
    horas_extras_100: 0,
    afiliado_sindicato: false,
    ...overrides,
  };
}

// Busca una línea del recibo por su concepto (texto parcial).
function linea(recibo, texto) {
  return recibo.detalle.find((l) => l.concepto.includes(texto));
}

describe("Comercio CCT 130/75 — caso patrón (regresión)", () => {
  // Caso verificado a mano en la app el 2026-07:
  // Vendedor B, 5 años de antigüedad, jornada 48hs, no afiliado, julio 2026.
  const recibo = procesarRecibo(
    convenioComercio,
    escalasComercio["2026-07"],
    inputs({ categoria: "Vendedor B", antiguedad_años: 5 })
  );

  it("sueldo básico según escala de julio 2026", () => {
    expect(money(linea(recibo, "Sueldo Básico").monto)).toBe(1273746);
  });

  it("antigüedad = 1% por año sobre el básico (5 años)", () => {
    expect(money(linea(recibo, "Antigüedad").monto)).toBe(63687.3);
  });

  it("presentismo = 8,333% sobre básico + antigüedad", () => {
    expect(money(linea(recibo, "Presentismo").monto)).toBe(111448.32);
  });

  it("total remunerativo", () => {
    expect(money(recibo.totales.bruto)).toBe(1448881.62);
  });

  it("total de retenciones", () => {
    expect(money(recibo.totales.retenciones)).toBe(282631.92);
  });

  it("NETO A COBRAR", () => {
    expect(money(recibo.totales.neto)).toBe(1166249.7);
  });
});

describe("Comercio — retenciones sindicales", () => {
  it("NO afiliado: aplica aporte solidario (2%), NO la cuota de afiliado", () => {
    const recibo = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B", afiliado_sindicato: false })
    );
    expect(linea(recibo, "Solidario")).toBeTruthy();
    expect(linea(recibo, "Afiliado")).toBeFalsy();
  });

  it("afiliado: aplica la cuota de afiliado (2%)", () => {
    const recibo = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B", afiliado_sindicato: true })
    );
    expect(linea(recibo, "Afiliado")).toBeTruthy();
  });

  it("siempre aplica FAECyS (0,5%) y el aporte fijo OSECAC ($100)", () => {
    const recibo = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Administrativo A" })
    );
    expect(linea(recibo, "FAECyS")).toBeTruthy();
    expect(money(linea(recibo, "OSECAC").monto)).toBe(100);
  });
});

describe("Comercio — prorrateo por jornada reducida", () => {
  it("media jornada (24hs) da la mitad del básico que jornada completa", () => {
    const completa = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B", carga_horaria: 48 })
    );
    const media = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B", carga_horaria: 24 })
    );
    expect(money(linea(media, "Sueldo Básico").monto)).toBe(
      money(linea(completa, "Sueldo Básico").monto / 2)
    );
  });
});

describe("Comercio — SAC (medio aguinaldo)", () => {
  const sinSac = procesarRecibo(
    convenioComercio,
    escalasComercio["2026-07"],
    inputs({ categoria: "Vendedor B", antiguedad_años: 5 })
  );
  const conSac = procesarRecibo(
    convenioComercio,
    escalasComercio["2026-07"],
    inputs({ categoria: "Vendedor B", antiguedad_años: 5, incluir_sac: true })
  );

  it("agrega la línea de SAC solo cuando se activa", () => {
    expect(linea(sinSac, "SAC")).toBeFalsy();
    expect(linea(conSac, "SAC")).toBeTruthy();
  });

  it("el SAC es el 50% de la remuneración habitual (básico+antig+presentismo)", () => {
    const habitual =
      linea(conSac, "Sueldo Básico").monto +
      linea(conSac, "Antigüedad").monto +
      linea(conSac, "Presentismo").monto;
    expect(money(linea(conSac, "SAC").monto)).toBe(money(habitual * 0.5));
  });

  it("con SAC el bruto y el neto son mayores", () => {
    expect(conSac.totales.bruto).toBeGreaterThan(sinSac.totales.bruto);
    expect(conSac.totales.neto).toBeGreaterThan(sinSac.totales.neto);
  });
});

describe("Comercio — plus vacacional", () => {
  it("agrega el plus solo si se informan días de vacaciones", () => {
    const sin = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B" })
    );
    const con = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B", dias_vacaciones: 14 })
    );
    expect(linea(sin, "Plus vacacional")).toBeFalsy();
    expect(linea(con, "Plus vacacional")).toBeTruthy();
  });

  it("el plus por día equivale a base/150", () => {
    const con = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B", antiguedad_años: 5, dias_vacaciones: 15 })
    );
    const habitual =
      linea(con, "Sueldo Básico").monto +
      linea(con, "Antigüedad").monto +
      linea(con, "Presentismo").monto;
    expect(money(linea(con, "Plus vacacional").monto)).toBe(money((habitual / 150) * 15));
  });
});

describe("Comercio — Impuesto a las Ganancias (integración)", () => {
  it("sin parámetros de Ganancias, no se calcula", () => {
    const r = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B" })
      // sin 4º argumento (paramsGanancias)
    );
    expect(r.ganancias).toBeNull();
    expect(linea(r, "Ganancias")).toBeFalsy();
  });

  it("con parámetros se calcula AUTOMÁTICAMENTE (sin tilde); sueldo de comercio queda debajo del mínimo -> sin retención", () => {
    const r = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor B" }),
      paramsGanancias
    );
    // Se evaluó (ganancias no es null) pero el sueldo no alcanza el mínimo.
    expect(r.ganancias).toBeTruthy();
    expect(linea(r, "Ganancias")).toBeFalsy();
  });
});

describe("Comercio — validaciones de borde", () => {
  it("categoría inexistente lanza un error claro", () => {
    expect(() =>
      procesarRecibo(
        convenioComercio,
        escalasComercio["2026-07"],
        inputs({ categoria: "Cargo Inventado" })
      )
    ).toThrow();
  });

  it("el neto nunca supera al bruto + no remunerativo", () => {
    const r = procesarRecibo(
      convenioComercio,
      escalasComercio["2026-07"],
      inputs({ categoria: "Vendedor D", antiguedad_años: 10 })
    );
    expect(r.totales.neto).toBeLessThanOrEqual(
      r.totales.bruto + r.totales.noRemunerativo
    );
  });
});
