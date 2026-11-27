// test/mapaDelSitio.test.js
// Qué URLs lista el sitemap y con qué fecha. Antes todas decían "ahora".
// Desde el 27/11/2026: una página de novedades entra sólo si tiene alguna
// publicada, una fecha futura se cambia por el primer día del mes (no por
// "ahora", que se movía en cada pedido) y la página de un acuerdo que pasó a
// mostrar su escala lleva la fecha de ese cambio.

import { describe, it, expect } from "vitest";
import { armarMapaDelSitio, ESCALAS_EN_LA_PAGINA_DESDE } from "../lib/mapaDelSitio.js";

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

  it("lista las fijas, las páginas de cada convenio activo y una por acuerdo publicado, en orden", () => {
    expect(urls).toEqual([
      "https://liquidar.ar",
      "https://liquidar.ar/novedades",
      "https://liquidar.ar/acuerdos",
      "https://liquidar.ar/calcular/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026",
      "https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-agosto-2026",
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
    // Novedades: la más nueva del convenio, y la más nueva de todas en la general.
    expect(de("/novedades/comercio-cct-130-75").lastModified).toEqual(new Date("2026-09-20T00:00:00Z"));
    expect(de("/novedades").lastModified).toEqual(new Date("2026-09-20T00:00:00Z"));
  });

  it("una página de novedades entra sólo si tiene alguna publicada", () => {
    // Camioneros no tiene ninguna: su página dice "Todavía no hay novedades" y no va al mapa.
    expect(de("/novedades/camioneros-cct-40-89")).toBeUndefined();
    const sinPublicar = armarMapaDelSitio({ convenios, acuerdos, novedades: novedades.map((n) => ({ ...n, published: false })) });
    expect(sinPublicar.some((e) => e.url.includes("/novedades"))).toBe(false);
    // Con una sola novedad de un convenio entran su página y la general.
    const una = armarMapaDelSitio({ convenios, acuerdos, novedades: [{ id: "n9", date: "2026-11-26", convenioId: "camioneros-cct-40-89", published: true }] });
    expect(una.filter((e) => e.url.includes("/novedades")).map((e) => e.url)).toEqual([
      "https://liquidar.ar/novedades",
      "https://liquidar.ar/novedades/camioneros-cct-40-89",
    ]);
  });

  it("ninguna fecha de cambio pasa de hoy ni se mueve de un pedido al otro: una escala publicada por adelantado lleva el primer día del mes", () => {
    const hoy = new Date("2026-10-22T12:00:00Z");
    const adelantado = [
      { id: "comercio-cct-130-75", activo: true, ultimo_periodo: "2026-11" },
      { id: "camioneros-cct-40-89", activo: true, ultimo_periodo: "2026-09" },
    ];
    const futuro = armarMapaDelSitio({ convenios: adelantado, acuerdos, novedades, hoy });
    const en = (ruta) => futuro.find((e) => e.url === `https://liquidar.ar${ruta}`);
    expect(en("/calcular/comercio-cct-130-75").lastModified).toEqual(new Date("2026-10-01T00:00:00Z"));
    expect(en("/calcular/camioneros-cct-40-89").lastModified).toEqual(new Date("2026-09-01T00:00:00Z"));
    expect(futuro.every((e) => !e.lastModified || e.lastModified <= hoy)).toBe(true);
    // Un segundo después, la misma fecha: hasta el 27/11/2026 salía "ahora" y cambiaba en cada lectura.
    const despues = armarMapaDelSitio({ convenios: adelantado, acuerdos, novedades, hoy: new Date(hoy.getTime() + 1000) });
    expect(despues.find((e) => e.url.endsWith("/calcular/comercio-cct-130-75")).lastModified).toEqual(en("/calcular/comercio-cct-130-75").lastModified);
    // Cuando llega el mes de la escala, la fecha es la suya.
    const enNoviembre = armarMapaDelSitio({ convenios: adelantado, acuerdos, novedades, hoy: new Date("2026-11-03T12:00:00Z") });
    expect(enNoviembre.find((e) => e.url.endsWith("/calcular/comercio-cct-130-75")).lastModified).toEqual(new Date("2026-11-01T00:00:00Z"));
  });

  it("la página de un acuerdo que muestra su escala, o lleva a la que la muestra, tiene por lo menos la fecha de ese cambio", () => {
    const desde = new Date(`${ESCALAS_EN_LA_PAGINA_DESDE}T00:00:00Z`);
    const conTipo = [
      { id: "e9", convenioId: "camioneros-cct-40-89", fecha: "2026-09-01", titulo: "Escala salarial septiembre 2026", tipo: "escala", vigencia: "septiembre 2026", published: true, creadoEl: "2026-10-10T20:05:00.000Z" },
      { id: "e8", convenioId: "camioneros-cct-40-89", fecha: "2026-08-01", titulo: "Escala salarial agosto 2026", tipo: "escala", vigencia: "agosto 2026", published: true, creadoEl: "2026-10-10T20:00:00.000Z" },
      { id: "ac", convenioId: "camioneros-cct-40-89", fecha: "2026-09-18", titulo: "Acuerdo de septiembre", tipo: "acuerdo", vigencia: "septiembre 2026 a febrero 2027", published: true, creadoEl: "2026-10-29T22:00:00.000Z" },
      { id: "ho", convenioId: "camioneros-cct-40-89", fecha: "2026-10-06", titulo: "Homologación", tipo: "homologacion", published: true, creadoEl: "2026-10-29T22:10:00.000Z" },
      { id: "nu", convenioId: "camioneros-cct-40-89", fecha: "2026-11-01", titulo: "Escala salarial noviembre 2026", tipo: "escala", vigencia: "noviembre 2026", published: true, creadoEl: "2026-12-02T10:00:00.000Z" },
    ];
    const hoy = new Date("2026-12-05T12:00:00Z");
    const m = armarMapaDelSitio({ convenios, acuerdos: conTipo, novedades, hoy, periodosCargados: { "camioneros-cct-40-89": ["2026-09", "2026-11"] } });
    const en = (slug) => m.find((e) => e.url.endsWith(`/acuerdos/camioneros-cct-40-89/${slug}`)).lastModified;
    // Septiembre está cargado: la página muestra la tabla.
    expect(en("escala-salarial-septiembre-2026")).toEqual(desde);
    // El acuerdo no muestra tablas, pero lleva a las escalas de septiembre y noviembre.
    expect(en("acuerdo-de-septiembre")).toEqual(desde);
    // Agosto no está en la base y la homologación no fija importes: quedan con su fecha.
    expect(en("escala-salarial-agosto-2026")).toEqual(new Date("2026-10-10T20:00:00.000Z"));
    expect(en("homologacion")).toEqual(new Date("2026-10-29T22:10:00.000Z"));
    // Un acuerdo cargado después de ese día lleva su propia fecha, que es más nueva.
    expect(en("escala-salarial-noviembre-2026")).toEqual(new Date("2026-12-02T10:00:00.000Z"));
    // Sin saber qué meses están cargados, nadie lleva la fecha del cambio.
    const sinMeses = armarMapaDelSitio({ convenios, acuerdos: conTipo, novedades, hoy });
    expect(sinMeses.find((e) => e.url.endsWith("/escala-salarial-septiembre-2026")).lastModified).toEqual(new Date("2026-10-10T20:05:00.000Z"));
  });

  it("prioridades entre 0 y 1 y URLs absolutas", () => {
    for (const e of mapa) {
      expect(e.url).toMatch(/^https:\/\/liquidar\.ar/);
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1);
    }
  });

  it("sin datos salen las fijas igual", () => {
    expect(armarMapaDelSitio({}).map((e) => e.url)).toEqual(["https://liquidar.ar", "https://liquidar.ar/acuerdos"]);
    expect(armarMapaDelSitio({}).every((e) => !("lastModified" in e))).toBe(true);
  });
});
