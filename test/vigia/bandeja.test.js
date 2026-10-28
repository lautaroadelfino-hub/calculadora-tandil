// test/vigia/bandeja.test.js
import { describe, it, expect } from "vitest";
import { horasDesde, textoHace, estadoDelVigia, ordenarBorradores } from "../../lib/vigia/bandeja.js";

const ahora = new Date("2026-11-05T15:00:00.000Z");

describe("hace cuánto", () => {
  it("cuenta horas y días, y no inventa con una fecha rota", () => {
    expect(horasDesde("2026-11-05T12:00:00.000Z", ahora)).toBe(3);
    expect(horasDesde("x", ahora)).toBeNull();
    expect(textoHace("2026-11-05T14:30:00.000Z", ahora)).toBe("recién");
    expect(textoHace("2026-11-05T14:00:00.000Z", ahora)).toBe("hace 1 hora");
    expect(textoHace("2026-11-05T12:00:00.000Z", ahora)).toBe("hace 3 horas");
    expect(textoHace("2026-11-02T15:00:00.000Z", ahora)).toBe("hace 3 días");
    expect(textoHace(null, ahora)).toBe("nunca");
  });
});

describe("la franja del vigía", () => {
  it("verde si corrió hace poco y nada falla", () => {
    const e = estadoDelVigia({ ultimaCorrida: { id: "c", fin: "2026-11-05T12:00:40.000Z" }, fuentes: { boletinOficial: { fallasSeguidas: 0 } } }, ahora);
    expect(e).toEqual({ nivel: "ok", texto: "Última corrida hace 2 horas", fallando: [] });
  });

  it("rojo si pasaron más de 48 horas o una fuente viene fallando", () => {
    expect(estadoDelVigia({ ultimaCorrida: { id: "c", fin: "2026-11-02T12:00:00.000Z" }, fuentes: {} }, ahora)).toMatchObject({
      nivel: "alerta",
      texto: "Última corrida hace 3 días (el vigía no está corriendo: revisá Actions en GitHub)",
    });
    expect(estadoDelVigia({ ultimaCorrida: { id: "c", inicio: "2026-11-05T12:00:00.000Z" }, fuentes: { boletinOficial: { fallasSeguidas: 2 }, arca: { fallasSeguidas: 0 } } }, ahora)).toEqual({
      nivel: "alerta",
      texto: "Última corrida hace 3 horas · falla boletinOficial",
      fallando: ["boletinOficial"],
    });
  });

  it("sin corridas lo dice", () => {
    expect(estadoDelVigia(null, ahora)).toMatchObject({ nivel: "sin_datos", texto: "El vigía todavía no corrió." });
    expect(estadoDelVigia({}, ahora).nivel).toBe("sin_datos");
  });
});

describe("el orden de los borradores", () => {
  it("más nuevos primero y sin los de prueba", () => {
    const lista = [{ id: "a", creadoEl: "2026-11-01T00:00:00Z" }, { id: "_prueba_vigia", creadoEl: "2026-12-01T00:00:00Z" }, { id: "b", creadoEl: "2026-11-03T00:00:00Z" }, { id: "c" }];
    expect(ordenarBorradores(lista).map((b) => b.id)).toEqual(["b", "a", "c"]);
    expect(ordenarBorradores(null)).toEqual([]);
  });
});
