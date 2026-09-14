// test/motorLiquidacion.detalle.test.js
// Cada línea del recibo dice de dónde sale (Etapa 2 de la auditoría en frío
// del 13/9/2026). El `detalle` es la cuenta; explicarLinea() lo vuelve frase.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import { explicarLinea } from "../lib/explicarLinea.js";
import { resumenPorRubro } from "../lib/calculoContribuciones.js";
import semilla from "../data/contribuciones.seed.json";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";
import gastro from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalasGastro from "./fixtures/gastronomicos-cct-389-04.escalas.json";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalasCamioneros from "./fixtures/camioneros-cct-40-89.escalas.json";

const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));
const opciones = { periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07" };

describe("Comercio: el detalle de cada línea", () => {
  // La escala de julio 2026 tal como quedó en producción: básico más una suma
  // no remunerativa con incidencia (la del fixture congelado no la trae).
  const escalaJulio = { mes_vigencia: "Julio 2026", categorias: { "Vendedor B": { basico: 1177947, no_remunerativo: 120000 } } };
  const r = procesarRecibo(comercio, escalaJulio, {
    categoria: "Vendedor B", carga_horaria: 24, antiguedad_años: 5, horas_extras_50: 10, horas_extras_100: 0,
    afiliado_sindicato: true, incluir_sac: true, dias_vacaciones: 7,
  }, null, opciones);

  it("el básico dice la escala y el prorrateo", () => {
    const d = linea(r, "Sueldo Básico").detalle;
    expect(d).toMatchObject({ tipo: "escala", factor: 0.5, horas: 24, horasCompletas: 48 });
    expect(explicarLinea(linea(r, "Sueldo Básico"))).toMatch(/Escala del convenio: \$.* × 24\/48 hs/);
  });

  it("la antigüedad lineal dice tanto por año × años sobre el básico", () => {
    const l = linea(r, "Antigüedad");
    expect(l.detalle).toMatchObject({ tipo: "porcentaje", alicuota: 0.05, porAño: 0.01, años: 5, baseLabel: "el básico" });
    expect(l.detalle.base).toBeCloseTo(linea(r, "Sueldo Básico").monto, 6);
    expect(explicarLinea(l)).toBe(`1% × 5 años = 5% sobre $${linea(r, "Sueldo Básico").monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (el básico)`);
  });

  it("las horas extras dicen valor hora, recargo y divisor", () => {
    const l = linea(r, "Horas Extras 50%");
    expect(l.detalle).toMatchObject({ tipo: "hora_extra", cantidad: 10, recargo: 1.5, divisor: 100 });
    expect(l.monto).toBeCloseTo(l.detalle.valorHora * 1.5 * 10, 6);
    expect(explicarLinea(l)).toMatch(/10 horas × \$.* × 1,5 · valor hora: \$.* \/ 100 hs/);
  });

  it("SAC y plus vacacional dicen su base", () => {
    expect(linea(r, "SAC").detalle).toMatchObject({ tipo: "proporcion", alicuota: 0.5 });
    expect(explicarLinea(linea(r, "SAC"))).toMatch(/^50% de \$/);
    expect(linea(r, "Plus vacacional").detalle).toMatchObject({ tipo: "vacaciones", cantidad: 7 });
    expect(explicarLinea(linea(r, "Plus vacacional"))).toMatch(/7 días × \$.* \(remuneración habitual \/ 150\)/);
  });

  it("los aportes de ley dicen base y porcentaje, y la obra social nombra la suya", () => {
    const jub = linea(r, "Jubilación");
    expect(jub.detalle).toMatchObject({ tipo: "porcentaje", alicuota: 0.11 });
    expect(jub.detalle.baseLabel).toMatch(/^remunerativo/);
    const os = linea(r, "Obra Social (3%)");
    expect(os.detalle.baseLabel).toMatch(/no remunerativo con incidencia/);
    expect(os.detalle.base).toBeGreaterThan(jub.detalle.base);
    expect(explicarLinea(os)).toMatch(/^3% sobre \$/);
  });

  it("las retenciones sindicales dicen base y a quién alcanzan", () => {
    const cuota = linea(r, "Cuota Afiliado");
    expect(cuota.detalle.tipo).toBe("porcentaje");
    expect(cuota.detalle.baseLabel).toMatch(/sólo afiliados/);
    const fija = r.detalle.find((l) => l.tipo === "retencion" && l.detalle && l.detalle.tipo === "suma_fija");
    expect(fija).toBeDefined();
    expect(explicarLinea(fija)).toMatch(/^Suma fija/);
  });

  it("toda línea del trabajador tiene detalle explicable", () => {
    for (const l of r.detalle.filter((l) => l.tipo !== "contribucion")) {
      expect(explicarLinea(l), l.concepto).toBeTruthy();
    }
  });

  it("metodo trae la antigüedad, el valor hora y lo no remunerativo con incidencia", () => {
    expect(r.metodo.antiguedad).toMatchObject({ modo: "lineal", porAño: 0.01, años: 5, porcentajeTotal: 0.05 });
    expect(r.metodo.valorHora).toBeCloseTo(linea(r, "Horas Extras 50%").detalle.valorHora, 6);
    expect(r.metodo.noRemunerativoConIncidencia).toBeGreaterThan(0);
  });
});

describe("Gastronómicos: la antigüedad por tramos dice el tramo", () => {
  it("con 6 años, el tramo que arranca en 5 (4%)", () => {
    // Los tramos oficiales del CCT 389/04 tal como están cargados en producción;
    // el fixture congelado todavía tiene la regla lineal vieja.
    const conTramos = {
      ...gastro,
      reglas_calculo: { ...gastro.reglas_calculo, antiguedad: { modo: "tramos", tramos: [{ desde_años: 1, porcentaje: 0.01 }, { desde_años: 5, porcentaje: 0.04 }, { desde_años: 7, porcentaje: 0.05 }] } },
    };
    const r = procesarRecibo(conTramos, escalasGastro["2026-06"], {
      zona: "Escala A", categoria: "Nivel 6 (Mozo - Maître)", carga_horaria: 48, antiguedad_años: 6,
      horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false,
    });
    const l = linea(r, "Antigüedad");
    expect(l.detalle.tramo).toEqual({ desde_años: 5, porcentaje: 0.04 });
    expect(l.detalle.alicuota).toBe(0.04);
    expect(explicarLinea(l)).toMatch(/\(tramo desde \d+ años, 6 de antigüedad\)/);
    expect(r.metodo.antiguedad.modo).toBe("tramos");
    expect(Array.isArray(r.metodo.antiguedad.tramos)).toBe(true);
  });
});

describe("Camioneros: por unidad y antigüedad sobre básico + adicionales", () => {
  const porDefecto = Object.fromEntries(camioneros.inputs_requeridos.map((i) => [i.id, i.default]));
  const r = procesarRecibo(camioneros, escalasCamioneros["2026-08"], {
    ...porDefecto, antiguedad_años: 10, larga_distancia: true, km_recorridos: 8000, combustibles: true, dias_trabajados: 0,
  }, null, { periodo: "2026-08", tablaContribuciones: semilla, periodoContribuciones: "2026-08" });

  it("los kilómetros dicen cantidad × valor unitario", () => {
    const l = linea(r, "Horas extraordinarias por km");
    expect(l.detalle).toMatchObject({ tipo: "por_unidad", cantidad: 8000, unidad: "km", valorUnitario: 86.07469 });
    expect(explicarLinea(l)).toBe("8.000 km × $86,07");
  });

  it("la antigüedad dice que va sobre básico + adicionales remunerativos", () => {
    const l = linea(r, "Antigüedad");
    expect(l.detalle.baseLabel).toBe("básico + adicionales remunerativos");
    expect(l.detalle.base).toBeCloseTo(l.monto / 0.1, 4);
  });

  it("la contribución de obra social dice 'con incidencia' y la base excluye el viático", () => {
    const os = linea(r, "Obra social (contribución");
    expect(os.baseLabel).toMatch(/con incidencia/);
    expect(os.base).toBeCloseTo(r.totales.bruto, 4);
  });
});

describe("la composición de las cargas", () => {
  it("cada rubro tiene % de las cargas y % del costo laboral", () => {
    const r = procesarRecibo(comercio, escalasComercio["2026-07"], {
      categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 0, horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false,
    }, null, opciones);
    const e = r.costoEmpleador;
    const sumaPct = Object.values(e.rubros).reduce((a, x) => a + x.porcentaje, 0);
    expect(sumaPct).toBeCloseTo(100, 6);
    const sumaPctCosto = Object.values(e.rubros).reduce((a, x) => a + x.porcentajeDelCosto, 0);
    expect(sumaPctCosto).toBeCloseTo((e.totalCargas / e.costoLaboral) * 100, 6);
    expect(e.rubros.seguridad_social.porcentajeDelCosto).toBeLessThan(e.rubros.seguridad_social.porcentaje);
  });

  it("resumenPorRubro sin costo laboral deja el % del costo en null", () => {
    const { rubros } = resumenPorRubro([{ concepto: "X", tipo: "contribucion", monto: 10, rubro: "art" }]);
    expect(rubros.art.porcentaje).toBe(100);
    expect(rubros.art.porcentajeDelCosto).toBeNull();
  });
});
