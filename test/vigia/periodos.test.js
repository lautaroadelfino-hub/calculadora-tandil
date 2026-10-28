// test/vigia/periodos.test.js
// Los nombres de los meses como los usa el vigía: el título con mayúscula que
// guarda producción, los nombres y abreviaturas que traen el Boletín y las
// circulares, el mes siguiente y la fecha de hoy en la Argentina.
import { describe, it, expect } from "vitest";
import { tituloDePeriodo, periodoDeMes, mesSiguiente, hoyArgentina, periodoActual } from "../../lib/periodos.js";

describe("tituloDePeriodo", () => {
  it("es el nombre con mayúscula que producción guarda en vigencia y mes_vigencia", () => {
    expect(tituloDePeriodo("2026-09")).toBe("Septiembre 2026");
    expect(tituloDePeriodo("2027-01")).toBe("Enero 2027");
    expect(tituloDePeriodo("2026-13")).toBe("2026-13");
    expect(tituloDePeriodo("")).toBe("");
    expect(tituloDePeriodo(null)).toBe("");
  });
});

describe("periodoDeMes", () => {
  it("entiende el nombre entero, con o sin acento, en cualquier caja", () => {
    expect(periodoDeMes("septiembre", "2026")).toBe("2026-09");
    expect(periodoDeMes("SEPTIEMBRE", 2026)).toBe("2026-09");
    expect(periodoDeMes("setiembre", "2026")).toBe("2026-09");
    expect(periodoDeMes("marzo", "2027")).toBe("2027-03");
  });

  it("entiende las abreviaturas de las circulares", () => {
    expect(periodoDeMes("SEPT.", "2026")).toBe("2026-09");
    expect(periodoDeMes("DIC.", "2025")).toBe("2025-12");
    expect(periodoDeMes("ABR", "2026")).toBe("2026-04");
    expect(periodoDeMes("set", "2026")).toBe("2026-09");
  });

  it("no inventa un mes", () => {
    expect(periodoDeMes("marzolandia", "2026")).toBeNull();
    expect(periodoDeMes("ma", "2026")).toBeNull();
    expect(periodoDeMes("mayo", "26")).toBeNull();
    expect(periodoDeMes("", "2026")).toBeNull();
  });
});

describe("mesSiguiente, hoyArgentina y periodoActual", () => {
  it("pasa de diciembre a enero y no acepta un período mal escrito", () => {
    expect(mesSiguiente("2026-11")).toBe("2026-12");
    expect(mesSiguiente("2026-12")).toBe("2027-01");
    expect(mesSiguiente("2026-7")).toBeNull();
  });

  it("la fecha argentina es la de UTC menos tres horas", () => {
    expect(hoyArgentina(new Date("2026-11-01T02:30:00.000Z"))).toBe("2026-10-31");
    expect(hoyArgentina(new Date("2026-11-01T03:00:00.000Z"))).toBe("2026-11-01");
    expect(periodoActual(new Date("2026-11-01T02:30:00.000Z"))).toBe("2026-10");
    expect(periodoActual(new Date("2026-11-01T12:00:00.000Z"))).toBe("2026-11");
  });
});
