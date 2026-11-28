// test/tapaDeNovedades.test.js
// La grilla de la tapa de novedades (components/ListaNovedades.jsx). Los
// recuadros se separan con líneas finas: el fondo gris de la grilla asoma un
// pixel entre uno y otro. Si una fila no se completa, lo que asoma es un hueco
// gris del tamaño de un recuadro. Acá se arma la grilla como la arma el
// navegador y se verifica que, con cualquier cantidad de novedades, todas las
// filas queden llenas en la tablet (dos columnas) y en la compu (tres).

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ListaNovedades, { lugarEnLaTapa } from "../components/ListaNovedades.jsx";

/** Acomoda los recuadros de izquierda a derecha, como `grid-auto-flow: row`. Devuelve las filas, o null si alguna queda con un hueco. */
function filas(anchos, columnas) {
  const armadas = [];
  let fila = [];
  let ocupado = 0;
  for (const ancho of anchos) {
    if (ocupado + ancho > columnas) return null; // no entra: quedaría un hueco al final de la fila
    fila.push(ancho);
    ocupado += ancho;
    if (ocupado === columnas) {
      armadas.push(fila);
      fila = [];
      ocupado = 0;
    }
  }
  return ocupado === 0 ? armadas : null;
}
const lugares = (total) => Array.from({ length: total }, (_, i) => lugarEnLaTapa(i, total));

describe("lugarEnLaTapa", () => {
  it("con cualquier cantidad de novedades, ninguna fila queda con un hueco", () => {
    for (let total = 1; total <= 40; total++) {
      const todos = lugares(total);
      expect(filas(todos.map((l) => l.tablet), 2), `tablet, ${total} novedades`).not.toBeNull();
      expect(filas(todos.map((l) => l.compu), 3), `compu, ${total} novedades`).not.toBeNull();
    }
  });

  it("la primera es la principal y ocupa dos columnas; con una sola, toda la fila", () => {
    expect(lugarEnLaTapa(0, 11)).toEqual({ principal: true, tablet: 2, compu: 2 });
    expect(lugarEnLaTapa(0, 1)).toEqual({ principal: true, tablet: 2, compu: 3 });
    expect(lugares(11).filter((l) => l.principal)).toHaveLength(1);
  });

  it("las once del 27/11/2026: la principal con una vecina y tres filas de tres", () => {
    expect(filas(lugares(11).map((l) => l.compu), 3)).toEqual([[2, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]]);
    // En la tablet: la principal sola arriba y cinco filas de dos.
    expect(filas(lugares(11).map((l) => l.tablet), 2)).toEqual([[2], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]]);
  });

  it("el último se estira hasta el borde cuando la fila no se completa", () => {
    // Camioneros tenía cuatro: la principal y una, y abajo una angosta y una ancha.
    expect(filas(lugares(4).map((l) => l.compu), 3)).toEqual([[2, 1], [1, 2]]);
    // Comercio tenía tres: la última ocupa toda la fila.
    expect(filas(lugares(3).map((l) => l.compu), 3)).toEqual([[2, 1], [3]]);
    expect(filas(lugares(3).map((l) => l.tablet), 2)).toEqual([[2], [1, 1]]);
    expect(filas(lugares(2).map((l) => l.tablet), 2)).toEqual([[2], [2]]);
  });
});

describe("la tapa dibujada", () => {
  const novedades = [
    { id: "n1", date: "2026-11-27", title: "La escala completa, en la página de cada acuerdo", detalle: "Sin abrir el PDF.", url: "/acuerdos", tag: "release" },
    { id: "n2", date: "2026-11-26", title: "Octubre y noviembre 2026: básicos 8,03 % más altos", tag: "aviso", convenioId: "gastronomicos-cct-389-04" },
    { id: "n3", date: "2026-11-26", title: "Escala de noviembre 2026", url: "https://sindicato.org/planilla", tag: "release", convenioId: "camioneros-cct-40-89" },
  ];
  const nombres = { "gastronomicos-cct-389-04": "Gastronómicos (UTHGRA)", "camioneros-cct-40-89": "Camioneros" };
  const html = (props) => renderToStaticMarkup(createElement(ListaNovedades, props));

  it("en la tapa general cada recuadro dice su sección: el convenio, o el sitio", () => {
    const h = html({ novedades, nombresDeConvenio: nombres });
    expect(h).toContain(">El sitio</span>");
    expect(h).toMatch(/<a[^>]*href="\/novedades\/gastronomicos-cct-389-04"[^>]*>Gastronómicos \(UTHGRA\)<\/a>/);
    expect(h).toMatch(/<a[^>]*href="\/novedades\/camioneros-cct-40-89"[^>]*>Camioneros<\/a>/);
  });

  it("en la página de un convenio la sección no se repite", () => {
    const h = html({ novedades: novedades.slice(1) });
    expect(h).not.toContain("El sitio");
    expect(h).not.toContain('href="/novedades/');
  });

  it("marca los avisos y no rotula lo demás: en esta página todo es una novedad", () => {
    const h = html({ novedades, nombresDeConvenio: nombres });
    expect(h).toContain(">Aviso</span>");
    expect(h).not.toContain(">Novedad<");
  });

  it("la principal lleva el titular grande y es la única", () => {
    const h = html({ novedades, nombresDeConvenio: nombres });
    expect(h.match(/lg:text-5xl/g)).toHaveLength(1);
    expect(h.indexOf("lg:text-5xl")).toBeLessThan(h.indexOf("Octubre y noviembre 2026"));
    expect(h).toMatch(/<li[^>]*md:col-span-2 lg:col-span-2[^>]*>/);
  });

  it("el enlace de afuera abre en otra pestaña; el del sitio, no", () => {
    const h = html({ novedades, nombresDeConvenio: nombres });
    expect(h).toMatch(/<a href="https:\/\/sindicato\.org\/planilla" target="_blank" rel="noopener noreferrer"/);
    expect(h).toMatch(/<a href="\/acuerdos" class=/);
  });
});
