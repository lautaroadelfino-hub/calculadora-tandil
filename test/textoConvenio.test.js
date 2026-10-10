// test/textoConvenio.test.js
// El texto de cada calculadora sale de los datos: lo que no está cargado no se
// afirma. Se prueba con los fixtures reales de los tres convenios.

import { describe, it, expect } from "vitest";
import { categoriaDeReferencia, basicoDeReferencia, parrafoDeConvenio, preguntasFrecuentes } from "../lib/textoConvenio.js";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalasCamioneros from "./fixtures/camioneros-cct-40-89.escalas.json";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";
import gastro from "./fixtures/gastronomicos-cct-389-04.convenio.json";
import escalasGastro from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const ultimo = (escalas) => {
  const id = Object.keys(escalas).sort().pop();
  return { id, escala: escalas[id], nombre: escalas[id].mes_vigencia };
};
const ids = (preguntas) => preguntas.map((p) => p.id);

describe("categoría y básico de referencia", () => {
  it("toma la categoría por defecto del formulario y su básico en la escala", () => {
    expect(categoriaDeReferencia(camioneros)).toBe("Conductor de primera categoría");
    const { escala } = ultimo(escalasCamioneros);
    expect(basicoDeReferencia(escala, "Conductor de primera categoría")).toEqual({ clave: "Conductor de primera categoría", basico: 1075910.44, noRemunerativo: 0 });
  });

  it("con zonas encuentra la categoría dentro de la primera zona", () => {
    const { escala } = ultimo(escalasGastro);
    const categoria = categoriaDeReferencia(gastro);
    const ref = basicoDeReferencia(escala, categoria);
    expect(ref).not.toBeNull();
    expect(ref.clave.endsWith(`|${categoria}`) || ref.clave === categoria).toBe(true);
    expect(ref.basico).toBeGreaterThan(0);
  });

  it("sin escala, sin categoría o con básico inválido no inventa un número", () => {
    expect(basicoDeReferencia(null, "x")).toBeNull();
    expect(basicoDeReferencia({ categorias: { x: { basico: 0 } } }, "x")).toBeNull();
    expect(basicoDeReferencia({ categorias: { x: { basico: "texto" } } }, "x")).toBeNull();
    expect(basicoDeReferencia({ categorias: {} }, null)).toBeNull();
    expect(categoriaDeReferencia({})).toBeNull();
  });
});

describe("el párrafo", () => {
  it("nombra el convenio, la escala, el básico de referencia y el rango de meses cargados", () => {
    const { escala, nombre } = ultimo(escalasCamioneros);
    const periodos = [{ id: "2026-08", nombre: "Agosto 2026" }, { id: "2026-07", nombre: "Julio 2026" }];
    const p = parrafoDeConvenio({ convenio: camioneros, escala, periodoNombre: nombre, periodos, ultimoAcuerdo: { titulo: "Escala", slug: "escala", fecha: "2026-08-01" } });
    expect(p.texto).toBe(
      "Simulá el recibo de sueldo de Camioneros (CCT 40/89) con la escala de Agosto 2026: el básico de Conductor de primera categoría es $ 1.075.910,44. Escalas cargadas de Julio 2026 a Agosto 2026."
    );
    expect(p.ultimoAcuerdo.slug).toBe("escala");
  });

  it("sin escala ni períodos queda una sola frase, sin número", () => {
    const p = parrafoDeConvenio({ convenio: comercio, escala: null, periodoNombre: "", periodos: [] });
    expect(p.texto).toBe("Simulá el recibo de sueldo de Empleados de Comercio (CCT 130/75).");
    expect(p.ultimoAcuerdo).toBeNull();
  });
});

describe("las preguntas frecuentes", () => {
  it("Camioneros: básico, aguinaldo, antigüedad sobre básico más adicionales, horas extras con divisor 192 y descuentos; sin presentismo", () => {
    const { escala, nombre } = ultimo(escalasCamioneros);
    const preguntas = preguntasFrecuentes({ convenio: camioneros, escala, periodoNombre: nombre });
    expect(ids(preguntas)).toEqual(["basico", "aguinaldo", "antiguedad", "horas_extras", "descuentos"]);
    const de = (id) => preguntas.find((p) => p.id === id);
    expect(de("basico").pregunta).toBe("¿Cuál es el sueldo básico de Camioneros en Agosto 2026?");
    expect(de("basico").respuesta).toContain("$ 1.075.910,44");
    expect(de("aguinaldo").respuesta).toContain("50 %");
    expect(de("aguinaldo").respuesta).toContain("$ 537.955,22");
    expect(de("antiguedad").pregunta).toBe("¿Cómo se calcula la antigüedad en el CCT 40/89?");
    expect(de("antiguedad").respuesta).toBe("Un 1 % del básico más los adicionales por cada año de servicio, según las reglas cargadas para Camioneros.");
    expect(de("horas_extras").respuesta).toContain("dividir el sueldo mensual por 192 (jornada completa de 44 horas semanales)");
    expect(de("horas_extras").respuesta).toContain("50 % de recargo");
    expect(de("horas_extras").respuesta).toContain("100 %");
    expect(de("descuentos").respuesta).toContain("jubilación (11%), pami (3%), obra social (3%)");
    expect(de("descuentos").respuesta).toContain("Cuota sindical (3%) (sólo afiliados)");
    expect(de("descuentos").respuesta).toContain("Seguro de sepelio (1,5%, ítem 8.1.6)");
  });

  it("Comercio: tiene presentismo 8,33 % y el aporte fijo de OSECAC con su importe", () => {
    const { escala, nombre } = ultimo(escalasComercio);
    const preguntas = preguntasFrecuentes({ convenio: comercio, escala, periodoNombre: nombre });
    expect(ids(preguntas)).toContain("presentismo");
    const de = (id) => preguntas.find((p) => p.id === id);
    expect(de("presentismo").respuesta).toContain("8,33 %");
    expect(de("presentismo").respuesta).toContain("el básico más la antigüedad");
    expect(de("descuentos").respuesta).toContain("Aporte Fijo OSECAC ($ 100,00)");
    expect(de("horas_extras").respuesta).toContain("por 200");
  });

  it("con no remunerativo en la escala, lo dice al lado del básico", () => {
    const escala = { mes_vigencia: "Mayo 2026", categorias: { "Administrativo A": { basico: 1000000, no_remunerativo: 120000 } } };
    const basico = preguntasFrecuentes({ convenio: comercio, escala, periodoNombre: "Mayo 2026" }).find((p) => p.id === "basico");
    expect(basico.respuesta).toContain("$ 1.000.000,00 por mes según la escala de Mayo 2026, más $ 120.000,00 no remunerativos");
  });

  it("sin escala no hay pregunta del básico ni cifra de aguinaldo, y el resto sigue", () => {
    const preguntas = preguntasFrecuentes({ convenio: comercio, escala: null, periodoNombre: "" });
    expect(ids(preguntas)).not.toContain("basico");
    expect(preguntas.find((p) => p.id === "aguinaldo").respuesta).not.toMatch(/\$/);
    expect(ids(preguntas)).toContain("descuentos");
  });

  it("ninguna respuesta queda con 'undefined' ni 'NaN'", () => {
    for (const [c, e] of [[camioneros, escalasCamioneros], [comercio, escalasComercio], [gastro, escalasGastro]]) {
      const { escala, nombre } = ultimo(e);
      for (const p of preguntasFrecuentes({ convenio: c, escala, periodoNombre: nombre })) {
        expect(p.pregunta + p.respuesta).not.toMatch(/undefined|NaN|null/);
      }
    }
  });
});
