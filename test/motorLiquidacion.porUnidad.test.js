// test/motorLiquidacion.porUnidad.test.js
// Lo que Camioneros (CCT 40/89) obligó a agregar al modelo el 13/9/2026:
//  - adicionales POR UNIDAD: un importe que fija cada planilla (comida, viático
//    especial, pernoctada por día; kilómetros; sumas fijas por mes) multiplicado
//    por una cantidad que informa la persona;
//  - la antigüedad sobre TODOS los conceptos remunerativos (ítem 6.1.5), o sea
//    básico más adicionales, calculada después de ellos.
// Los números salen de la planilla 7/26 firmada por la Federación (julio 2026).

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import semilla from "../data/contribuciones.seed.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));

const camioneros = {
  id: "camioneros-cct-40-89",
  nombre: "Camioneros",
  cct: "40/89",
  inputs_requeridos: [
    { id: "categoria", tipo: "select", label: "Categoría", default: "Conductor de primera categoría", opciones: ["Conductor de primera categoría", "Peón"] },
    { id: "carga_horaria", tipo: "number", label: "Horas semanales", default: 48 },
    { id: "antiguedad_años", tipo: "number", label: "Años de antigüedad", default: 0 },
    { id: "horas_extras_50", tipo: "number", label: "Horas extras al 50%", default: 0 },
    { id: "horas_extras_100", tipo: "number", label: "Horas extras al 100%", default: 0 },
    { id: "dias_trabajados", tipo: "number", label: "Días trabajados en el mes", default: 22, origen: "por_unidad" },
    { id: "km_recorridos", tipo: "number", label: "Kilómetros recorridos", default: 0, origen: "por_unidad" },
    { id: "pernoctes", tipo: "number", label: "Pernoctes fuera del domicilio", default: 0, origen: "por_unidad" },
    { id: "combustibles", tipo: "boolean", label: "¿Transporta combustibles líquidos?", default: false, origen: "adicional" },
  ],
  reglas_calculo: {
    antiguedad: { porcentaje_por_año: 0.01, aplica_sobre: "basico_mas_adicionales" },
    adicionales_remunerativos: {
      combustibles: { label: "Transporte de combustibles (15%)", porcentaje: 0.15, aplica_sobre: "basico", depende_de: "combustibles" },
    },
    adicionales_por_unidad: {
      comida: { label: "Comida (ítem 4.1.12)", valor: "comida", unidad: "dia", naturaleza: "no_remunerativo", con_incidencia: false, cantidad_de: "dias_trabajados" },
      viatico_especial: { label: "Viático especial (ítem 4.1.13)", valor: "viatico_especial", unidad: "dia", naturaleza: "no_remunerativo", con_incidencia: false, cantidad_de: "dias_trabajados" },
      pernoctada: { label: "Pernoctada (ítem 4.1.14)", valor: "pernoctada", unidad: "dia", naturaleza: "no_remunerativo", con_incidencia: false, cantidad_de: "pernoctes" },
      km: { label: "Horas extraordinarias por km recorrido (ítem 4.2.3)", valor: "km_hora_extra", unidad: "km", naturaleza: "remunerativo", cantidad_de: "km_recorridos" },
      km_viatico: { label: "Viático por km (ítem 4.2.4)", valor: "km_viatico", unidad: "km", naturaleza: "no_remunerativo", con_incidencia: false, cantidad_de: "km_recorridos" },
    },
    retenciones_sindicales: {},
  },
};

// Planilla 7/26: julio 2026, zona general.
const escalaJulio = {
  mes_vigencia: "Julio 2026",
  categorias: {
    "Conductor de primera categoría": { basico: 1060010.29, no_remunerativo: 0 },
    "Peón": { basico: 968120.14, no_remunerativo: 0 },
  },
  valores_del_periodo: { comida: 16219.85, viatico_especial: 8139.09, pernoctada: 18891.63, km_hora_extra: 84.80265, km_viatico: 84.80265 },
};

