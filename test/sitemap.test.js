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
  it("lista las fijas y, por convenio activo, la calculadora, sus acuerdos (y cada acuerdo) y sus novedades si tiene, ordenadas", async () => {
    vi.stubGlobal("fetch", firestoreSimulado({
      convenios: [doc("convenios", "comercio-cct-130-75", { activo: true, ultimo_periodo: "2026-09" }), doc("convenios", "camioneros-cct-40-89", { activo: true }), doc("convenios", "uocra-cct-76-75", { activo: false })],
      acuerdos: [doc("acuerdos", "a1", { convenioId: "camioneros-cct-40-89", fecha: "2026-09-01", titulo: "Escala salarial septiembre 2026", published: true })],
      novedades: [doc("novedades", "n1", { date: "2026-09-13", convenioId: "comercio-cct-130-75", published: true })],
    }));
    const entradas = await sitemap();
    expect(entradas.map((e) => e.url)).toEqual([
      "https://liquidar.ar",
      "https://liquidar.ar/novedades",
      "https://liquidar.ar/acuerdos",
      "https://liquidar.ar/calcular/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026",
      "https://liquidar.ar/calcular/comercio-cct-130-75",
      "https://liquidar.ar/acuerdos/comercio-cct-130-75",
      "https://liquidar.ar/novedades/comercio-cct-130-75",
    ]);
    expect(entradas.find((e) => e.url.endsWith("/calcular/comercio-cct-130-75")).lastModified).toEqual(new Date("2026-09-01T00:00:00Z"));
  });

  it("sin novedades publicadas, ninguna página de novedades va al mapa", async () => {
    vi.stubGlobal("fetch", firestoreSimulado({ convenios: [doc("convenios", "comercio-cct-130-75", { activo: true })] }));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes("/novedades"))).toBe(false);
  });

  it("una escala publicada por adelantado no lleva la fecha de la calculadora al futuro ni la mueve en cada pedido", async () => {
    vi.stubGlobal("fetch", firestoreSimulado({ convenios: [doc("convenios", "comercio-cct-130-75", { activo: true, ultimo_periodo: "2099-12" })] }));
    const calculadora = (await sitemap()).find((e) => e.url.endsWith("/calcular/comercio-cct-130-75"));
    // El primer día del mes en curso: la misma fecha en todos los pedidos del mes.
    const ahora = new Date();
    expect(calculadora.lastModified).toEqual(new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)));
  });

  it("lee los meses cargados de cada convenio: el acuerdo que muestra su escala lleva la fecha de ese cambio", async () => {
    const base = firestoreSimulado({
      convenios: [doc("convenios", "camioneros-cct-40-89", { activo: true, ultimo_periodo: "2026-09" })],
      acuerdos: [doc("acuerdos", "a1", { convenioId: "camioneros-cct-40-89", fecha: "2026-09-01", titulo: "Escala salarial septiembre 2026", tipo: "escala", vigencia: "septiembre 2026", creadoEl: "2026-10-10T20:05:00.000Z", published: true })],
    });
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      const ruta = String(url).split("/documents/")[1] || "";
      if (ruta.startsWith("convenios/camioneros-cct-40-89/escalas?")) {
        return { ok: true, status: 200, json: async () => ({ documents: [{ name: "projects/p/databases/(default)/documents/convenios/camioneros-cct-40-89/escalas/2026-09" }] }) };
      }
      return base(url);
    }));
    const acuerdo = (await sitemap()).find((e) => e.url.endsWith("/escala-salarial-septiembre-2026"));
    expect(acuerdo.lastModified).toEqual(new Date("2026-11-27T00:00:00Z"));
  });

  it("si no se pueden leer los meses cargados, el acuerdo sale igual, con su fecha", async () => {
    const base = firestoreSimulado({
      convenios: [doc("convenios", "camioneros-cct-40-89", { activo: true })],
      acuerdos: [doc("acuerdos", "a1", { convenioId: "camioneros-cct-40-89", fecha: "2026-09-01", titulo: "Escala salarial septiembre 2026", tipo: "escala", vigencia: "septiembre 2026", creadoEl: "2026-10-10T20:05:00.000Z", published: true })],
    });
    vi.stubGlobal("fetch", vi.fn(async (url) => (String(url).includes("/escalas?") ? { ok: false, status: 500, json: async () => ({}) } : base(url))));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    const acuerdo = (await sitemap()).find((e) => e.url.endsWith("/escala-salarial-septiembre-2026"));
    expect(acuerdo.lastModified).toEqual(new Date("2026-10-10T20:05:00.000Z"));
    silencio.mockRestore();
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
    expect(urls).toEqual(["https://liquidar.ar", "https://liquidar.ar/acuerdos"]);
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
