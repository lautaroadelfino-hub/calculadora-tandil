// test/paginasDeConvenio.test.js
// Las páginas de acuerdos y de novedades por convenio, y el índice de acuerdos.
// Firestore se simula con la forma de su API REST (como en sitemap.test.js);
// las páginas son componentes de servidor asincrónicos: se ejecutan, y el
// árbol que devuelven se pasa a HTML con react-dom/server para mirar el texto.
//
// Lo que se protege: el 404 real de un convenio inexistente (notFound() lanza
// y tiene que llegar hasta Next, no quedar atrapado en un try), la lista
// ordenada y sólo con lo publicado, los links de descarga y la pantalla de
// "sin datos" cuando Firestore no responde.

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PaginaAcuerdos from "../app/acuerdos/[convenioId]/page.jsx";
import PaginaAcuerdo, { generateMetadata as metadataDelAcuerdo } from "../app/acuerdos/[convenioId]/[slug]/page.jsx";
import IndiceAcuerdos from "../app/acuerdos/page.jsx";
import PaginaNovedades from "../app/novedades/[convenioId]/page.jsx";
import NovedadesGenerales, { metadata as metadataDeNovedades } from "../app/novedades/page.jsx";

afterEach(() => vi.unstubAllGlobals());

const str = (v) => ({ stringValue: v });
const bool = (v) => ({ booleanValue: v });
const docRest = (coleccion, id, campos) => ({
  name: `projects/p/databases/(default)/documents/${coleccion}/${id}`,
  fields: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, typeof v === "boolean" ? bool(v) : str(v)])),
});

const CONVENIOS = {
  "camioneros-cct-40-89": { nombre: "Camioneros", cct: "40/89", activo: true },
  "uocra-cct-76-75": { nombre: "UOCRA", cct: "76/75", activo: false },
};

const ACUERDOS = [
  docRest("acuerdos", "a1", { convenioId: "camioneros-cct-40-89", fecha: "2026-08-03", titulo: "Escala salarial agosto 2026", tipo: "escala", archivoUrl: "https://storage/a1.pdf", archivoTipo: "application/pdf", published: true }),
  docRest("acuerdos", "a2", { convenioId: "camioneros-cct-40-89", fecha: "2026-05-30", titulo: "Acta acuerdo mayo 2026", tipo: "acuerdo", fuenteUrl: "https://sindicato.org/acta", published: true }),
  docRest("acuerdos", "a3", { convenioId: "camioneros-cct-40-89", fecha: "2026-09-01", titulo: "Borrador que no se ve", tipo: "escala", published: false }),
  docRest("acuerdos", "a4", { convenioId: "uocra-cct-76-75", fecha: "2026-07-01", titulo: "Escala UOCRA julio 2026", tipo: "escala", archivoUrl: "https://storage/a4.jpg", archivoTipo: "image/jpeg", published: true }),
];

const NOVEDADES = [
  docRest("novedades", "n1", { date: "2026-09-13", title: "Novedad general del sitio", tag: "release", published: true }),
  docRest("novedades", "n2", { date: "2026-08-03", title: "Camioneros: nueva escala cargada", tag: "aviso", convenioId: "camioneros-cct-40-89", published: true }),
];

/** Un fetch que contesta como la API REST de Firestore según la URL pedida. */
function firestoreSimulado() {
  return vi.fn(async (url) => {
    const ruta = String(url).split("/documents/")[1] || "";
    const ok = (json) => ({ ok: true, status: 200, json: async () => json });
    if (ruta.startsWith("convenios/")) {
      const id = decodeURIComponent(ruta.slice("convenios/".length).split("?")[0]);
      const c = CONVENIOS[id];
      return c ? ok(docRest("convenios", id, c)) : { ok: false, status: 404, json: async () => ({}) };
    }
    if (ruta.startsWith("convenios?")) return ok({ documents: Object.entries(CONVENIOS).map(([id, c]) => docRest("convenios", id, c)) });
    if (ruta.startsWith("acuerdos?")) return ok({ documents: ACUERDOS });
    if (ruta.startsWith("novedades?")) return ok({ documents: NOVEDADES });
    return { ok: false, status: 404, json: async () => ({}) };
  });
}

