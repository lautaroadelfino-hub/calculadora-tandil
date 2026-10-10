// test/acuerdosPublicados.test.js
// Los acuerdos por convenio: qué se muestra, qué se valida y cómo se nombra el archivo.

import { describe, it, expect } from "vitest";
import {
  TIPOS_DE_ACUERDO,
  FORMATOS_PERMITIDOS,
  TAMANO_MAXIMO_BYTES,
  etiquetaDeTipo,
  etiquetaDeFormato,
  tipoDeArchivo,
  validarArchivo,
  esFechaValida,
  validarAcuerdo,
  nombreDeArchivo,
  acuerdosPublicados,
  ultimoAcuerdoPorConvenio,
} from "../lib/acuerdosPublicados.js";

const ACUERDOS = [
  { id: "a", convenioId: "camioneros", fecha: "2026-08-03", published: true },
  { id: "b", convenioId: "comercio", fecha: "2026-09-10", published: false },
  { id: "c", convenioId: "comercio", fecha: "2026-07-15" },
  { id: "d", convenioId: "camioneros", fecha: "2026-05-30", published: 0 },
  { id: "e", convenioId: "camioneros", fecha: "2026-06-01", published: true },
];

describe("acuerdosPublicados", () => {
  it("deja los publicados, del más nuevo al más viejo", () => {
    expect(acuerdosPublicados(ACUERDOS).map((a) => a.id)).toEqual(["a", "c", "e"]);
  });

  it("filtra por convenio y respeta el límite", () => {
    expect(acuerdosPublicados(ACUERDOS, { convenioId: "camioneros" }).map((a) => a.id)).toEqual(["a", "e"]);
    expect(acuerdosPublicados(ACUERDOS, { convenioId: "camioneros", limite: 1 }).map((a) => a.id)).toEqual(["a"]);
    expect(acuerdosPublicados(ACUERDOS, { convenioId: "uocra" })).toEqual([]);
  });

  it("el admin ve también los borradores", () => {
    expect(acuerdosPublicados(ACUERDOS, { incluirNoPublicadas: true }).map((a) => a.id)).toEqual(["b", "a", "c", "e", "d"]);
  });

  it("sin datos devuelve una lista vacía", () => {
    expect(acuerdosPublicados(undefined)).toEqual([]);
    expect(acuerdosPublicados(null, { convenioId: "x" })).toEqual([]);
  });
});

describe("ultimoAcuerdoPorConvenio", () => {
  it("se queda con la fecha más nueva de cada convenio, ignorando los despublicados", () => {
    expect(ultimoAcuerdoPorConvenio(ACUERDOS)).toEqual({ camioneros: "2026-08-03", comercio: "2026-07-15" });
  });

  it("sin acuerdos no hay fechas", () => {
    expect(ultimoAcuerdoPorConvenio([])).toEqual({});
    expect(ultimoAcuerdoPorConvenio(undefined)).toEqual({});
    expect(ultimoAcuerdoPorConvenio([{ fecha: "2026-01-01", published: true }])).toEqual({});
  });
});

describe("validarAcuerdo", () => {
  const completo = { convenioId: "camioneros", fecha: "2026-08-03", titulo: "Escala agosto 2026", archivo: { name: "x.pdf" } };

  it("un acuerdo completo no tiene errores", () => {
    expect(validarAcuerdo(completo)).toEqual([]);
    expect(validarAcuerdo({ ...completo, archivo: null, fuenteUrl: "https://sindicato.org/escala" })).toEqual([]);
    expect(validarAcuerdo({ ...completo, archivo: null, archivoUrl: "https://storage/x.pdf" })).toEqual([]);
  });

  it("avisa cada cosa que falta", () => {
    expect(validarAcuerdo({ ...completo, convenioId: "" })).toEqual(["Elegí el convenio."]);
    expect(validarAcuerdo({ ...completo, fecha: "03/08/2026" })).toEqual(["La fecha tiene que tener la forma AAAA-MM-DD."]);
    expect(validarAcuerdo({ ...completo, fecha: "2026-02-30" })).toEqual(["La fecha tiene que tener la forma AAAA-MM-DD."]);
    expect(validarAcuerdo({ ...completo, titulo: "   " })).toEqual(["Escribí el título del acuerdo."]);
    expect(validarAcuerdo({ ...completo, archivo: null })).toEqual(["Subí el archivo o pegá el link a la fuente."]);
    expect(validarAcuerdo({ ...completo, fuenteUrl: "www.sindicato.org" })).toEqual([
      "El link a la fuente tiene que empezar con http:// o https://.",
    ]);
    expect(validarAcuerdo({}).length).toBe(4);
    expect(validarAcuerdo(undefined).length).toBe(4);
  });
});

