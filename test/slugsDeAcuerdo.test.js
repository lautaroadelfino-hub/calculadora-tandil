// test/slugsDeAcuerdo.test.js
// La URL de cada acuerdo: cómo se deriva del título, cómo se evita que dos
// acuerdos compartan URL y cómo se encuentra el acuerdo desde la URL.

import { describe, it, expect } from "vitest";
import { slugDeUrl, slug } from "../lib/texto.js";
import { slugDeAcuerdo, conSlugs, acuerdoPorSlug, vecinosDe, acuerdosPublicados, ES_SLUG } from "../lib/acuerdosPublicados.js";

describe("slugDeUrl", () => {
  it("baja a minúsculas, saca acentos y une con guiones", () => {
    expect(slugDeUrl("Homologación del acuerdo de julio de 2026")).toBe("homologacion-del-acuerdo-de-julio-de-2026");
    expect(slugDeUrl("  Escala salarial — Septiembre 2026 (planilla 246) ")).toBe("escala-salarial-septiembre-2026-planilla-246");
    expect(slugDeUrl("", "acuerdo")).toBe("acuerdo");
    expect(slugDeUrl("¡¿?!")).toBe("item");
  });

  it("no toca slug(), que ya está en ids guardados", () => {
    expect(slug("Cuota Afiliado (2,5%)")).toBe("cuota_afiliado_2_5");
  });

  it("lo que sale cumple la forma que acepta la URL", () => {
    for (const t of ["Acuerdo paritario del 22 de julio de 2026", "ESCALA  2026", "a--b"]) expect(ES_SLUG.test(slugDeUrl(t))).toBe(true);
    for (const malo of ["", "-a", "a-", "A-b", "a..b", "a/b", "a b"]) expect(ES_SLUG.test(malo)).toBe(false);
  });
});

describe("slug de cada acuerdo", () => {
  it("el guardado gana; sin guardado, sale del título", () => {
    expect(slugDeAcuerdo({ slug: "mi-url", titulo: "Otro título" })).toBe("mi-url");
    expect(slugDeAcuerdo({ titulo: "Escala salarial agosto 2026" })).toBe("escala-salarial-agosto-2026");
    expect(slugDeAcuerdo({})).toBe("acuerdo");
  });

  it("dos acuerdos del mismo convenio con el mismo título: el más viejo se queda con el slug y el nuevo lleva la fecha", () => {
    const lista = conSlugs([
      { id: "n", convenioId: "c", fecha: "2026-09-01", titulo: "Escala salarial" },
      { id: "v", convenioId: "c", fecha: "2026-08-01", titulo: "Escala salarial" },
      { id: "otro", convenioId: "d", fecha: "2026-09-01", titulo: "Escala salarial" },
    ]);
    expect(lista.map((a) => [a.id, a.slug])).toEqual([
      ["n", "escala-salarial-2026-09-01"],
      ["v", "escala-salarial"],
      ["otro", "escala-salarial"],
    ]);
    expect(conSlugs(undefined)).toEqual([]);
  });

  it("acuerdosPublicados ya devuelve el slug resuelto", () => {
    const [a] = acuerdosPublicados([{ id: "a", convenioId: "c", fecha: "2026-01-01", titulo: "Acta acuerdo", published: true }]);
    expect(a.slug).toBe("acta-acuerdo");
  });
});

describe("acuerdoPorSlug", () => {
  const items = [
    { id: "a", convenioId: "c", fecha: "2026-09-01", titulo: "Escala septiembre", published: true },
    { id: "b", convenioId: "c", fecha: "2026-08-01", titulo: "Escala agosto", published: false },
    { id: "x", convenioId: "d", fecha: "2026-09-01", titulo: "Escala septiembre", published: true },
  ];

  it("encuentra el acuerdo publicado de ese convenio", () => {
    expect(acuerdoPorSlug(items, "c", "escala-septiembre").id).toBe("a");
    expect(acuerdoPorSlug(items, "d", "escala-septiembre").id).toBe("x");
  });

  it("ignora despublicados, otros convenios y slugs mal formados", () => {
    expect(acuerdoPorSlug(items, "c", "escala-agosto")).toBeNull();
    expect(acuerdoPorSlug(items, "e", "escala-septiembre")).toBeNull();
    expect(acuerdoPorSlug(items, "c", "Escala-Septiembre")).toBeNull();
    expect(acuerdoPorSlug(items, "c", "../x")).toBeNull();
    expect(acuerdoPorSlug(items, "c", "")).toBeNull();
  });
});

describe("vecinosDe", () => {
  const lista = acuerdosPublicados([
    { id: "sep", convenioId: "c", fecha: "2026-09-01", titulo: "s", published: true },
    { id: "ago", convenioId: "c", fecha: "2026-08-01", titulo: "a", published: true },
    { id: "jul", convenioId: "c", fecha: "2026-07-01", titulo: "j", published: true },
  ]);

  it("anterior es el más viejo y siguiente el más nuevo", () => {
    expect(vecinosDe(lista, "ago")).toMatchObject({ anterior: { id: "jul" }, siguiente: { id: "sep" } });
    expect(vecinosDe(lista, "sep")).toMatchObject({ anterior: { id: "ago" }, siguiente: null });
    expect(vecinosDe(lista, "jul")).toMatchObject({ anterior: null, siguiente: { id: "ago" } });
    expect(vecinosDe(lista, "no")).toEqual({ anterior: null, siguiente: null });
  });
});