const params = (convenioId) => ({ params: Promise.resolve({ convenioId }) });
const html = async (promesa) => renderToStaticMarkup(await promesa);

describe("/acuerdos/<convenio>", () => {
  it("lista los acuerdos publicados del convenio, del más nuevo al más viejo, con descarga y fuente", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const h = await html(PaginaAcuerdos(params("camioneros-cct-40-89")));
    expect(h).toContain("Camioneros");
    expect(h).toContain("CCT 40/89");
    expect(h.indexOf("Escala salarial agosto 2026")).toBeLessThan(h.indexOf("Acta acuerdo mayo 2026"));
    expect(h).not.toContain("Borrador que no se ve");
    expect(h).not.toContain("Escala UOCRA");
    expect(h).toContain('href="https://storage/a1.pdf"');
    expect(h).toContain("Descargar PDF");
    expect(h).toContain('href="https://sindicato.org/acta"');
    // Las otras dos páginas del convenio.
    expect(h).toContain('href="/calcular/camioneros-cct-40-89"');
    expect(h).toContain('href="/novedades/camioneros-cct-40-89"');
  });

  it("un convenio inactivo tiene su página, sin link a la calculadora", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const h = await html(PaginaAcuerdos(params("uocra-cct-76-75")));
    expect(h).toContain("Escala UOCRA julio 2026");
    expect(h).toContain("Descargar JPG");
    expect(h).toContain("Calculadora en preparación");
    expect(h).not.toContain('href="/calcular/uocra-cct-76-75"');
  });

  it("un convenio que no existe es un 404 de verdad", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    await expect(PaginaAcuerdos(params("no-existe"))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    await expect(PaginaAcuerdos(params(".."))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });

  it("si Firestore no responde, ofrece recargar y no se indexa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    const h = await html(PaginaAcuerdos(params("camioneros-cct-40-89")));
    expect(h).toContain("No pudimos traer los acuerdos");
    expect(h).toContain("noindex");
    expect(h).toContain('href="/acuerdos/camioneros-cct-40-89"');
    silencio.mockRestore();
  });
});

describe("/acuerdos", () => {
  it("un bloque por convenio con acuerdos, en orden alfabético, con link a la página del convenio", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const h = await html(IndiceAcuerdos());
    expect(h.indexOf("Camioneros")).toBeLessThan(h.indexOf("UOCRA"));
    expect(h).toContain('href="/acuerdos/camioneros-cct-40-89"');
    expect(h).toContain('href="/acuerdos/uocra-cct-76-75"');
    expect(h).not.toContain("Borrador que no se ve");
  });
});

describe("/novedades/<convenio>", () => {
  it("muestra sólo las novedades de ese convenio, con el tag en castellano", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const h = await html(PaginaNovedades(params("camioneros-cct-40-89")));
    expect(h).toContain("Camioneros: nueva escala cargada");
    expect(h).not.toContain("Novedad general del sitio");
    expect(h).toContain("Aviso");
    expect(h).toContain('href="/acuerdos/camioneros-cct-40-89"');
  });

  it("un convenio que no existe es un 404 de verdad", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    await expect(PaginaNovedades(params("no-existe"))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });
});

