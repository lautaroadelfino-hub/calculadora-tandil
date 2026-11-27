// test/metadataConvenio.test.js
import { describe, it, expect } from "vitest";
import {
  convenioDesdeRest,
  tituloDeConvenio,
  metadataDePagina,
  metadataDeConvenio,
  metadataDeAcuerdos,
  metadataDeAcuerdo,
  metadataDeNovedadesDeConvenio,
} from "../lib/metadataConvenio.js";

const camioneros = { nombre: "Camioneros", cct: "40/89", ultimo_periodo_nombre: "Septiembre 2026" };

describe("el título de la pestaña de cada calculadora", () => {
  it("lee nombre y cct del formato REST de Firestore", () => {
    const rest = { fields: { nombre: { stringValue: "Camioneros" }, cct: { stringValue: "40/89" }, activo: { booleanValue: true } } };
    expect(convenioDesdeRest(rest)).toEqual({ nombre: "Camioneros", cct: "40/89" });
    expect(convenioDesdeRest({})).toBeNull();
    expect(convenioDesdeRest(null)).toBeNull();
  });

  it("arma el título con el CCT, y sin nombre dice 'Calculadora'", () => {
    expect(tituloDeConvenio({ nombre: "Camioneros", cct: "40/89" })).toBe("Camioneros (CCT 40/89)");
    expect(tituloDeConvenio({ nombre: "Empleados de Comercio" })).toBe("Empleados de Comercio");
    expect(tituloDeConvenio(null)).toBe("Calculadora");
  });

  it("la calculadora dice 'Calculadora de sueldo de…', nombra la escala y lleva canonical propio", () => {
    const m = metadataDeConvenio(camioneros, "camioneros-cct-40-89");
    expect(m.title).toBe("Calculadora de sueldo de Camioneros (CCT 40/89)");
    expect(m.alternates.canonical).toBe("/calcular/camioneros-cct-40-89");
    expect(m.openGraph.url).toBe("/calcular/camioneros-cct-40-89");
    expect(m.description).toMatch(/Camioneros/);
    expect(m.description).toMatch(/Septiembre 2026/);
    expect(metadataDeConvenio({ nombre: "Comercio" }, "x").description).toMatch(/escalas vigentes/);
    expect(metadataDeConvenio(null, "x").description).toBeUndefined();
    expect(metadataDeConvenio(null, "x").title).toBe("Calculadora");
  });
});

describe("metadataDePagina", () => {
  it("no repite título ni descripción en openGraph: los completa Next desde la página", () => {
    const m = metadataDePagina({ title: "Novedades", description: "d", canonical: "/novedades" });
    expect(m.openGraph).toMatchObject({ type: "website", locale: "es_AR", siteName: "LiquidAR", url: "/novedades" });
    expect(m.openGraph.images[0].url).toBe("/brand/compartir.png");
    expect(m.openGraph.title).toBeUndefined();
    expect(m.alternates.canonical).toBe("/novedades");
    expect(metadataDePagina({ title: "x", canonical: "/x" }).description).toBeUndefined();
  });
});

describe("las páginas de acuerdos y de novedades de un convenio", () => {
  it("acuerdos: título con el convenio, canonical en /acuerdos", () => {
    const m = metadataDeAcuerdos(camioneros, "camioneros-cct-40-89");
    expect(m.title).toBe("Acuerdos y escalas · Camioneros (CCT 40/89)");
    expect(m.alternates.canonical).toBe("/acuerdos/camioneros-cct-40-89");
    expect(m.description).toMatch(/Camioneros/);
    expect(metadataDeAcuerdos(null, "x").title).toBe("Acuerdos y escalas");
    expect(metadataDeAcuerdos(null, "x").description).toBeUndefined();
  });

  it("un acuerdo: título del documento más el convenio, canonical con el slug, tipo article", () => {
    const acuerdo = { titulo: "Escala salarial septiembre 2026", tipo: "escala", fecha: "2026-09-01", vigencia: "septiembre 2026", archivoUrl: "https://x/a.pdf", slug: "escala-salarial-septiembre-2026" };
    const m = metadataDeAcuerdo(acuerdo, camioneros, "camioneros-cct-40-89", { etiquetaDeTipo: () => "Escala salarial", fechaLarga: () => "1 sept 2026" });
    expect(m.title).toBe("Escala salarial septiembre 2026 · Camioneros (CCT 40/89)");
    expect(m.alternates.canonical).toBe("/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026");
    expect(m.openGraph.type).toBe("article");
    expect(m.description).toBe("Escala salarial de Camioneros (CCT 40/89) del 1 sept 2026, vigencia septiembre 2026. Descargá el documento y calculá el sueldo con la escala vigente.");
    const sinArchivo = metadataDeAcuerdo({ ...acuerdo, archivoUrl: null, vigencia: null }, camioneros, "c", { fechaLarga: () => "f" });
    expect(sinArchivo.description).toMatch(/^escala de Camioneros \(CCT 40\/89\) del f\. Mirá la fuente/);
  });

  it("un acuerdo que muestra su escala lo dice primero: cuántas categorías y de qué meses", () => {
    const acuerdo = { titulo: "Escalas salariales octubre 2026 a mayo 2027", tipo: "escala", fecha: "2026-10-01", vigencia: "octubre 2026 a mayo 2027", archivoUrl: "https://x/a.pdf", slug: "escalas" };
    const comercio = { nombre: "Empleados de Comercio", cct: "130/75" };
    const opciones = { etiquetaDeTipo: () => "Escala salarial", fechaLarga: () => "1 oct 2026" };
    const variosMeses = metadataDeAcuerdo(acuerdo, comercio, "comercio-cct-130-75", { ...opciones, escalas: { categorias: 21, meses: "octubre a diciembre de 2026", variosMeses: true } });
    expect(variosMeses.description).toBe("Básico de las 21 categorías de Empleados de Comercio (CCT 130/75) en octubre a diciembre de 2026, mes por mes. Descargá el documento y calculá el sueldo con la escala vigente.");
    const unMes = metadataDeAcuerdo(acuerdo, camioneros, "c", { ...opciones, escalas: { categorias: 43, meses: "noviembre de 2026", variosMeses: false } });
    expect(unMes.description).toBe("Básico de las 43 categorías de Camioneros (CCT 40/89) en noviembre de 2026. Descargá el documento y calculá el sueldo con la escala vigente.");
    // El título no cambia: la URL ya puede estar en Google con ese título.
    expect(variosMeses.title).toBe("Escalas salariales octubre 2026 a mayo 2027 · Empleados de Comercio (CCT 130/75)");
    // Sin escala que mostrar, la descripción de siempre.
    expect(metadataDeAcuerdo(acuerdo, comercio, "c", { ...opciones, escalas: null }).description).toMatch(/^Escala salarial de Empleados de Comercio \(CCT 130\/75\) del 1 oct 2026/);
  });

  it("novedades: título con el convenio, canonical en /novedades", () => {
    const m = metadataDeNovedadesDeConvenio(camioneros, "camioneros-cct-40-89");
    expect(m.title).toBe("Novedades · Camioneros (CCT 40/89)");
    expect(m.alternates.canonical).toBe("/novedades/camioneros-cct-40-89");
    expect(metadataDeNovedadesDeConvenio(null, "x").title).toBe("Novedades");
  });
});
