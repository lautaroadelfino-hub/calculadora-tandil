// test/sitemap.test.js
// El mapa del sitio que leen los buscadores. Una URL listada que ya no existe
// es un 404 indexado; una que redirige es ruido. Se verifica lo que no tiene
// que estar tanto como lo que sí.

import { describe, it, expect } from "vitest";
import sitemap from "../app/sitemap.js";

describe("sitemap", () => {
  const entradas = sitemap();
  const urls = entradas.map((e) => e.url);

  it("lista la portada y las novedades", () => {
    expect(urls).toContain("https://liquidar.ar");
    expect(urls).toContain("https://liquidar.ar/novedades");
  });

  it("no lista /empleador: el panel se retiró el 13/9/2026 y la URL sólo redirige", () => {
    expect(urls.some((u) => u.endsWith("/empleador"))).toBe(false);
  });

  it("cada entrada tiene URL absoluta y prioridad entre 0 y 1", () => {
    for (const e of entradas) {
      expect(e.url).toMatch(/^https:\/\/liquidar\.ar/);
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1);
    }
  });
});
