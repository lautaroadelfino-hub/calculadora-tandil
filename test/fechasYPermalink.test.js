// test/fechasYPermalink.test.js
import { describe, it, expect } from "vitest";
import { fechaLocal, fechaCorta, fechaLarga } from "../lib/fechas.js";
import { paramsDesdeEntradas, entradasDesdeParams } from "../lib/permalink.js";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";

describe("las fechas de las novedades", () => {
  it("no se corren un día por la zona horaria", () => {
    const d = fechaLocal("2026-09-13");
    expect(d.getDate()).toBe(13);
    expect(d.getMonth()).toBe(8);
    expect(d.getFullYear()).toBe(2026);
  });

  it("la corta lleva el año, la larga es la de es-AR", () => {
    expect(fechaCorta("2026-09-13")).toBe("13/09/26");
    expect(fechaLarga("2026-09-13")).toMatch(/13 sept?\.? 2026/);
    expect(fechaCorta("cualquier cosa")).toBe("");
    expect(fechaLarga(null)).toBe("");
  });
});

describe("el link de una simulación", () => {
  const valores = {
    categoria: "Peón", carga_horaria: "44", antiguedad_años: "5", horas_extras_50: "", horas_extras_100: 0,
    afiliado_sindicato: true, larga_distancia: false, dias_trabajados: 20, pernoctes: 3, km_recorridos: 0,
    incluir_sac: true, dias_vacaciones: 0, art_alicuota: 5, regimen_contribuciones: "resto_mipyme", hijos: 2,
  };

  it("ida y vuelta: lo que se escribe en la URL se vuelve a leer igual", () => {
    const qs = paramsDesdeEntradas(camioneros, valores, "2026-08");
    expect(qs).toMatch(/^periodo=2026-08/);
    expect(qs).toContain("afiliado_sindicato=1");
    expect(qs).not.toContain("larga_distancia");
    expect(qs).not.toContain("horas_extras_50");
    const { valores: leidos, periodo } = entradasDesdeParams(camioneros, qs);
    expect(periodo).toBe("2026-08");
    expect(leidos.categoria).toBe("Peón");
    expect(leidos.afiliado_sindicato).toBe(true);
    expect(leidos.incluir_sac).toBe(true);
    expect(leidos.antiguedad_años).toBe("5");
    expect(leidos.pernoctes).toBe("3");
    expect(leidos.regimen_contribuciones).toBe("resto_mipyme");
  });

  it("sin período no hay link, y un período mal escrito se ignora", () => {
    expect(paramsDesdeEntradas(camioneros, valores, "")).toBe("");
    expect(entradasDesdeParams(camioneros, "periodo=agosto&categoria=Pe%C3%B3n").periodo).toBeNull();
  });

  it("no acepta una categoría que el convenio no tiene ni campos desconocidos", () => {
    const { valores: v } = entradasDesdeParams(camioneros, "periodo=2026-08&categoria=Astronauta&hackeo=1&km_recorridos=100");
    expect(v.categoria).toBeUndefined();
    expect(v.hackeo).toBeUndefined();
    expect(v.km_recorridos).toBe("100");
  });
});