const entradas = (o = {}) => ({
  categoria: "Conductor de primera categoría", carga_horaria: 48, antiguedad_años: 0,
  horas_extras_50: 0, horas_extras_100: 0, dias_trabajados: 22, km_recorridos: 0, pernoctes: 0, combustibles: false, ...o,
});
const opciones = { periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07" };

describe("adicionales por unidad: la comida y el viático por día", () => {
  const r = procesarRecibo(camioneros, escalaJulio, entradas(), null, opciones);

  it("comida × 22 días = $356.836,70, no remunerativa y sin incidencia", () => {
    const comida = linea(r, "Comida");
    expect(comida.concepto).toBe("Comida (ítem 4.1.12) (22 días)");
    expect(comida.tipo).toBe("no_remunerativo");
    expect(money(comida.monto)).toBe(356836.7);
    expect(comida.sinIncidencia).toBe(true);
    expect(money(linea(r, "Viático especial").monto)).toBe(money(8139.09 * 22));
  });

  it("la pernoctada no aparece si los pernoctes son cero", () => {
    expect(linea(r, "Pernoctada")).toBeUndefined();
    const conPernoctes = procesarRecibo(camioneros, escalaJulio, entradas({ pernoctes: 3 }), null, opciones);
    expect(linea(conPernoctes, "Pernoctada").concepto).toBe("Pernoctada (ítem 4.1.14) (3 días)");
    expect(money(linea(conPernoctes, "Pernoctada").monto)).toBe(money(18891.63 * 3));
  });

  it("los viáticos van al neto y a ninguna base: ni obra social, ni contribuciones", () => {
    const sinDias = procesarRecibo(camioneros, escalaJulio, entradas({ dias_trabajados: 0 }), null, opciones);
    const viaticos = money(linea(r, "Comida").monto + linea(r, "Viático especial").monto);
    expect(money(r.totales.neto - sinDias.totales.neto)).toBe(viaticos);
    expect(r.totales.bruto).toBe(sinDias.totales.bruto);
    expect(r.totales.retenciones).toBe(sinDias.totales.retenciones);
    expect(r.totales.contribuciones).toBe(sinDias.totales.contribuciones);
    expect(money(r.totales.costoEmpleador - sinDias.totales.costoEmpleador)).toBe(viaticos);
    expect(money(r.metodo.noRemunerativoSinIncidencia)).toBe(viaticos);
  });

  it("no se prorratean por la jornada: son por día efectivo", () => {
    const media = procesarRecibo(camioneros, escalaJulio, entradas({ carga_horaria: 24 }), null, opciones);
    expect(linea(media, "Comida").monto).toBe(linea(r, "Comida").monto);
    expect(money(linea(media, "Sueldo Básico").monto)).toBe(money(1060010.29 / 2));
  });

  it("el neto cierra y toda línea tiene un tipo conocido", () => {
    expect(r.totales.neto).toBeCloseTo(r.totales.bruto + r.totales.noRemunerativo - r.totales.retenciones, 6);
    for (const l of r.detalle) expect(["remunerativo", "no_remunerativo", "retencion", "contribucion"]).toContain(l.tipo);
  });
});

describe("adicionales por unidad: los kilómetros", () => {
  const r = procesarRecibo(camioneros, escalaJulio, entradas({ km_recorridos: 1000 }), null, opciones);

  it("las horas extraordinarias por km son remunerativas: suben el bruto y pagan aportes", () => {
    const km = linea(r, "Horas extraordinarias por km");
    expect(km.tipo).toBe("remunerativo");
    expect(km.concepto).toBe("Horas extraordinarias por km recorrido (ítem 4.2.3) (1000 km)");
    expect(money(km.monto)).toBe(84802.65);
    const sinKm = procesarRecibo(camioneros, escalaJulio, entradas(), null, opciones);
    expect(money(r.totales.bruto - sinKm.totales.bruto)).toBe(84802.65);
    expect(money(linea(r, "Jubilación").monto - linea(sinKm, "Jubilación").monto)).toBe(money(84802.65 * 0.11));
    expect(r.totales.contribuciones).toBeGreaterThan(sinKm.totales.contribuciones);
  });

  it("el viático por km es no remunerativo y no paga nada", () => {
    const v = linea(r, "Viático por km");
    expect(v.tipo).toBe("no_remunerativo");
    expect(v.sinIncidencia).toBe(true);
    expect(money(v.monto)).toBe(84802.65);
  });
});

describe("la antigüedad sobre básico más adicionales (ítem 6.1.5)", () => {
  it("con 10 años y combustibles: 10% de (básico + 15% del básico + km)", () => {
    const r = procesarRecibo(camioneros, escalaJulio, entradas({ antiguedad_años: 10, combustibles: true, km_recorridos: 500 }), null, opciones);
    const basico = 1060010.29;
    const combustibles = basico * 0.15;
    const km = 84.80265 * 500;
    expect(money(linea(r, "Antigüedad").monto)).toBe(money((basico + combustibles + km) * 0.10));
    expect(r.metodo.antiguedadSobre).toBe("basico_mas_adicionales");
    // Y va justo después del básico, aunque se calcule al final.
    expect(r.detalle[0].concepto).toBe("Sueldo Básico");
    expect(r.detalle[1].concepto).toBe("Antigüedad");
  });

  it("sin adicionales da lo mismo que sobre el básico", () => {
    const r = procesarRecibo(camioneros, escalaJulio, entradas({ antiguedad_años: 5 }), null, opciones);
    expect(money(linea(r, "Antigüedad").monto)).toBe(money(1060010.29 * 0.05));
  });

  it("la de siempre sigue igual: Comercio calcula sobre el básico y `metodo` lo dice", () => {
    const sobreBasico = { ...camioneros, reglas_calculo: { ...camioneros.reglas_calculo, antiguedad: { porcentaje_por_año: 0.01 } } };
    const r = procesarRecibo(sobreBasico, escalaJulio, entradas({ antiguedad_años: 10, combustibles: true }), null, opciones);
    expect(money(linea(r, "Antigüedad").monto)).toBe(money(1060010.29 * 0.10));
    expect(r.metodo.antiguedadSobre).toBe("basico");
  });

  it("un adicional sobre básico + antigüedad, con la antigüedad sobre los adicionales, es circular y frena", () => {
    const circular = JSON.parse(JSON.stringify(camioneros));
    circular.reglas_calculo.adicionales_remunerativos.combustibles.aplica_sobre = "basico_mas_antiguedad";
    expect(() => procesarRecibo(circular, escalaJulio, entradas({ antiguedad_años: 1, combustibles: true }))).toThrow(/circular/);
  });

  it("una base de antigüedad que el motor no conoce frena", () => {
    const rota = JSON.parse(JSON.stringify(camioneros));
    rota.reglas_calculo.antiguedad.aplica_sobre = "todo";
    expect(() => procesarRecibo(rota, escalaJulio, entradas({ antiguedad_años: 1 }))).toThrow(/"todo", que el motor no conoce/);
  });
});

describe("lo que frena en vez de adivinar", () => {
  it("si la escala no trae el importe del período", () => {
    const sinComida = { ...escalaJulio, valores_del_periodo: { viatico_especial: 8139.09, pernoctada: 1, km_hora_extra: 1, km_viatico: 1 } };
    expect(() => procesarRecibo(camioneros, sinComida, entradas())).toThrow(/usa el valor "comida" y la escala de este período no lo trae/);
  });

  it("si la unidad o la naturaleza no se conocen", () => {
    const rota = JSON.parse(JSON.stringify(camioneros));
    rota.reglas_calculo.adicionales_por_unidad.comida.unidad = "hora";
    expect(() => procesarRecibo(rota, escalaJulio, entradas())).toThrow(/"hora", que el motor no conoce/);
    const rota2 = JSON.parse(JSON.stringify(camioneros));
    rota2.reglas_calculo.adicionales_por_unidad.comida.naturaleza = "mixto";
    expect(() => procesarRecibo(rota2, escalaJulio, entradas())).toThrow(/"mixto", que el motor no conoce/);
  });

  it("si la cantidad sale de una pregunta que el convenio no hace", () => {
    const rota = JSON.parse(JSON.stringify(camioneros));
    rota.reglas_calculo.adicionales_por_unidad.comida.cantidad_de = "jornadas";
    expect(() => procesarRecibo(rota, escalaJulio, entradas())).toThrow(/"jornadas", que este convenio no le hace al usuario/);
  });

  it("un importe fijo por mes no necesita cantidad", () => {
    const conBitrenes = JSON.parse(JSON.stringify(camioneros));
    conBitrenes.reglas_calculo.adicionales_por_unidad.bitrenes = { label: "Adicional bitrenes", valor: "bitrenes", unidad: "mes", naturaleza: "remunerativo" };
    const escala = { ...escalaJulio, valores_del_periodo: { ...escalaJulio.valores_del_periodo, bitrenes: 684978.64 } };
    const r = procesarRecibo(conBitrenes, escala, entradas());
    expect(linea(r, "Adicional bitrenes").concepto).toBe("Adicional bitrenes");
    expect(money(linea(r, "Adicional bitrenes").monto)).toBe(684978.64);
    expect(linea(r, "Adicional bitrenes").tipo).toBe("remunerativo");
  });
});
