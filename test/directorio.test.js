// test/directorio.test.js
// El directorio de la portada: orden, búsqueda y agrupado por sector.
//
// Lo que protege: que la home se lea igual de bien con 3 convenios que con 40,
// y que NINGÚN convenio desaparezca por culpa de estas funciones. Un convenio
// invisible es indistinguible de uno que no cargamos, y nadie se entera hasta
// que alguien pregunta.

import { describe, it, expect } from "vitest";
import {
  UMBRAL_BUSCADOR,
  UMBRAL_AGRUPAR,
  debeBuscar,
  debeAgrupar,
  normalizarBusqueda,
  ordenarConvenios,
  textoBuscable,
  filtrarConvenios,
  claveDeSector,
  agruparPorSector,
} from "../lib/directorio.js";
import { SECTORES } from "../lib/herramientas.js";

// Los tres convenios que hay hoy en producción.
const HOY = [
  {
    id: "gastronomicos-cct-389-04",
    nombre: "Gastronómicos (UTHGRA)",
    cct: "389/04",
    sector: "gastronomico",
    ultimo_periodo_nombre: "Agosto 2026",
  },
  {
    id: "empleados-comercio-cct-130-75",
    nombre: "Empleados de Comercio",
    cct: "130/75",
    sector: "privado",
    ultimo_periodo_nombre: "Agosto 2026",
  },
  {
    id: "camioneros-cct-40-89",
    nombre: "Camioneros",
    cct: "40/89",
    sector: "transporte",
    ultimo_periodo_nombre: "Agosto 2026",
  },
];

const nombres = (lista) => lista.map((c) => c.nombre);

