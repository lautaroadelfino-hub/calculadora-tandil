// test/ffep.test.js
// El FFEP cambia todos los meses. data/ffep.json es el histórico (Provincia
// ART, Disposiciones SRT) y lib/ffep.js dice cuál rige para cada período:
// la tabla de septiembre 2026 llegó a producción con el FFEP de febrero
// ($1.624 en vez de $1.935) porque la semilla lo traía fijo.

import { describe, it, expect } from "vitest";
import { ffepDelPeriodo, conFfepDelPeriodo, ultimoPeriodoConFfep } from "../lib/ffep.js";
import historico from "../data/ffep.json";
import semilla from "../data/contribuciones.seed.json";

describe("el histórico del FFEP", () => {
  it("viene ordenado, sin períodos repetidos y siempre sube", () => {
    const valores = historico.valores;
    for (let i = 1; i < valores.length; i++) {
      expect(valores[i].desde > valores[i - 1].desde, `${valores[i].desde} después de ${valores[i - 1].desde}`).toBe(true);
      expect(valores[i].monto).toBeGreaterThan(valores[i - 1].monto);
    }
  });

  it("desde 2022-07 hay un valor nuevo cada mes, como publica la SRT", () => {
    const meses = historico.valores.map((v) => v.desde).filter((d) => d >= "2022-07");
    for (let i = 1; i < meses.length; i++) {
      const [a, m] = meses[i - 1].split("-").map(Number);
      const siguiente = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
      expect(meses[i]).toBe(siguiente);
    }
  });
});

describe("el FFEP de un período", () => {
  it("los meses cargados en producción: junio a septiembre 2026", () => {
    expect(ffepDelPeriodo("2026-06")).toBe(1827);
    expect(ffepDelPeriodo("2026-07")).toBe(1839);
    expect(ffepDelPeriodo("2026-08")).toBe(1905);
    expect(ffepDelPeriodo("2026-09")).toBe(1935);
  });

  it("un mes sin valor propio toma el anterior vigente (2022-05 usa el de 2022-04)", () => {
    expect(ffepDelPeriodo("2022-05")).toBe(111.75);
    expect(ffepDelPeriodo("2021-12")).toBe(49.98);
  });

  it("un mes posterior al último conocido sigue con el último: no se inventa un aumento", () => {
    expect(ffepDelPeriodo("2027-03")).toBe(ffepDelPeriodo(ultimoPeriodoConFfep()));
  });

  it("antes del primer valor, o con un período mal escrito, no hay número", () => {
    expect(ffepDelPeriodo("2020-12")).toBeNull();
    expect(ffepDelPeriodo("2026-9")).toBeNull();
    expect(ffepDelPeriodo("")).toBeNull();
    expect(ffepDelPeriodo(null)).toBeNull();
  });
});

describe("la semilla de contribuciones con el FFEP del período", () => {
  it("cambia sólo el FFEP y deja el resto de la tabla igual", () => {
    const tabla = conFfepDelPeriodo(semilla, "2026-09");
    const ffep = tabla.universales.find((u) => u.id === "ffep");
    expect(ffep.monto).toBe(1935);
    expect(tabla.universales.find((u) => u.id === "scvo")).toEqual(semilla.universales.find((u) => u.id === "scvo"));
    expect(tabla.regimenes).toBe(semilla.regimenes);
    expect(semilla.universales.find((u) => u.id === "ffep").monto).toBe(1839); // la semilla no se toca
  });

  it("la semilla es la de julio 2026 y su FFEP es el de julio 2026", () => {
    expect(semilla.universales.find((u) => u.id === "ffep").monto).toBe(ffepDelPeriodo("2026-07"));
  });

  it("con un período desconocido o una tabla sin universales devuelve lo mismo que recibió", () => {
    expect(conFfepDelPeriodo(semilla, "2019-01")).toBe(semilla);
    expect(conFfepDelPeriodo({ regimenes: {} }, "2026-09")).toEqual({ regimenes: {} });
    expect(conFfepDelPeriodo(null, "2026-09")).toBeNull();
  });
});