describe("esFechaValida", () => {
  it("acepta AAAA-MM-DD reales y rechaza el resto", () => {
    expect(esFechaValida("2026-08-03")).toBe(true);
    expect(esFechaValida("2026-13-01")).toBe(false);
    expect(esFechaValida("2026-8-3")).toBe(false);
    expect(esFechaValida("")).toBe(false);
    expect(esFechaValida(undefined)).toBe(false);
  });
});

describe("archivos", () => {
  it("acepta PDF, imágenes y Word hasta 10 MB", () => {
    expect(validarArchivo({ type: "application/pdf", size: 1000, name: "a.pdf" })).toBeNull();
    expect(validarArchivo({ type: "image/jpeg", size: 1000, name: "a.jpg" })).toBeNull();
    expect(validarArchivo({ type: "application/pdf", size: TAMANO_MAXIMO_BYTES + 1, name: "a.pdf" })).toMatch(/10 MB/);
    expect(validarArchivo({ type: "application/zip", size: 10, name: "a.zip" })).toMatch(/PDF, JPG, PNG, DOC o DOCX/);
    expect(validarArchivo(null)).toMatch(/Elegí/);
  });

  it("si el navegador no dice el tipo, lo deduce por la extensión", () => {
    expect(tipoDeArchivo({ type: "", name: "cartilla.doc" })).toBe("application/msword");
    expect(tipoDeArchivo({ type: "", name: "ESCALA.JPEG" })).toBe("image/jpeg");
    expect(validarArchivo({ type: "", size: 10, name: "cartilla.doc" })).toBeNull();
    expect(validarArchivo({ type: "", size: 10, name: "cartilla" })).toMatch(/PDF/);
  });

  it("cada formato permitido tiene extensión y etiqueta", () => {
    for (const [tipo, ext] of Object.entries(FORMATOS_PERMITIDOS)) {
      expect(ext).toMatch(/^[a-z0-9]+$/);
      expect(etiquetaDeFormato(tipo)).toBe(ext.toUpperCase());
    }
    expect(etiquetaDeFormato("application/zip")).toBe("");
  });

  it("el nombre en Storage lleva convenio, fecha y título sin acentos", () => {
    expect(nombreDeArchivo("camioneros-cct-40-89", "2026-08-03", "Escala salarial Agosto 2026 (homologación)", "pdf")).toBe(
      "acuerdos/camioneros-cct-40-89/2026-08-03-escala_salarial_agosto_2026_homologacion.pdf"
    );
    expect(nombreDeArchivo("x", "2026-01-01", "", "jpg")).toBe("acuerdos/x/2026-01-01-acuerdo.jpg");
  });
});

describe("tipos de acuerdo", () => {
  it("cada tipo tiene etiqueta en castellano y el desconocido cae en 'Otro'", () => {
    for (const t of TIPOS_DE_ACUERDO) expect(etiquetaDeTipo(t.value)).toBe(t.label);
    expect(etiquetaDeTipo("escala")).toBe("Escala salarial");
    expect(etiquetaDeTipo("cualquier-cosa")).toBe("Otro");
    expect(etiquetaDeTipo(undefined)).toBe("Otro");
  });
});