/** Arma n convenios de un sector, con nombres distintos. */
function muchos(sector, n, prefijo) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefijo}-${i}`,
    nombre: `${prefijo} ${String(i).padStart(2, "0")}`,
    cct: `${100 + i}/99`,
    sector,
  }));
}

describe("normalización", () => {
  it("saca acentos, mayúsculas y signos", () => {
    expect(normalizarBusqueda("Gastronómicos (UTHGRA)")).toBe("gastronomicos uthgra");
    expect(normalizarBusqueda("  CCT 40/89 ")).toBe("cct 40 89");
  });

  it("no rompe con null ni undefined", () => {
    expect(normalizarBusqueda(null)).toBe("");
    expect(normalizarBusqueda(undefined)).toBe("");
  });
});

describe("orden alfabético", () => {
  it("no depende del orden en que Firestore devuelve los documentos", () => {
    expect(nombres(ordenarConvenios(HOY))).toEqual([
      "Camioneros",
      "Empleados de Comercio",
      "Gastronómicos (UTHGRA)",
    ]);
  });

  it("los acentos y las mayúsculas no mandan al fondo de la lista", () => {
    const lista = [{ nombre: "Ñandú" }, { nombre: "alfa" }, { nombre: "Ácido" }];
    expect(nombres(ordenarConvenios(lista))).toEqual(["Ácido", "alfa", "Ñandú"]);
  });

  it("no muta la lista que recibe (es el estado de React)", () => {
    const original = [...HOY];
    ordenarConvenios(HOY);
    expect(HOY).toEqual(original);
  });

  it("aguanta una lista vacía o un convenio sin nombre", () => {
    expect(ordenarConvenios(undefined)).toEqual([]);
    expect(ordenarConvenios([])).toEqual([]);
    expect(() => ordenarConvenios([{ id: "x" }, { nombre: "A" }])).not.toThrow();
  });
});

describe("buscador", () => {
  it("sin consulta devuelve todo", () => {
    expect(filtrarConvenios(HOY, "")).toHaveLength(3);
    expect(filtrarConvenios(HOY, "   ")).toHaveLength(3);
  });

  it("encuentra por nombre, sin importar acentos ni mayúsculas", () => {
    expect(nombres(filtrarConvenios(HOY, "camioneros"))).toEqual(["Camioneros"]);
    expect(nombres(filtrarConvenios(HOY, "CAMIONEROS"))).toEqual(["Camioneros"]);
    expect(nombres(filtrarConvenios(HOY, "gastronomicos"))).toEqual(["Gastronómicos (UTHGRA)"]);
    expect(nombres(filtrarConvenios(HOY, "gastronómicos"))).toEqual(["Gastronómicos (UTHGRA)"]);
    expect(nombres(filtrarConvenios(HOY, "uthgra"))).toEqual(["Gastronómicos (UTHGRA)"]);
  });

  it("encuentra por número de CCT, se escriba como se escriba", () => {
    expect(nombres(filtrarConvenios(HOY, "40/89"))).toEqual(["Camioneros"]);
    expect(nombres(filtrarConvenios(HOY, "4089"))).toEqual(["Camioneros"]);
    expect(nombres(filtrarConvenios(HOY, "cct 130/75"))).toEqual(["Empleados de Comercio"]);
  });

  it("encuentra por sector, aunque el sector ya no se imprima en la tarjeta", () => {
    // El dueño pidió sacar el rótulo "TRANSPORTE Y LOGÍSTICA" de la tarjeta.
    // Que no se muestre no quiere decir que no se pueda buscar por ahí.
    expect(nombres(filtrarConvenios(HOY, "transporte"))).toEqual(["Camioneros"]);
    expect(textoBuscable({ nombre: "X" })).toContain("Sector privado");
  });

  it("con varias palabras exige todas, en cualquier orden", () => {
    expect(filtrarConvenios(HOY, "comercio 130")).toHaveLength(1);
    expect(filtrarConvenios(HOY, "130 comercio")).toHaveLength(1);
    expect(filtrarConvenios(HOY, "comercio 389")).toHaveLength(0);
  });

  it("sin coincidencias devuelve una lista vacía, no la lista entera", () => {
    expect(filtrarConvenios(HOY, "peluqueros")).toEqual([]);
  });

  it("no muta la lista que recibe", () => {
    const original = [...HOY];
    filtrarConvenios(HOY, "camioneros");
    expect(HOY).toEqual(original);
  });
});

describe("sector del convenio", () => {
  it("un convenio sin sector, o con uno desconocido, cae en privado", () => {
    // Mismo criterio que estiloDeSector(): el campo puede faltar en documentos
    // viejos y el convenio NO puede desaparecer de la portada por eso.
    expect(claveDeSector({})).toBe("privado");
    expect(claveDeSector({ sector: "marciano" })).toBe("privado");
    expect(claveDeSector({ sector: "transporte" })).toBe("transporte");
  });
});

describe("agrupación por sector", () => {
  it("respeta el orden de SECTORES y no dibuja grupos vacíos", () => {
    const grupos = agruparPorSector(HOY);
    expect(grupos.map((g) => g.label)).toEqual([
      "Sector privado",
      "Gastronomía y hotelería",
      "Transporte y logística",
    ]);
    expect(grupos.every((g) => g.convenios.length > 0)).toBe(true);
  });

  it("un convenio sin sector, o con uno inventado, sigue apareciendo", () => {
    const grupos = agruparPorSector([
      { id: "a", nombre: "Sin sector" },
      { id: "b", nombre: "Sector inventado", sector: "marciano" },
      { id: "c", nombre: "Del agro", sector: "rural" },
    ]);
    expect(grupos.map((g) => g.label)).toEqual(["Sector privado", "Rural y agro"]);
    expect(nombres(grupos[0].convenios)).toEqual(["Sector inventado", "Sin sector"]);
  });

  it("no pierde ni duplica convenios al agrupar", () => {
    const lista = [
      ...muchos("privado", 12, "Privado"),
      ...muchos("transporte", 6, "Transporte"),
      ...muchos("construccion", 4, "Construccion"),
      { id: "huerfano", nombre: "Sin sector" },
    ];
    const ids = agruparPorSector(lista).flatMap((g) => g.convenios.map((c) => c.id));
    expect(ids).toHaveLength(lista.length);
    expect(new Set(ids).size).toBe(lista.length);
  });

  it("dentro de cada grupo sigue el orden alfabético", () => {
    const lista = [
      { id: "b", nombre: "Bancarios", sector: "privado" },
      { id: "a", nombre: "Aceiteros", sector: "privado" },
      { id: "c", nombre: "Camioneros", sector: "transporte" },
    ];
    expect(nombres(agruparPorSector(lista)[0].convenios)).toEqual(["Aceiteros", "Bancarios"]);
  });

  it("con lista vacía no devuelve encabezados", () => {
    expect(agruparPorSector([])).toEqual([]);
    expect(agruparPorSector(undefined)).toEqual([]);
  });

  it("todos los sectores de SECTORES pueden agruparse", () => {
    const uno = SECTORES.map((s, i) => ({ id: `s-${i}`, nombre: `Conv ${i}`, sector: s.value }));
    expect(agruparPorSector(uno)).toHaveLength(SECTORES.length);
  });
});

describe("umbrales de la portada", () => {
  it("con los 3 convenios de hoy no aparece ni el buscador ni la agrupación", () => {
    expect(debeBuscar(HOY.length)).toBe(false);
    expect(debeAgrupar(HOY.length)).toBe(false);
  });

  it("con 30 aparecen los dos", () => {
    expect(debeBuscar(30)).toBe(true);
    expect(debeAgrupar(30)).toBe(true);
  });

  it("los umbrales son inclusivos", () => {
    expect(debeBuscar(UMBRAL_BUSCADOR)).toBe(true);
    expect(debeBuscar(UMBRAL_BUSCADOR - 1)).toBe(false);
    expect(debeAgrupar(UMBRAL_AGRUPAR)).toBe(true);
    expect(debeAgrupar(UMBRAL_AGRUPAR - 1)).toBe(false);
  });

  it("el buscador llega antes que la agrupación", () => {
    expect(UMBRAL_BUSCADOR).toBeLessThanOrEqual(UMBRAL_AGRUPAR);
  });
});
