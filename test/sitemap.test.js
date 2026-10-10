// test/sitemap.test.js
// El mapa del sitio que leen los buscadores. Una URL listada que ya no existe
// es un 404 indexado; una que redirige es ruido. Se verifica lo que no tiene
// que estar tanto como lo que sí. Las páginas salen de Firestore (por REST):
// acá Firestore se simula por ruta. La lógica fina está en
// test/mapaDelSitio.test.js; esto prueba que la ruta lee lo que tiene que leer.

import { describe, it, expect, vi, afterEach } from "vitest";
import sitemap from "../app/sitemap.js";

afterEach(() => vi.unstubAllGlobals());

const doc = (coleccion, id, campos) => ({
  name: `projects/p/databases/(default)/documents/${coleccion}/${id}`,
  fields: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, typeof v === "boolean" ? { booleanValue: v } : { stringValue: v }])),
});

function firestoreSimulado({ convenios = [], acuerdos = [], novedades = [] }) {
  return vi.fn(async (url) => {
    const ruta = String(url).split("/documents/")[1] || "";
    const ok = (json) => ({ ok: true, status: 200, json: async () => json });
    if (ruta.startsWith("convenios?")) return ok({ documents: convenios });
    if (ruta.startsWith("acuerdos?")) return ok({ documents: acuerdos });
    if (ruta.startsWith("novedades?")) return ok({ documents: novedades });
    return { ok: false, status: 404, json: async () => ({}) };
  });
}

describe("sitemap", () => {
  it("lista las fijas y, por convenio activo, la calculadora, sus acuerdos (y cada acuerdo) y sus novedades, ordenadas", async () => {
    vi.stubGlobal("fetch", firestoreSimulado({
      convenios: [doc("convenios", "comercio-cct-130-75", { activo: true, ultimo_periodo: "2026-09" }), doc("convenios", "camioneros-cct-40-89", { activo: true }), doc("convenios", "uocra-cct-76-75", { activo: false })],
      acuerdos: [doc("acuerdos", "a1", { convenioId: "camioneros-cct-40-89", fecha: "2026-09-01", titulo: "Escala salarial septiembre 2026", published: true })],
    }));
    const entradas = await sitemap();
    expect(entradas.map((e) => e.url)).toEqual([
      "https://liquidar.ar",
      "https://liquidar.ar/novedades",
      "https://liquidar.ar/acuerdos",
      "https://liquidar.ar/calcular/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026",
      "https://liquidar.ar/novedades/camioneros-cct-40-89",
      "https://liquidar.ar/calcular/comercio-cct-130-75",
      "https://liquidar.ar/acuerdos/comercio-cct-130-75",
      "https://liquidar.ar/novedades/comercio-cct-130-75",
    ]);
    expect(entradas.find((e) => e.url.endsWith("/calcular/comercio-cct-130-75")).lastModified).toEqual(new Date("2026-09-01T00:00:00Z"));
  });

  it("no lista /empleador: el panel se retiró el 13/9/2026 y la URL sólo redirige", async () => {
    vi.stubGlobal("fetch", firestoreSimulado({}));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/empleador"))).toBe(false);
  });

  it("si Firestore no responde, salen las páginas fijas igual", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual(["https://liquidar.ar", "https://liquidar.ar/novedades", "https://liquidar.ar/acuerdos"]);
    silencio.mockRestore();
  });

  it("si sólo fallan los acuerdos, las páginas de convenio salen igual", async () => {
    const base = firestoreSimulado({ convenios: [doc("convenios", "comercio-cct-130-75", { activo: true })] });
    vi.stubGlobal("fetch", vi.fn(async (url) => (String(url).includes("/acuerdos?") ? { ok: false, status: 500, json: async () => ({}) } : base(url))));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://liquidar.ar/calcular/comercio-cct-130-75");
    silencio.mockRestore();
  });

  it("cada entrada tiene URL absoluta y prioridad entre 0 y 1", async () => {
    vi.stubGlobal("fetch", firestoreSimulado({ convenios: [doc("convenios", "comercio-cct-130-75", { activo: true })] }));
    for (const e of await sitemap()) {
      expect(e.url).toMatch(/^https:\/\/liquidar\.ar/);
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1);
    }
  });
});
