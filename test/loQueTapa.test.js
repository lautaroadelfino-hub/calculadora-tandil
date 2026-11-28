// test/loQueTapa.test.js
// Cuánto sube la tira de calificación para quedar entera a la vista
// (components/calculadora/calificacion/loQueTapa.js). Es la cuenta sola: en un
// teléfono de verdad se mira con #medidas (README, sección 5).

import { describe, it, expect } from "vitest";
import { loQueTapaElPie, altoLibre, TOLERANCIA_PX, TOPE_SIN_ESCRIBIR_PX, ALTO_MINIMO_PX } from "../components/calculadora/calificacion/loQueTapa.js";

const vv = (cambios = {}) => ({ height: 700, offsetTop: 0, scale: 1, ...cambios });

describe("lo que tapa el pie de la pantalla", () => {
  it("sin viewport visual, o con medidas que no sirven, no sube nada", () => {
    expect(loQueTapaElPie({ alto: 700, vv: null, escribiendo: true })).toBe(0);
    expect(loQueTapaElPie({ alto: 0, vv: vv(), escribiendo: true })).toBe(0);
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 0 }), escribiendo: true })).toBe(0);
  });

  it("escribiendo, sube lo que tapa el teclado", () => {
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 400 }), escribiendo: true })).toBe(300);
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 399.6 }), escribiendo: true })).toBe(300);
  });

  it("si el navegador ya corrió lo visible hasta el pie (iOS, para mostrar la caja), no hay nada tapado", () => {
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 400, offsetTop: 300 }), escribiendo: true })).toBe(0);
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 400, offsetTop: 120 }), escribiendo: true })).toBe(180);
  });

  it("nunca baja la tira ni la sube más que el 60 % de la pantalla (una medida rota)", () => {
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 720 }), escribiendo: true })).toBe(0);
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 100 }), escribiendo: true })).toBe(420);
  });

  it("con zoom de dedos no toca nada, escriba o no", () => {
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 400, scale: 1.5 }), escribiendo: true })).toBe(0);
    expect(loQueTapaElPie({ alto: 700, vv: vv({ height: 650, scale: 0.9 }), escribiendo: false })).toBe(0);
  });

  it("sin escribir, sube sólo por algo del tamaño de una barra", () => {
    const sin = (tapa) => loQueTapaElPie({ alto: 700, vv: vv({ height: 700 - tapa }), escribiendo: false });
    expect(sin(0)).toBe(0);
    // El redondeo, o una barra a medio moverse.
    expect(sin(TOLERANCIA_PX)).toBe(0);
    // Los 24 px que deja corridos iOS 26.0 después del teclado: sube eso, y no pasa nada.
    expect(sin(24)).toBe(24);
    expect(sin(56)).toBe(56);
    expect(sin(TOPE_SIN_ESCRIBIR_PX)).toBe(TOPE_SIN_ESCRIBIR_PX);
    // Más que una barra es el teclado de otro campo: la tira no se le sube encima.
    expect(sin(TOPE_SIN_ESCRIBIR_PX + 1)).toBe(0);
    expect(sin(300)).toBe(0);
  });
});

describe("el alto que le queda a la tira con el teclado", () => {
  it("es lo que se ve, menos la barra del sitio, la distancia al pie y un poco de aire", () => {
    expect(altoLibre({ visible: 400, barra: 60, margen: 12 })).toBe(320);
    expect(altoLibre({ visible: 400, barra: 60, margen: 16 })).toBe(316);
    expect(altoLibre({ visible: 400 })).toBe(380);
  });

  it("si lo visible está corrido (iOS), la barra queda arriba, fuera de lo que se ve, y no se descuenta", () => {
    expect(altoLibre({ visible: 400, corrido: 300, barra: 60 })).toBe(380);
    expect(altoLibre({ visible: 400, corrido: 20, barra: 60 })).toBe(340);
  });

  it("nunca baja del alto que necesita la pregunta del comentario (el teléfono acostado): mejor el título debajo de la barra que la caja en nada", () => {
    expect(altoLibre({ visible: 160, barra: 60 })).toBe(ALTO_MINIMO_PX);
  });
});
