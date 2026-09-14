// test/sitemap.test.js
// El mapa del sitio que leen los buscadores. Una URL listada que ya no existe
// es un 404 indexado; una que redirige es ruido. Se verifica lo que no tiene
// que estar tanto como lo que sí. Las calculadoras salen de Firestore (por
// REST): acá Firestore se simula.

import { describe, it, expect, vi, afterEach } from "vitest";
import sitemap from "../app/sitemap.js";

afterEach(() => vi.unstubAllGlobals());

function firestoreConConvenios(documentos) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ documents: documentos }) }));
}

const doc = (id, activo) => ({
  name: `projects/p/databases/(default)/documents/convenios/${id}`,
  fields: { activo: { booleanValue: activo } },
});

describe("sitemap", () => {
  it("lista la portada, las novedades y una calculadora por convenio activo, ordenadas", async () => {
    vi.stubGlobal("fetch", firestoreConConvenios([doc("comercio-cct-130-75", true), doc("camioneros-cct-40-89", true), doc("uocra-cct-76-75", false)]));
    const entradas = await sitemap();
    const urls = entradas.map((e) => e.url);
    expect(urls).toEqual([
      "https://liquidar.ar",
      "https://liquidar.ar/novedades",
      "https://liquidar.ar/calcular/camioneros-cct-40-89",
      "https://liquidar.ar/calcular/comercio-cct-130-75",
    ]);
  });

  it("no lista /empleador: el panel se retiró el 13/9/2026 y la URL sólo redirige", async () => {
    vi.stubGlobal("fetch", firestoreConConvenios([]));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/empleador"))).toBe(false);
  });

  it("si Firestore no responde, salen las páginas fijas igual", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual(["https://liquidar.ar", "https://liquidar.ar/novedades"]);
    silencio.mockRestore();
  });

  it("cada entrada tiene URL absoluta y prioridad entre 0 y 1", async () => {
    vi.stubGlobal("fetch", firestoreConConvenios([doc("comercio-cct-130-75", true)]));
    for (const e of await sitemap()) {
      expect(e.url).toMatch(/^https:\/\/liquidar\.ar/);
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1);
    }
  });
});
