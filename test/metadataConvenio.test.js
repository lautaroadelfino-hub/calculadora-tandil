// test/metadataConvenio.test.js
import { describe, it, expect } from "vitest";
import { convenioDesdeRest, tituloDeConvenio, metadataDeConvenio } from "../lib/metadataConvenio.js";

describe("el título de la pestaña de cada calculadora", () => {
  it("lee nombre y cct del formato REST de Firestore", () => {
    const rest = { fields: { nombre: { stringValue: "Camioneros" }, cct: { stringValue: "40/89" }, activo: { booleanValue: true } } };
    expect(convenioDesdeRest(rest)).toEqual({ nombre: "Camioneros", cct: "40/89" });
    expect(convenioDesdeRest({})).toBeNull();
    expect(convenioDesdeRest(null)).toBeNull();
  });

  it("arma el título con el CCT, y sin nombre dice 'Calculadora'", () => {
    expect(tituloDeConvenio({ nombre: "Camioneros", cct: "40/89" })).toBe("Camioneros (CCT 40/89)");
    expect(tituloDeConvenio({ nombre: "Empleados de Comercio" })).toBe("Empleados de Comercio");
    expect(tituloDeConvenio(null)).toBe("Calculadora");
  });

  it("la metadata trae canonical y una descripción con el nombre", () => {
    const m = metadataDeConvenio({ nombre: "Camioneros", cct: "40/89" }, "camioneros-cct-40-89");
    expect(m.title).toBe("Camioneros (CCT 40/89)");
    expect(m.alternates.canonical).toBe("/calcular/camioneros-cct-40-89");
    expect(m.description).toMatch(/Camioneros/);
    expect(metadataDeConvenio(null, "x").description).toBeUndefined();
  });
});