describe("/acuerdos/<convenio>/<slug>: la página de un acuerdo", () => {
  const params2 = (convenioId, slug) => ({ params: Promise.resolve({ convenioId, slug }) });

  it("muestra el acuerdo con su descarga, la fuente, el anterior y el siguiente, y el paso a la calculadora", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const h = await html(PaginaAcuerdo(params2("camioneros-cct-40-89", "acta-acuerdo-mayo-2026")));
    expect(h).toMatch(/<h1[^>]*>Acta acuerdo mayo 2026<\/h1>/);
    expect(h).toContain("Acuerdo paritario de Camioneros (CCT 40/89) del");
    expect(h).toContain('href="https://sindicato.org/acta"');
    expect(h).toContain('href="/calcular/camioneros-cct-40-89"');
    // El siguiente (más nuevo) es la escala de agosto; no hay anterior.
    expect(h).toContain('href="/acuerdos/camioneros-cct-40-89/escala-salarial-agosto-2026"');
    // Datos estructurados: migas y documento.
    expect(h).toContain('"@type":"BreadcrumbList"');
    expect(h).toContain('"@type":"DigitalDocument"');
    expect(h).toContain('"datePublished":"2026-05-30"');
  });

  it("la metadata lleva el título del acuerdo, el convenio y el canonical con el slug", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const m = await metadataDelAcuerdo(params2("camioneros-cct-40-89", "escala-salarial-agosto-2026"));
    expect(m.title).toBe("Escala salarial agosto 2026 · Camioneros (CCT 40/89)");
    expect(m.alternates.canonical).toBe("/acuerdos/camioneros-cct-40-89/escala-salarial-agosto-2026");
    expect(m.openGraph.url).toBe(m.alternates.canonical);
    expect((await metadataDelAcuerdo(params2("camioneros-cct-40-89", "no-existe"))).title).toBe("Acuerdos y escalas");
  });

  it("404 real con slug inexistente, mal formado, despublicado o de otro convenio", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    for (const [c, s] of [["camioneros-cct-40-89", "no-existe"], ["camioneros-cct-40-89", "Escala-Salarial-Agosto-2026"], ["camioneros-cct-40-89", ".."], ["camioneros-cct-40-89", "borrador-que-no-se-ve"], ["uocra-cct-76-75", "escala-salarial-agosto-2026"], ["no-existe", "x"]]) {
      await expect(PaginaAcuerdo(params2(c, s))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    }
  });

  it("si Firestore no responde, ofrece recargar y no se indexa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    const h = await html(PaginaAcuerdo(params2("camioneros-cct-40-89", "escala-salarial-agosto-2026")));
    expect(h).toContain("No pudimos traer el acuerdo");
    expect(h).toContain("noindex");
    silencio.mockRestore();
  });

  it("la lista del convenio y el índice enlazan a la página de cada acuerdo", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const lista = await html(PaginaAcuerdos(params("camioneros-cct-40-89")));
    expect(lista).toContain('href="/acuerdos/camioneros-cct-40-89/escala-salarial-agosto-2026"');
    const indice = await html(IndiceAcuerdos());
    expect(indice).toContain('href="/acuerdos/camioneros-cct-40-89/escala-salarial-agosto-2026"');
    // El ícono de descarga sigue yendo al archivo, como link hermano.
    expect(indice).toContain('href="https://storage/a1.pdf"');
  });
});

describe("/novedades (todas)", () => {
  it("se arma en el servidor con todas las publicadas y el chip del convenio", async () => {
    vi.stubGlobal("fetch", firestoreSimulado());
    const h = await html(NovedadesGenerales());
    expect(h).toContain("Novedad general del sitio");
    expect(h).toContain("Camioneros: nueva escala cargada");
    expect(h).toContain('href="/novedades/camioneros-cct-40-89"');
    expect(h).not.toContain("animate-pulse");
  });

  it("tiene canonical propio (antes heredaba el de la portada)", () => {
    expect(metadataDeNovedades.alternates.canonical).toBe("/novedades");
    expect(metadataDeNovedades.openGraph.url).toBe("/novedades");
  });

  it("si Firestore no responde, ofrece recargar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await html(NovedadesGenerales())).toContain("No pudimos traer las novedades");
    silencio.mockRestore();
  });
});
