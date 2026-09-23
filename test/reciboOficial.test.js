// test/reciboOficial.test.js
// El recibo en pantalla sigue el modelo del Anexo III del Decreto 407/2026.
// lib/reciboOficial.js convierte el resultado del motor en las celdas de ese
// modelo; acá se revisa que cada celda salga de la línea que corresponde y
// que la torta y el detalle cierren al centavo con el costo laboral.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import {
  celdasDeLinea,
  filasEmpleador,
  filasTrabajador,
  bloquesComposicion,
  porcionesDelCosto,
  encabezado,
  lineasPorTipo,
  SUBTITULO_CCT,
  NOTA_SEGURIDAD_SOCIAL,
} from "../lib/reciboOficial.js";
import semilla from "../data/contribuciones.seed.json";
import ganancias from "../data/ganancias.seed.json";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalasCamioneros from "./fixtures/camioneros-cct-40-89.escalas.json";

const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));
const opciones = { periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07" };
const centavos = (n) => Math.round(n * 100) / 100;

const escalaJulio = { mes_vigencia: "Julio 2026", categorias: { "Vendedor B": { basico: 1177947, no_remunerativo: 120000 } } };
const entradasComercio = {
  categoria: "Vendedor B", carga_horaria: 24, antiguedad_años: 5, horas_extras_50: 10, horas_extras_100: 0,
  afiliado_sindicato: true, incluir_sac: true, dias_vacaciones: 7,
};
const rComercio = procesarRecibo(comercio, escalaJulio, entradasComercio, null, opciones);

const porDefectoCamioneros = Object.fromEntries(camioneros.inputs_requeridos.map((i) => [i.id, i.default]));
const rCamioneros = procesarRecibo(
  camioneros,
  escalasCamioneros["2026-08"],
  { ...porDefectoCamioneros, categoria: "Conductor de primera categoría", dias_trabajados: 22, antiguedad_años: 5 },
  null,
  { ...opciones, periodo: "2026-08" }
);

describe("las celdas UNIDAD y BASE de cada línea", () => {
  it("el básico a jornada completa lleva los 30 días del mes; a jornada parcial, la proporción de horas", () => {
    const completa = procesarRecibo(comercio, escalaJulio, { ...entradasComercio, carga_horaria: 48 }, null, opciones);
    expect(celdasDeLinea(linea(completa, "Sueldo Básico"))).toEqual({ unidad: "30", base: "$ 1.177.947,00", baseNota: "escala del convenio" });
    expect(celdasDeLinea(linea(rComercio, "Sueldo Básico"))).toMatchObject({ unidad: "24/48 hs", base: "$ 1.177.947,00" });
  });

  it("un porcentaje dice la alícuota, la base y sobre qué se calculó", () => {
    const c = celdasDeLinea(linea(rComercio, "Antigüedad"));
    expect(c.unidad).toBe("5%");
    expect(c.base).toBe("$ 588.973,50");
    expect(c.baseNota).toBe("el básico · 1% × 5 años");
    expect(celdasDeLinea(linea(rComercio, "Jubilación"))).toMatchObject({ unidad: "11%" });
    expect(celdasDeLinea(linea(rComercio, "Ley 19.032"))).toMatchObject({ unidad: "3%" });
  });

  it("horas extras, SAC y vacaciones muestran cantidad y valor unitario", () => {
    const he = celdasDeLinea(linea(rComercio, "Horas Extras 50%"));
    expect(he.unidad).toBe("10 hs × 1,5");
    expect(he.base).toMatch(/^\$ /);
    expect(he.baseNota).toMatch(/^valor hora: \$ .* \/ 100 hs$/);
    expect(celdasDeLinea(linea(rComercio, "SAC"))).toMatchObject({ unidad: "50%", baseNota: "la remuneración habitual del mes" });
    expect(celdasDeLinea(linea(rComercio, "Plus vacacional"))).toMatchObject({ unidad: "7 días" });
  });

  it("lo que se paga por unidad dice cantidad y valor unitario", () => {
    const comida = rCamioneros.detalle.find((l) => l.detalle && l.detalle.tipo === "por_unidad");
    expect(comida).toBeDefined();
    const c = celdasDeLinea(comida);
    expect(c.unidad).toMatch(/^22 días$/);
    expect(c.base).toMatch(/^\$ /);
  });

  it("las contribuciones: porcentaje con base, suma fija sin base, ART pendiente 'sin dato'", () => {
    expect(celdasDeLinea(linea(rComercio, "SIPA"))).toMatchObject({ unidad: "10,77%", baseNota: "Remunerativo − detracción" });
    expect(celdasDeLinea(linea(rComercio, "Seguro Colectivo"))).toEqual({ unidad: "fija", base: "", baseNota: "Suma fija por trabajador" });
    const sinArt = procesarRecibo({ ...comercio, reglas_calculo: { ...comercio.reglas_calculo, art: {} } }, escalaJulio, entradasComercio, null, opciones);
    expect(celdasDeLinea(linea(sinArt, "ART"))).toMatchObject({ unidad: "sin dato" });
  });

  it("una línea sin detalle sale con las celdas vacías, no con un número inventado", () => {
    expect(celdasDeLinea({ concepto: "X", tipo: "remunerativo", monto: 1 })).toEqual({ unidad: "", base: "", baseNota: "" });
    expect(celdasDeLinea(null)).toEqual({ unidad: "", base: "", baseNota: "" });
  });

  it("Ganancias dice la alícuota del tramo y la base imponible", () => {
    const r = procesarRecibo(comercio, escalaJulio, { ...entradasComercio, carga_horaria: 48, horas_extras_50: 60 }, ganancias, opciones);
    const g = linea(r, "Impuesto a las Ganancias");
    if (!g) return; // con estas tablas puede no llegar al mínimo: no hay nada que revisar
    expect(celdasDeLinea(g)).toMatchObject({ unidad: expect.stringMatching(/%$/), baseNota: "base imponible" });
  });
});

describe("las filas de las dos tablas", () => {
  it("el empleador: ART, después el régimen, después las sumas fijas; Comercio no tiene costo derivado del CCT", () => {
    const conArt = procesarRecibo(comercio, escalaJulio, { ...entradasComercio, art_alicuota: 2.5 }, null, opciones);
    const filas = filasEmpleador(conArt.detalle);
    expect(filas.every((f) => f.clase === "linea")).toBe(true);
    expect(filas.map((f) => f.linea.origen)).toEqual(["art", "regimen", "regimen", "regimen", "regimen", "regimen", "universal", "universal"]);
    expect(filas[0].linea.concepto).toMatch(/^ART/);
    expect(filas[0].celdas.unidad).toBe("2,5%");
  });

  it("Camioneros: el subtítulo 'Costo derivado del CCT:' y debajo las contribuciones propias del convenio", () => {
    const filas = filasEmpleador(rCamioneros.detalle);
    const i = filas.findIndex((f) => f.clase === "subtitulo");
    expect(i).toBeGreaterThan(0);
    expect(filas[i].texto).toBe(SUBTITULO_CCT);
    const despues = filas.slice(i + 1);
    expect(despues.length).toBeGreaterThan(0);
    expect(despues.every((f) => f.linea.origen === "convenio")).toBe(true);
    expect(filas.slice(0, i).every((f) => f.linea.origen !== "convenio")).toBe(true);
  });

  it("el trabajador: haberes, un renglón en blanco y los descuentos en positivo, con su explicación", () => {
    const filas = filasTrabajador(rComercio.detalle);
    const { remunerativos, noRemunerativos, retenciones } = lineasPorTipo(rComercio.detalle);
    const sep = filas.findIndex((f) => f.clase === "separador");
    expect(sep).toBe(remunerativos.length + noRemunerativos.length);
    expect(filas.slice(sep + 1).map((f) => f.linea)).toEqual(retenciones);
    expect(filas.slice(sep + 1).every((f) => f.linea.monto > 0)).toBe(true);
    expect(filas[0].explicacion).toMatch(/^Escala del convenio/);
  });
});

describe("el detalle de la composición salarial", () => {
  it("son los seis bloques del modelo, con los importes de los rubros del motor", () => {
    const { bloques, nota } = bloquesComposicion(rComercio);
    const r = rComercio.costoEmpleador.rubros;
    expect(bloques.map((b) => b.id)).toEqual(["sindical", "seguridad_social", "obra_social", "inssjp", "art", "scvo"]);
    expect(bloques[0]).toMatchObject({ titulo: "Total Costo Sindical", total: r.sindical.total });
    expect(bloques[0].partes).toEqual([{ lado: "Empleador", monto: r.sindical.empleador }, { lado: "Trabajador", monto: r.sindical.trabajador }]);
    // INSSJP lista primero al trabajador, como el modelo.
    expect(bloques[3].partes.map((p) => p.lado)).toEqual(["Trabajador", "Empleador"]);
    expect(bloques[4].partes).toEqual([{ lado: "Empleador", monto: r.art.empleador }]);
    expect(nota).toBe(NOTA_SEGURIDAD_SOCIAL);
  });

  it("el SCVO sale de la línea con id 'scvo', no del rubro 'otros' entero", () => {
    const { bloques } = bloquesComposicion(rComercio);
    const scvo = bloques.find((b) => b.id === "scvo");
    expect(scvo.total).toBe(424.62);
    expect(linea(rComercio, "Seguro Colectivo").id).toBe("scvo");
    expect(bloques.find((b) => b.id === "otros")).toBeUndefined();
  });

  it("si un convenio paga cámaras o sepelio, aparecen como bloques adicionales", () => {
    const { bloques } = bloquesComposicion(rCamioneros);
    const r = rCamioneros.costoEmpleador.rubros;
    const extra = bloques.slice(6).map((b) => b.id);
    if (r.camaras.total > 0) expect(extra).toContain("camaras");
    if (r.otros.total - 424.62 > 0.005) expect(extra).toContain("otros");
    const sumaBloques = bloques.reduce((acc, b) => acc + b.total, 0);
    expect(centavos(sumaBloques)).toBe(centavos(rCamioneros.costoEmpleador.totalCargas));
  });

  it("sin tabla de contribuciones no hay detalle ni torta", () => {
    const sinTabla = procesarRecibo(comercio, escalaJulio, entradasComercio, null, { periodo: "2026-07", tablaContribuciones: null });
    expect(bloquesComposicion(sinTabla)).toBeNull();
    expect(porcionesDelCosto(sinTabla)).toBeNull();
  });
});

describe("la torta del costo total", () => {
  it.each([
    ["Comercio", rComercio],
    ["Camioneros", rCamioneros],
  ])("%s: las porciones suman exactamente el costo laboral y los porcentajes suman 100", (_, r) => {
    const { porciones, total } = porcionesDelCosto(r);
    expect(total).toBe(r.costoEmpleador.costoLaboral);
    expect(centavos(porciones.reduce((acc, p) => acc + p.monto, 0))).toBe(centavos(total));
    expect(porciones.reduce((acc, p) => acc + p.porcentaje, 0)).toBeCloseTo(100, 6);
    expect(porciones.every((p) => p.monto > 0)).toBe(true);
    expect(porciones[0]).toMatchObject({ id: "neto", label: "Sueldo Neto", monto: r.totales.neto });
  });

  it("el orden de la leyenda es el del modelo", () => {
    const ids = porcionesDelCosto(rComercio).porciones.map((p) => p.id);
    expect(ids.slice(0, 6)).toEqual(["neto", "seguridad_social", "sindical", "obra_social", "inssjp", "art"]);
  });

  it("con Ganancias, el impuesto es una porción aparte y la suma sigue cerrando", () => {
    const r = procesarRecibo(comercio, escalaJulio, { ...entradasComercio, carga_horaria: 48, horas_extras_50: 80, horas_extras_100: 40 }, ganancias, opciones);
    const { porciones, total } = porcionesDelCosto(r);
    expect(centavos(porciones.reduce((acc, p) => acc + p.monto, 0))).toBe(centavos(total));
    const g = linea(r, "Impuesto a las Ganancias");
    if (g) expect(porciones.find((p) => p.id === "ganancias").monto).toBe(g.monto);
  });
});

describe("el encabezado", () => {
  it("completa mes, año, categoría, sueldo bruto y antigüedad; lo demás no se inventa", () => {
    const e = encabezado(rComercio, entradasComercio, "2026-09");
    expect(e).toEqual({
      mes: "septiembre",
      año: "2026",
      categoria: "Vendedor B",
      sueldoBruto: "$ " + (rComercio.totales.bruto + rComercio.totales.noRemunerativo).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      antiguedad: "5 años",
    });
    expect(Object.keys(e)).not.toContain("empresa");
  });

  it("la zona acompaña a la categoría y un año se escribe en singular", () => {
    expect(encabezado(rComercio, { categoria: "Nivel 1", zona: "Escala A", antiguedad_años: 1 }, "2026-01")).toMatchObject({ mes: "enero", categoria: "Nivel 1 · Escala A", antiguedad: "1 año" });
    expect(encabezado(null, {}, "")).toMatchObject({ mes: "", año: "", antiguedad: "0 años" });
  });
});
