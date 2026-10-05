// test/motorLiquidacion.gananciasSac.test.js
// El SAC en Ganancias (RG 5531/2024), decidido con el dueño el 5/10/2026: la
// persona elige entre sumar 1/12 cada mes (por defecto) o el SAC entero cuando
// se cobra.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import paramsGanancias from "../data/ganancias.seed.json";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const escala = escalasComercio["2026-07"];
// Con 250 horas extras el sueldo paga Ganancias con la plantilla de referencia.
const entradas = (o = {}) => ({
  categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5,
  horas_extras_50: 250, horas_extras_100: 0, afiliado_sindicato: false, ...o,
});
const calcular = (o) => procesarRecibo(convenioComercio, escala, entradas(o), paramsGanancias);
const retencionesSinGanancias = (r) => r.totales.retenciones - (r.ganancias?.impuesto || 0);

describe("SAC en Ganancias", () => {
  it("por defecto suma 1/12 cada mes, al bruto y a los aportes", () => {
    const r = calcular();
    expect(r.ganancias.impuesto).toBeGreaterThan(0);
    expect(money(r.ganancias.gananciaNeta)).toBe(money(((r.totales.bruto - retencionesSinGanancias(r)) * 13) / 12));
    expect(r.metodo.gananciasSac).toBe("doceava");
  });

  it("con doceava, el mes que se cobra el SAC no suma el SAC entero", () => {
    // Casi igual: los descuentos de monto fijo se reparten en proporción.
    const conSac = calcular({ incluir_sac: true }).ganancias.impuesto;
    expect(Math.abs(conSac - calcular().ganancias.impuesto)).toBeLessThan(10);
  });

  it("al cobrarlo: sin SAC en el mes no suma nada", () => {
    const r = calcular({ ganancias_sac: "al_cobrar" });
    expect(money(r.ganancias.gananciaNeta)).toBe(money(r.totales.bruto - retencionesSinGanancias(r)));
    expect(r.ganancias.impuesto).toBeLessThan(calcular().ganancias.impuesto);
  });

  it("al cobrarlo: el mes del SAC lo suma entero", () => {
    const r = calcular({ ganancias_sac: "al_cobrar", incluir_sac: true });
    expect(money(r.ganancias.gananciaNeta)).toBe(money(r.totales.bruto - retencionesSinGanancias(r)));
    expect(r.ganancias.impuesto).toBeGreaterThan(calcular({ ganancias_sac: "al_cobrar" }).ganancias.impuesto);
  });
});
