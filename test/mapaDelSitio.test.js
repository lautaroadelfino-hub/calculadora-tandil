// test/mapaDelSitio.test.js
// Qué URLs lista el sitemap y con qué fecha. Antes todas decían "ahora".

import { describe, it, expect } from "vitest";
import { armarMapaDelSitio } from "../lib/mapaDelSitio.js";

const convenios = [
  { id: "comercio-cct-130-75", activo: true, ultimo_periodo: "2026-09" },
  { id: "camioneros-cct-40-89", activo: true, ultimo_periodo: "2026-09" },
  { id: "uocra-cct-76-75", activo: false },
  { id: "vacio-cct-1-1", activo: false },
];
const acuerdos = [
  { id: "a1", convenioId: "camioneros-cct-40-89", fecha: "2026-08-03", titulo: "Escala salarial agosto 2026", published: true, creadoEl: "2026-10-10T20:00:00.000Z" },
  { id: "a2", convenioId: "camioneros-cct-40-89", fecha: "2026-09-01", titulo: "Escala salarial septiembre 2026", published: true, creadoEl: "2026-10-10T20:05:00.000Z", actualizadoEl: "2026-10-11T09:00:00.000Z" },
  { id: "a3", convenioId: "camioneros-cct-40-89", fecha: "2026-09-15", titulo: "Borrador", published: false },
  { id: "a4", convenioId: "uocra-cct-76-75", fecha: "2026-07-01", titulo: "Escala UOCRA julio 2026", published: true },
];
const novedades = [
  { id: "n1", date: "2026-09-13", published: true },
  { id: "n2", date: "2026-09-20", convenioId: "comercio-cct-130-75", published: true },
];

describe("armarMapaDelSitio", () => {
  const mapa = armarMapaDelSitio({ convenios, acuerdos, novedades });
  const urls = mapa.map((e) => e.url);
  const de = (ruta) => mapa.find((e) => e.url === `https://liquidar.ar${ruta}`);

  it("lista las fijas, las tres páginas de cada convenio activo y una por acuerdo publicado, en orden", () => {
    expect(urls).toEqual([
      "https://liquidar.ar",
      "https://liquidar.ar/novedades",
      "https://liquidar.ar/acuerdos",
      "https://liquidar.ar/calcular/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-agosto-2026",
      "https://liquidar.ar/novedades/camioneros-cct-40-89",
      "https://liquidar.ar/calcular/comercio-cct-130-75",
      "https://liquidar.ar/acuerdos/comercio-cct-130-75",
      "https://liquidar.ar/novedades/comercio-cct-130-75",
      "https://liquidar.ar/acuerdos/uocra-cct-76-75",
      "https://liquidar.ar/acuerdos/uocra-cct-76-75/escala-uocra-julio-2026",
    ]);
  });

  it("un convenio inactivo entra sólo si tiene acuerdos, y sin calculadora ni novedades", () => {
    expect(urls.some((u) => u.includes("vacio"))).toBe(false);
    expect(urls.some((u) => u.includes("/calcular/uocra"))).toBe(false);
    expect(urls.some((u) => u.includes("/novedades/uocra"))).toBe(false);
  });

  it("las fechas de cambio son reales", () => {
    expect(de("/calcular/camioneros-cct-40-89").lastModified).toEqual(new Date("2026-09-01T00:00:00Z"));
    expect(de("/acuerdos/camioneros-cct-40-89/escala-salarial-agosto-2026").lastModified).toEqual(new Date("2026-10-10T20:00:00.000Z"));
    // Editado después de creado: manda la edición.
    expect(de("/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026").lastModified).toEqual(new Date("2026-10-11T09:00:00.000Z"));
    // Sin creadoEl: la fecha del acuerdo.
    expect(de("/acuerdos/uocra-cct-76-75/escala-uocra-julio-2026").lastModified).toEqual(new Date("2026-07-01T00:00:00Z"));
    // La lista del convenio y la general toman la más nueva.
    expect(de("/acuerdos/camioneros-cct-40-89").lastModified).toEqual(new Date("2026-10-11T09:00:00.000Z"));
    expect(de("/acuerdos").lastModified).toEqual(new Date("2026-10-11T09:00:00.000Z"));
    expect(de("").lastModified).toEqual(new Date("2026-10-11T09:00:00.000Z"));
    // Novedades: la más nueva del convenio; sin novedades, sin fecha.
    expect(de("/novedades/comercio-cct-130-75").lastModified).toEqual(new Date("2026-09-20T00:00:00Z"));
    expect(de("/novedades").lastModified).toEqual(new Date("2026-09-20T00:00:00Z"));
    expect(de("/novedades/camioneros-cct-40-89").lastModified).toBeUndefined();
  });

  it("prioridades entre 0 y 1 y URLs absolutas", () => {
    for (const e of mapa) {
      expect(e.url).toMatch(/^https:\/\/liquidar\.ar/);
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1);
    }
  });

  it("sin datos salen las fijas igual", () => {
    expect(armarMapaDelSitio({}).map((e) => e.url)).toEqual(["https://liquidar.ar", "https://liquidar.ar/novedades", "https://liquidar.ar/acuerdos"]);
    expect(armarMapaDelSitio({}).every((e) => !("lastModified" in e))).toBe(true);
  });
});
