// test/vigia/firestoreValores.test.js
// De JS al formato REST de Firestore y vuelta: lo que el vigía escribe tiene
// que leerse igual que lo que escribe el panel con el SDK.
import { describe, it, expect } from "vitest";
import { valorARest, camposARest } from "../../lib/firestoreValores.js";
import { camposDesdeRest, valorDesdeRest } from "../../lib/firestoreRest.js";

describe("de JS a REST", () => {
  it("tipa cada escalar como lo hace el SDK", () => {
    expect(valorARest("Camioneros")).toEqual({ stringValue: "Camioneros" });
    expect(valorARest(44)).toEqual({ integerValue: "44" });
    expect(valorARest(-3)).toEqual({ integerValue: "-3" });
    expect(valorARest(0.1077)).toEqual({ doubleValue: 0.1077 });
    expect(valorARest(1095276.83)).toEqual({ doubleValue: 1095276.83 });
    expect(valorARest(true)).toEqual({ booleanValue: true });
    expect(valorARest(null)).toEqual({ nullValue: null });
    expect(valorARest(undefined)).toEqual({ nullValue: null });
    expect(valorARest(NaN)).toEqual({ doubleValue: "NaN" });
    expect(valorARest(new Date("2026-11-05T12:00:09.000Z"))).toEqual({ timestampValue: "2026-11-05T12:00:09.000Z" });
  });

  it("un objeto con undefined lo saltea, como el SDK con ignoreUndefinedProperties", () => {
    expect(camposARest({ a: 1, b: undefined, c: null })).toEqual({ a: { integerValue: "1" }, c: { nullValue: null } });
  });

  it("no inventa un tipo para una función", () => {
    expect(() => valorARest(() => 1)).toThrow(/function/);
  });
});

describe("ida y vuelta", () => {
  const escala = {
    mes_vigencia: "Septiembre 2026",
    categorias: {
      "Conductor de primera categoría": { basico: 1095276.83, no_remunerativo: 18000 },
      "Escala A|Nivel 1 (Peón - Lavacopas)": { basico: 1074307, no_remunerativo: 74000, no_remunerativo_sin_incidencia: 0 },
    },
    valores_del_periodo: { km_viatico: 87.62403, comida: 16759.49, cantidad: 12 },
    nombre_sin_incidencia: null,
    advertencias: ["una", "dos"],
    controles: { subaPareja: { ok: true, min: 1.8, max: 1.8 }, categoriasCoinciden: true },
    publicadoEl: null,
    creadoEl: "2026-11-05T12:00:09.000Z",
  };

  it("un borrador vuelve exactamente igual, con sus tipos", () => {
    expect(camposDesdeRest(camposARest(escala))).toEqual(escala);
  });

  it("los enteros no se vuelven decimales ni al revés", () => {
    const vuelto = camposDesdeRest(camposARest({ entero: 18000, decimal: 18000.5, grande: 4691748.47 }));
    expect(vuelto).toEqual({ entero: 18000, decimal: 18000.5, grande: 4691748.47 });
    expect(Number.isInteger(vuelto.entero)).toBe(true);
  });

  it("NaN e Infinity sobreviven el viaje", () => {
    expect(valorDesdeRest(valorARest(NaN))).toBeNaN();
    expect(valorDesdeRest(valorARest(Infinity))).toBe(Infinity);
  });

  it("una fecha va como timestamp y vuelve como texto ISO", () => {
    expect(valorDesdeRest(valorARest(new Date("2026-01-02T03:04:05.000Z")))).toBe("2026-01-02T03:04:05.000Z");
  });
});
