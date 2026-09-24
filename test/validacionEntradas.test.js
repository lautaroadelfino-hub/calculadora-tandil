// test/validacionEntradas.test.js
// La validación de la calculadora, que la auditoría del 13/9/2026 encontró al
// revés: rechazaba 36,5 horas sin decir nada y aceptaba 999 pernoctes.

import { describe, it, expect } from "vitest";
import { normalizarEntradas, etiquetaDeCampo, camposNumericos, TOPES } from "../lib/validacionEntradas.js";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";

const base = (convenio, extra = {}) => ({
  ...Object.fromEntries(convenio.inputs_requeridos.map((i) => [i.id, i.default])),
  dias_vacaciones: 0, art_alicuota: 5, art_suma_fija: 0, hijos: 0, hijos_incapacitados: 0,
  ...extra,
});

describe("lo que se acepta", () => {
  it("36,5 horas semanales, con coma o con punto, es un número válido", () => {
    for (const v of ["36,5", "36.5", 36.5]) {
      const r = normalizarEntradas(comercio, base(comercio, { carga_horaria: v }), "2026-09");
      expect(r.hayErrores, JSON.stringify(r.errores)).toBe(false);
      expect(r.valores.carga_horaria).toBe(36.5);
    }
  });

  it("los valores por defecto de los dos convenios pasan sin errores", () => {
    expect(normalizarEntradas(comercio, base(comercio), "2026-09").hayErrores).toBe(false);
    expect(normalizarEntradas(camioneros, base(camioneros), "2026-08").hayErrores).toBe(false);
  });

  it("un numérico vacío vale 0, salvo la ART, donde vacío significa 'no la sé'", () => {
    const r = normalizarEntradas(comercio, base(comercio, { antiguedad_años: "", art_alicuota: "" }), "2026-09");
    expect(r.valores.antiguedad_años).toBe(0);
    expect(r.valores.art_alicuota).toBe("");
    expect(r.hayErrores).toBe(false);
  });
});

describe("lo que frena, y dice por qué", () => {
  it("sin período", () => {
    const r = normalizarEntradas(comercio, base(comercio), "");
    expect(r.errores.periodo).toMatch(/mes/);
  });

  it("horas semanales vacías o en cero: no se calcula jornada completa en silencio", () => {
    expect(normalizarEntradas(comercio, base(comercio, { carga_horaria: "" }), "2026-09").errores.carga_horaria).toMatch(/48 hs/);
    expect(normalizarEntradas(comercio, base(comercio, { carga_horaria: 0 }), "2026-09").errores.carga_horaria).toMatch(/jornada completa: 48 hs/);
    expect(normalizarEntradas(camioneros, base(camioneros, { carga_horaria: "" }), "2026-08").errores.carga_horaria).toMatch(/44 hs/);
  });

  it("texto en un campo numérico", () => {
    const r = normalizarEntradas(comercio, base(comercio, { antiguedad_años: "diez" }), "2026-09");
    expect(r.errores.antiguedad_años).toMatch(/no es un número/);
  });

  it("negativos", () => {
    const r = normalizarEntradas(camioneros, base(camioneros, { km_recorridos: -50000 }), "2026-08");
    expect(r.errores.km_recorridos).toBe("No puede ser negativo.");
  });

  it("valores imposibles en un mes: 999 horas, 1.000 extras, 999 pernoctes, 99 días, 365 días de vacaciones, 200 años", () => {
    const c = normalizarEntradas(comercio, base(comercio, { carga_horaria: 999, horas_extras_50: 500, horas_extras_100: 500, antiguedad_años: 200, dias_vacaciones: 365 }), "2026-09");
    expect(c.errores.carga_horaria).toMatch(/84/);
    expect(c.errores.horas_extras_50).toMatch(/300/);
    expect(c.errores.horas_extras_100).toMatch(/300/);
    expect(c.errores.antiguedad_años).toMatch(/60/);
    expect(c.errores.dias_vacaciones).toMatch(/35/);
    const k = normalizarEntradas(camioneros, base(camioneros, { pernoctes: 999, dias_trabajados: 99, km_recorridos: 999999 }), "2026-08");
    expect(k.errores.pernoctes).toMatch(/máximo 31/);
    expect(k.errores.dias_trabajados).toMatch(/máximo 31/);
    expect(k.errores.km_recorridos).toMatch(/km en un mes/);
  });

  it("una ART del 500% es un error, no una cuota", () => {
    expect(normalizarEntradas(comercio, base(comercio, { art_alicuota: 500 }), "2026-09").errores.art_alicuota).toMatch(/30%/);
  });

  it("los errores salen en el orden de la pantalla", () => {
    const r = normalizarEntradas(comercio, base(comercio, { antiguedad_años: -1, carga_horaria: 0, hijos: 99 }), "");
    expect(Object.keys(r.errores)).toEqual(["periodo", "carga_horaria", "antiguedad_años", "hijos"]);
  });
});

describe("lo que avisa pero calcula", () => {
  it("más horas que la jornada completa", () => {
    const r = normalizarEntradas(comercio, base(comercio, { carga_horaria: 60 }), "2026-09");
    expect(r.hayErrores).toBe(false);
    expect(r.avisos.join(" ")).toMatch(/60 hs semanales, más que la jornada completa de 48/);
  });
});

describe("nombres y campos", () => {
  it("nombra los campos como los ve la persona", () => {
    expect(etiquetaDeCampo(camioneros, "km_recorridos")).toMatch(/Kilómetros/);
    expect(etiquetaDeCampo(comercio, "art_alicuota")).toBe("Alícuota de ART");
    expect(etiquetaDeCampo(comercio, "periodo")).toBe("Período a liquidar");
  });

  it("los numéricos son los del convenio más los universales, sin repetir", () => {
    const ids = camposNumericos(camioneros);
    expect(ids).toContain("km_recorridos");
    expect(ids).toContain("dias_vacaciones");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("los topes son los que dice el criterio", () => {
    expect(TOPES.dias_mes).toBe(31);
    expect(TOPES.horas_semanales).toBeGreaterThanOrEqual(48);
  });
});
