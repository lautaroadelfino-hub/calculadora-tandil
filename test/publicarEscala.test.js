// test/publicarEscala.test.js
// Lo que se escribe al publicar una escala, que antes vivía adentro del botón
// del panel: el documento de la escala y lo que cambia en el convenio. El
// panel y scripts/cargarMes.mjs llaman a lo mismo, así que esto fija que los
// dos escriben exactamente lo que ya hay en producción.

import { describe, it, expect } from "vitest";
import { documentoDeEscala, convenioConEscala, CAMPOS_DEL_CONVENIO_AL_PUBLICAR } from "../lib/publicarEscala.js";
import { parsearCsvEscala } from "../lib/escalaCsv.js";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";

describe("documentoDeEscala", () => {
  it("reproduce tal cual la escala de septiembre 2026 que hay en producción", () => {
    const sep = escalasComercio["2026-09"];
    const doc = documentoDeEscala({ claves: Object.keys(sep.categorias), sueldos: sep.categorias, mesVigencia: "Septiembre 2026" });
    expect(doc).toEqual(sep);
  });

  it("y la de julio, con la suma sin incidencia y su nombre", () => {
    const jul = escalasComercio["2026-07"];
    const doc = documentoDeEscala({
      claves: Object.keys(jul.categorias), sueldos: jul.categorias, mesVigencia: "Julio 2026", nombreSinIncidencia: jul.nombre_sin_incidencia,
    });
    expect(doc).toEqual(jul);
  });

  it("la suma sin incidencia se escribe sólo donde la hay, y el nombre sólo si viene", () => {
    const { claves, sueldos } = parsearCsvEscala("categoria,basico,no_remunerativo,no_remunerativo_sin_incidencia\nA,100,10,5\nB,200,0,0");
    const doc = documentoDeEscala({ claves, sueldos, mesVigencia: " Octubre 2026 ", nombreSinIncidencia: "  " });
    expect(doc).toEqual({
      mes_vigencia: "Octubre 2026",
      categorias: { A: { basico: 100, no_remunerativo: 10, no_remunerativo_sin_incidencia: 5 }, B: { basico: 200, no_remunerativo: 0 } },
    });
  });

  it("los valores del período viajan sólo si hay alguno", () => {
    const base = { claves: ["A"], sueldos: { A: { basico: 1, no_remunerativo: 0 } }, mesVigencia: "X" };
    expect(documentoDeEscala(base)).not.toHaveProperty("valores_del_periodo");
    expect(documentoDeEscala({ ...base, valoresDelPeriodo: { km: 12.5 } }).valores_del_periodo).toEqual({ km: 12.5 });
  });

  it("un importe vacío o ilegible queda en cero, como en el panel", () => {
    const doc = documentoDeEscala({ claves: ["A"], sueldos: { A: { basico: "", no_remunerativo: "x" } }, mesVigencia: "X" });
    expect(doc.categorias.A).toEqual({ basico: 0, no_remunerativo: 0 });
  });
});

describe("convenioConEscala", () => {
  // En el orden en que el panel las publica (parsearCsvEscala las ordena así).
  const clavesSep = Object.keys(escalasComercio["2026-09"].categorias).sort((a, b) => a.localeCompare(b));

  it("publicar septiembre de nuevo deja el convenio de Comercio exactamente como está", () => {
    expect(convenioConEscala(convenioComercio, clavesSep, "2026-09", "Septiembre 2026")).toEqual(convenioComercio);
  });

  it("un mes más nuevo avanza ultimo_periodo y su nombre; uno viejo no lo mueve para atrás", () => {
    const oct = convenioConEscala(convenioComercio, clavesSep, "2026-10", "Octubre 2026");
    expect(oct).toMatchObject({ ultimo_periodo: "2026-10", ultimo_periodo_nombre: "Octubre 2026" });
    const jun = convenioConEscala(convenioComercio, clavesSep, "2026-06", "Junio 2026");
    expect(jun).toMatchObject({ ultimo_periodo: "2026-09", ultimo_periodo_nombre: "Septiembre 2026" });
  });

  it("las opciones de categoría pasan a ser las de la escala y el default sobrevive si sigue existiendo", () => {
    const c = convenioConEscala(convenioComercio, ["Vendedor B", "Administrativo A"], "2026-10", "Octubre 2026");
    const cat = c.inputs_requeridos.find((i) => i.id === "categoria");
    expect(cat.opciones).toEqual(["Vendedor B", "Administrativo A"]);
    expect(cat.default).toBe("Administrativo A");
    const sinDefault = convenioConEscala(convenioComercio, ["Vendedor B"], "2026-10", "Octubre 2026");
    expect(sinDefault.inputs_requeridos.find((i) => i.id === "categoria").default).toBe("Vendedor B");
  });

  it("con zonas crea el desplegable de zona si no existe, y lo actualiza si existe", () => {
    const claves = ["Escala A|Nivel 1", "Escala B|Nivel 1", "Escala B|Nivel 2"];
    const creado = convenioConEscala(convenioComercio, claves, "2026-10", "Octubre 2026");
    expect(creado.inputs_requeridos[0]).toEqual({ id: "zona", tipo: "select", label: "Zona / Escala", default: "Escala A", opciones: ["Escala A", "Escala B"] });
    expect(creado.inputs_requeridos.find((i) => i.id === "categoria").opciones).toEqual(["Nivel 1", "Nivel 2"]);

    const conZona = {
      ...convenioComercio,
      inputs_requeridos: [{ id: "zona", tipo: "select", label: "Zona", default: "Escala B", opciones: ["Escala Z"] }, ...convenioComercio.inputs_requeridos],
    };
    const actualizado = convenioConEscala(conZona, claves, "2026-10", "Octubre 2026");
    expect(actualizado.inputs_requeridos[0]).toMatchObject({ label: "Zona", default: "Escala B", opciones: ["Escala A", "Escala B"] });
    expect(actualizado.inputs_requeridos).toHaveLength(conZona.inputs_requeridos.length);
  });

  it("no toca el convenio que recibe ni más campos que los tres que publica", () => {
    const copia = JSON.parse(JSON.stringify(convenioComercio));
    const r = convenioConEscala(convenioComercio, ["Otra"], "2026-10", "Octubre 2026");
    expect(convenioComercio).toEqual(copia);
    const cambiados = Object.keys(r).filter((k) => JSON.stringify(r[k]) !== JSON.stringify(convenioComercio[k]));
    expect(cambiados.sort()).toEqual([...CAMPOS_DEL_CONVENIO_AL_PUBLICAR].sort());
  });
});
