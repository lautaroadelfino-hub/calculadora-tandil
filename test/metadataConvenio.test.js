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
    expect(m.openGraph.images[0].url).toBe("/opengraph-image.png");
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

  it("novedades: título con el convenio, canonical en /novedades", () => {
    const m = metadataDeNovedadesDeConvenio(camioneros, "camioneros-cct-40-89");
    expect(m.title).toBe("Novedades · Camioneros (CCT 40/89)");
    expect(m.alternates.canonical).toBe("/novedades/camioneros-cct-40-89");
    expect(metadataDeNovedadesDeConvenio(null, "x").title).toBe("Novedades");
  });
});
