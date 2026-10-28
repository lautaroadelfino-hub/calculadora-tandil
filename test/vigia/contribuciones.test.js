// test/vigia/contribuciones.test.js
// La tabla del mes nuevo a partir de la anterior. El patrón de oro son las
// tablas reales de producción (respaldo del 15/10/2026): agosto 2026 más las
// bases de la Res. ANSES 257/2026 y el FFEP $1.935 tienen que dar exactamente
// la tabla de septiembre 2026 que el dueño cargó a mano.
import { describe, it, expect } from "vitest";
import agosto from "../fixtures/vigia/parametros_contribuciones-2026-08.json";
import septiembre from "../fixtures/vigia/parametros_contribuciones-2026-09.json";
import semilla from "../../data/contribuciones.seed.json";
import { ffepDe, conFfep, armarTablaDelMes, copiarDelMesAnterior, erroresDeTabla, diferenciasConPublicada, resumenContribuciones, lineasParaConfirmar, lineasDePartes } from "../../lib/vigia/contribuciones.js";

describe("armar la tabla del mes", () => {
  it("patrón de oro: agosto 2026 + Boletín Oficial = septiembre 2026 al centavo", () => {
    const armada = armarTablaDelMes(agosto, { periodo: "2026-09", bases: { minima: 144363.55, maxima: 4691748.47 }, ffep: 1935 });
    expect(armada).toEqual(septiembre);
    expect(erroresDeTabla(armada)).toEqual([]);
  });

  it("copiar del mes anterior cambia sólo el nombre del mes", () => {
    const copiada = copiarDelMesAnterior(septiembre, "2026-10");
    expect(copiada.vigencia).toBe("Octubre 2026");
    expect({ ...copiada, vigencia: septiembre.vigencia }).toEqual(septiembre);
    expect(copiada).not.toBe(septiembre);
  });

  it("no toca la tabla que recibe ni arrastra las notas de la semilla", () => {
    const antes = JSON.stringify(semilla);
    const armada = armarTablaDelMes(semilla, { periodo: "2026-11", ffep: 2000 });
    expect(JSON.stringify(semilla)).toBe(antes);
    expect(Object.keys(armada).some((k) => k.startsWith("_"))).toBe(false);
    expect(ffepDe(armada)).toBe(2000);
    expect(ffepDe(semilla)).toBe(1839);
  });

  it("frena con bases que no cierran o un FFEP sin sentido", () => {
    expect(() => armarTablaDelMes(agosto, { periodo: "2026-09", bases: { minima: 10, maxima: 5 } })).toThrow(/máxima/);
    expect(() => armarTablaDelMes(agosto, { periodo: "2026-09", ffep: 0 })).toThrow(/FFEP/);
    expect(() => armarTablaDelMes(null, { periodo: "2026-09" })).toThrow(/Falta/);
  });

  it("si la tabla no tenía FFEP, lo agrega como suma fija universal", () => {
    const sin = { ...agosto, universales: agosto.universales.filter((u) => u.id !== "ffep") };
    expect(ffepDe(sin)).toBeNull();
    const con = conFfep(sin, 1935);
    expect(con.universales[0]).toMatchObject({ id: "ffep", unidad: "suma_fija", monto: 1935, rubro: "art" });
    expect(erroresDeTabla(con)).toEqual([]);
  });
});

describe("comparar con lo publicado y resumir", () => {
  it("dice qué difiere, en bases y en FFEP, y nada si coincide", () => {
    expect(diferenciasConPublicada(septiembre, septiembre)).toEqual([]);
    const otra = armarTablaDelMes(septiembre, { periodo: "2026-09", bases: { minima: 144363.55, maxima: 4700000 }, ffep: 1950 });
    expect(diferenciasConPublicada(otra, septiembre)).toEqual([
      "bases del art. 9: publicada $144.363,55 / $4.691.748,47, el Boletín dice $144.363,55 / $4.700.000,00",
      "FFEP: publicado $1.935,00, el Boletín dice $1.950,00",
    ]);
  });

  it("el resumen nombra de dónde salió cada parte", () => {
    expect(resumenContribuciones({
      periodo: "2026-11",
      partes: { bases_art9: { origen: "boletin", valor: { minima: 147000, maxima: 4800000.5 }, norma: "Resolución ANSES 290/2026" }, ffep: { origen: "arrastrado", valor: 1935, de: "2026-09" } },
    })).toBe("Noviembre 2026: bases $147.000,00 / $4.800.000,50 (Resolución ANSES 290/2026) · FFEP $1.935,00 (arrastrado de Septiembre 2026, falta la Disposición SRT)");
    expect(resumenContribuciones({ periodo: "2026-11", partes: {} })).toBe("Noviembre 2026: sin bases · sin FFEP");
  });
});

describe("lo que dice el confirm antes de guardar", () => {
  const partes = {
    bases_art9: { origen: "boletin", valor: { minima: 144363.55, maxima: 4691748.47 }, norma: "Resolución ANSES 257/2026" },
    ffep: { origen: "arrastrado", valor: 1905, de: "2026-08" },
  };

  it("cita la norma de cada parte cuando la tabla trae lo del borrador", () => {
    const datos = armarTablaDelMes(agosto, { periodo: "2026-09", bases: partes.bases_art9.valor, ffep: 1905 });
    expect(lineasParaConfirmar({ datos, partes })).toEqual([
      "bases $144.363,55 / $4.691.748,47 (Resolución ANSES 257/2026)",
      "FFEP $1.905,00 (arrastrado de Agosto 2026, falta la Disposición SRT)",
    ]);
  });

  it("dice 'editado a mano' si el dueño cambió un valor que venía del borrador", () => {
    const datos = armarTablaDelMes(agosto, { periodo: "2026-09", bases: { minima: 144363.55, maxima: 4700000 }, ffep: 1935 });
    expect(lineasParaConfirmar({ datos, partes })).toEqual([
      "bases $144.363,55 / $4.700.000,00 (editadas a mano)",
      "FFEP $1.935,00 (editado a mano)",
    ]);
  });

  it("sin borrador, sólo los valores", () => {
    expect(lineasParaConfirmar({ datos: septiembre })).toEqual(["bases $144.363,55 / $4.691.748,47", "FFEP $1.935,00"]);
    expect(lineasParaConfirmar({ datos: { ...septiembre, universales: [] } })[1]).toBe("sin FFEP");
  });

  it("el resumen del borrador usa las mismas líneas, con el mes con mayúscula", () => {
    expect(resumenContribuciones({ periodo: "2026-09", partes })).toBe("Septiembre 2026: bases $144.363,55 / $4.691.748,47 (Resolución ANSES 257/2026) · FFEP $1.905,00 (arrastrado de Agosto 2026, falta la Disposición SRT)");
    expect(lineasDePartes({ bases_art9: { origen: "publicada", valor: { minima: 1, maxima: 2 } } })).toEqual(["bases $1,00 / $2,00 (lo publicado)", "sin FFEP"]);
  });
});
