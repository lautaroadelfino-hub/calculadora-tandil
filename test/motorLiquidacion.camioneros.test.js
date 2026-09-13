// test/motorLiquidacion.camioneros.test.js
// El canario de Camioneros (CCT 40/89), tal como quedó cargado en producción el
// 13/9/2026: el convenio y las escalas de julio y agosto 2026 (planillas 7/26 y
// 8/26 de la Federación, acta del 25/6/2026) están congelados en fixtures. Si
// alguno de estos números se mueve sin que nadie haya tocado el convenio, algo
// cambió en el motor.
//
// Lo que este convenio ejercita y los otros dos no:
//   - jornada de 44 horas y divisor 192 (ítem 6.1.6: jornal = mensual / 24,
//     hora = jornal / 8);
//   - antigüedad sobre básico + adicionales (ítem 6.1.5);
//   - comida y viático especial por día trabajado, no remunerativos y sin
//     incidencia; kilómetros remunerativos y no remunerativos para larga
//     distancia (4.2.3 y 4.2.4), colgados de la misma pregunta con signo opuesto;
//   - solidaria del 2% sobre el habitual (tope Ley 27.802) al no afiliado,
//     cuota del 3% al afiliado, sepelio 1,5% a todos;
//   - tres aportes patronales del convenio sobre el BÁSICO (8.1.2, 8.1.4, 8.1.5).

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import semilla from "../data/contribuciones.seed.json";
import convenio from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalas from "./fixtures/camioneros-cct-40-89.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));
const opciones = { periodo: "2026-08", tablaContribuciones: semilla, periodoContribuciones: "2026-08" };
const porDefecto = Object.fromEntries(convenio.inputs_requeridos.map((i) => [i.id, i.default]));
const agosto = escalas["2026-08"];

describe("Camioneros: el convenio cargado es coherente con el modelo", () => {
  it("declara 44 horas y divisor 192, antigüedad sobre básico + adicionales y sin presentismo", () => {
    expect(convenio.reglas_calculo.jornada).toEqual({ horas_semanales_completas: 44, divisor_horas_mensuales: 192 });
    expect(convenio.reglas_calculo.antiguedad).toEqual({ porcentaje_por_año: 0.01, aplica_sobre: "basico_mas_adicionales" });
    expect(convenio.reglas_calculo.presentismo).toBeUndefined();
  });

  it("toda pregunta de la que depende una regla está declarada", () => {
    const ids = new Set(convenio.inputs_requeridos.map((i) => i.id));
    const reglas = convenio.reglas_calculo;
    for (const r of Object.values({ ...reglas.adicionales_remunerativos, ...reglas.adicionales_por_unidad })) {
      if (r.depende_de) expect(ids.has(r.depende_de), r.depende_de).toBe(true);
      if (r.cantidad_de) expect(ids.has(r.cantidad_de), r.cantidad_de).toBe(true);
    }
  });

  it("las dos escalas traen las 43 categorías y todos los valores que usan los adicionales", () => {
    for (const periodo of ["2026-07", "2026-08"]) {
      expect(Object.keys(escalas[periodo].categorias)).toHaveLength(43);
      for (const u of Object.values(convenio.reglas_calculo.adicionales_por_unidad)) {
        expect(escalas[periodo].valores_del_periodo[u.valor], `${periodo} ${u.valor}`).toBeGreaterThan(0);
      }
    }
    // Agosto = julio × 1,015 exacto, como dice el acta (tramo del 1,5%).
    expect(money(escalas["2026-07"].categorias["Conductor de primera categoría"].basico * 1.015)).toBe(agosto.categorias["Conductor de primera categoría"].basico);
  });
});

describe("Camioneros: canarios de agosto 2026", () => {
  it("Conductor de primera, 22 días, 5 años, no afiliado: neto $1.442.051,50 y costo $2.050.459,88", () => {
    const r = procesarRecibo(convenio, agosto, { ...porDefecto, antiguedad_años: 5 }, null, opciones);
    expect(money(linea(r, "Antigüedad").monto)).toBe(53795.52);
    expect(money(linea(r, "Comida").monto)).toBe(362189.3); // 22 × 16.463,15
    expect(money(linea(r, "Viático especial").monto)).toBe(181745.96);
    expect(money(linea(r, "Contribución solidaria").monto)).toBe(22594.12); // 2% del habitual
    expect(money(linea(r, "Seguro de sepelio").monto)).toBe(16945.59);
    expect(money(linea(r, "Aporte empresario actividades sociales").monto)).toBe(21518.21); // 2% del básico
    expect(money(r.totales.bruto)).toBe(1129705.96);
    expect(money(r.totales.noRemunerativo)).toBe(543935.26);
    expect(money(r.totales.neto)).toBe(1442051.5);
    expect(money(r.totales.contribuciones)).toBe(376818.66);
    expect(money(r.totales.costoEmpleador)).toBe(2050459.88);
    expect(r.avisos).toEqual([]);
  });

  it("Larga distancia, 8.000 km, 10 años, afiliado, combustibles: km doble y antigüedad sobre todo lo remunerativo", () => {
    const r = procesarRecibo(convenio, agosto, {
      ...porDefecto, antiguedad_años: 10, larga_distancia: true, km_recorridos: 8000, afiliado_sindicato: true, combustibles: true, dias_trabajados: 0,
    }, null, opciones);
    expect(linea(r, "Comida")).toBeUndefined();
    expect(linea(r, "Viático especial")).toBeUndefined();
    expect(money(linea(r, "Horas extraordinarias por km").monto)).toBe(688597.52);
    expect(money(linea(r, "Viático por km").monto)).toBe(688597.52);
    expect(money(linea(r, "Antigüedad").monto)).toBe(192589.45); // 10% de (básico + 15% + km)
    expect(money(linea(r, "Cuota sindical").monto)).toBe(63554.52);
    expect(linea(r, "Contribución solidaria")).toBeUndefined();
    expect(money(r.totales.bruto)).toBe(2118483.98);
    expect(money(r.totales.neto)).toBe(2351607.44);
  });

  it("Peón, 20 días, 3 pernoctes, 10 horas extras al 50%: la hora sale del divisor 192", () => {
    const r = procesarRecibo(convenio, agosto, { ...porDefecto, categoria: "Peón", dias_trabajados: 20, pernoctes: 3, horas_extras_50: 10 }, null, opciones);
    expect(money(linea(r, "Horas Extras 50%").monto)).toBe(money((982641.94 / 192) * 1.5 * 10));
    expect(money(linea(r, "Pernoctada").monto)).toBe(57525);
    expect(money(r.totales.neto)).toBe(1395778.6);
  });

  it("la calculadora frena si a la escala le falta un valor del período", () => {
    const rota = { ...agosto, valores_del_periodo: { ...agosto.valores_del_periodo } };
    delete rota.valores_del_periodo.comida;
    expect(() => procesarRecibo(convenio, rota, porDefecto, null, opciones)).toThrow(/"comida"/);
  });
});
