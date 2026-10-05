// test/cargaDelMes.test.js
// Lo que hacía peligroso cargar un mes desde /admin (auditoría del 23/9/2026):
// un CSV con una columna de más publicaba zonas inventadas, un adicional sin
// porcentaje se descartaba en silencio, y publicar sin los valores del
// período dejaba la calculadora tirando error para todos. Estos tests fijan
// que las tres cosas frenan antes de escribir, y que la revisión previa
// compara con el mes anterior.

import { describe, it, expect } from "vitest";
import { parsearCsvEscala, revisarEscalaAntesDePublicar, valoresQueNecesita } from "../lib/escalaCsv.js";
import { validarFormConvenio } from "../lib/convenioForm.js";
import { paramsDesdeEntradas, entradasDesdeParams } from "../lib/permalink.js";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalasCamioneros from "./fixtures/camioneros-cct-40-89.escalas.json";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";

describe("el CSV no adivina la zona", () => {
  it("una columna de más frena y dice cómo declararla, en vez de inventar zonas", () => {
    const r = parsearCsvEscala("categoria,basico,no_remunerativo\nEscala A,Vendedor B,1177947,120000");
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]).toMatch(/Fila 2: tiene 4 columnas y el encabezado declara 3/);
    expect(r.errores[0]).toMatch(/empezar con "zona"/);
    expect(r.claves).toEqual([]);
  });

  it("con el encabezado declarado, cuatro columnas son zona + categoría", () => {
    const r = parsearCsvEscala("zona,categoria,basico,no_remunerativo\nEscala A,Nivel 1,999420,38700");
    expect(r.errores).toEqual([]);
    expect(r.claves).toEqual(["Escala A|Nivel 1"]);
  });

  it("las columnas vacías que deja Excel al final no cuentan", () => {
    const r = parsearCsvEscala("categoria,basico,no_remunerativo\nVendedor B,1177947,120000,,");
    expect(r.errores).toEqual([]);
    expect(r.claves).toEqual(["Vendedor B"]);
  });
});

describe("un adicional sin porcentaje no se guarda callado", () => {
  const base = { id: "x-cct-1-1", nombre: "X", cct: "1/1", activo: true, antiguedadPct: 1, presentismoPct: 8.333, retenciones: [] };

  it("con el porcentaje vacío, el formulario frena y dice qué fila", () => {
    const errores = validarFormConvenio({ ...base, adicionales: [{ label: "Plus", valorPct: "" }] });
    expect(errores).toContainEqual(expect.objectContaining({ campo: "adicionales[0].valorPct", mensaje: expect.stringMatching(/falta el porcentaje/) }));
  });

  it("con el porcentaje en cero también", () => {
    const errores = validarFormConvenio({ ...base, adicionales: [{ label: "Plus", valorPct: 0 }] });
    expect(errores).toContainEqual(expect.objectContaining({ campo: "adicionales[0].valorPct" }));
  });

  it("con porcentaje, pasa", () => {
    expect(validarFormConvenio({ ...base, adicionales: [{ label: "Plus", valorPct: 10, base: "basico" }] })).toEqual([]);
  });
});

describe("la revisión antes de publicar", () => {
  const agosto = escalasCamioneros["2026-08"];
  const claves = Object.keys(agosto.categorias);
  const sueldos = agosto.categorias;

  it("sabe qué valores del período necesita Camioneros y Comercio no necesita ninguno", () => {
    expect(valoresQueNecesita(camioneros).map((v) => v.clave)).toEqual(expect.arrayContaining(["comida", "viatico_especial", "pernoctada", "km_hora_extra", "km_viatico"]));
    expect(valoresQueNecesita(comercio)).toEqual([]);
    expect(valoresQueNecesita(null)).toEqual([]);
  });

  it("publicar Camioneros sin los valores del período frena y nombra cada uno", () => {
    const r = revisarEscalaAntesDePublicar({ claves, sueldos, convenio: camioneros, valoresDelPeriodo: {} });
    expect(r.errores.length).toBeGreaterThanOrEqual(5);
    expect(r.errores.join(" ")).toMatch(/"comida", que usa el adicional/);
    expect(r.errores.join(" ")).toMatch(/no funciona/);
  });

  it("con los valores del período de la planilla, pasa", () => {
    const r = revisarEscalaAntesDePublicar({ claves, sueldos, convenio: camioneros, valoresDelPeriodo: agosto.valores_del_periodo });
    expect(r.errores).toEqual([]);
  });

  it("compara con el mes anterior: suben, no cambian, bajan, o suben demasiado", () => {
    const julio = escalasCamioneros["2026-07"];
    const dudosos = { ...sueldos };
    const [a, b, c] = claves;
    dudosos[a] = { ...sueldos[a], basico: julio.categorias[a].basico }; // igual que julio
    dudosos[b] = { ...sueldos[b], basico: julio.categorias[b].basico * 0.9 }; // baja
    dudosos[c] = { ...sueldos[c], basico: julio.categorias[c].basico * 10 }; // un cero de más
    const r = revisarEscalaAntesDePublicar({
      claves, sueldos: dudosos, convenio: camioneros, valoresDelPeriodo: agosto.valores_del_periodo,
      escalaAnterior: { periodo: "2026-07", ...julio },
    });
    expect(r.errores).toEqual([]);
    const texto = r.advertencias.join("\n");
    expect(texto).toMatch(/suben entre 1\.5% y 1\.5%/);
    expect(texto).toMatch(new RegExp(`MISMO básico: ${a.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`));
    expect(texto).toMatch(/BAJAN/);
    expect(texto).toMatch(/más de la mitad/);
  });

  it("avisa si el mes anterior tenía valores del período que este no trae", () => {
    const { comida, ...sinComida } = agosto.valores_del_periodo;
    const r = revisarEscalaAntesDePublicar({
      claves, sueldos, convenio: comercio, valoresDelPeriodo: sinComida,
      escalaAnterior: { periodo: "2026-07", ...escalasCamioneros["2026-07"] },
    });
    expect(r.advertencias.join(" ")).toMatch(/valor\(es\) del período que este mes no trae: comida/);
  });
});

describe("el link para compartir conserva las casillas destildadas", () => {
  it("una casilla en false viaja como 0 y se lee como false", () => {
    const qs = paramsDesdeEntradas(camioneros, { categoria: "Peón", larga_distancia: false, afiliado_sindicato: true }, "2026-08");
    expect(qs).toContain("larga_distancia=0");
    const { valores } = entradasDesdeParams(camioneros, qs);
    expect(valores.larga_distancia).toBe(false);
    expect(valores.afiliado_sindicato).toBe(true);
  });
});
