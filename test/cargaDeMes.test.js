// test/cargaDeMes.test.js
// El plan de una carga desde archivos (scripts/cargarMes.mjs) tiene que
// publicar lo mismo que el panel y frenar donde frena el panel. Se prueba
// sobre los fixtures de producción y sobre CSV chicos escritos acá.

import { describe, it, expect } from "vitest";
import { planDeCarga } from "../lib/cargaDeMes.js";
import { generarCsvEscala } from "../lib/escalaCsv.js";
import { documentoDeEscala } from "../lib/publicarEscala.js";
import comercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";
import camioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalasCamioneros from "./fixtures/camioneros-cct-40-89.escalas.json";
import semilla from "../data/contribuciones.seed.json";

const sep = escalasComercio["2026-09"];
const clavesSep = Object.keys(sep.categorias).sort((a, b) => a.localeCompare(b));

/** La escala de septiembre con los básicos multiplicados por `factor`, como CSV. */
const csvDesdeSep = (factor, extra = {}) => {
  const sueldos = {};
  for (const c of clavesSep) sueldos[c] = { ...sep.categorias[c], basico: Math.round(sep.categorias[c].basico * factor), ...extra };
  return generarCsvEscala(clavesSep, sueldos);
};

const tablaSep = {
  ...semilla,
  vigencia: "Septiembre 2026",
  universales: semilla.universales.map((u) => (u.id === "ffep" ? { ...u, monto: 1935 } : u)),
};

describe("planDeCarga: escalas", () => {
  it("un mes nuevo escribe la escala y los tres campos del convenio, y avisa cuánto sube", () => {
    const plan = planDeCarga({
      manifiesto: { convenio: comercio.id, escalas: { "2026-10": { csv: "oct.csv" } } },
      csv: { "oct.csv": csvDesdeSep(1.02) },
      convenio: comercio,
      escalasVivas: escalasComercio,
    });
    expect(plan.errores).toEqual([]);
    expect(plan.escritos.map((e) => [e.ruta, e.reemplaza])).toEqual([
      [`convenios/${comercio.id}/escalas/2026-10`, false],
      [`convenios/${comercio.id}`, true],
    ]);
    const [escala, convenio] = plan.escritos;
    expect(escala.campos.mes_vigencia).toBe("Octubre 2026"); // sale del período
    expect(Object.keys(escala.campos.categorias)).toHaveLength(21);
    expect(convenio.mascara).toEqual(["inputs_requeridos", "ultimo_periodo", "ultimo_periodo_nombre"]);
    expect(Object.keys(convenio.campos).sort()).toEqual([...convenio.mascara].sort());
    expect(convenio.campos).toMatchObject({ ultimo_periodo: "2026-10", ultimo_periodo_nombre: "Octubre 2026" });
    expect(plan.avisos).toEqual(["Escala 2026-10: Respecto de el período 2026-09: 21 categoría(s) suben entre 2.0% y 2.0%."]);
  });

  it("varios meses se comparan en cadena: noviembre contra el octubre que se está publicando", () => {
    const plan = planDeCarga({
      manifiesto: {
        convenio: comercio.id,
        escalas: { "2026-11": { csv: "nov.csv", mes_vigencia: "Noviembre 2026" }, "2026-10": { csv: "oct.csv" } },
      },
      csv: { "oct.csv": csvDesdeSep(1.02), "nov.csv": csvDesdeSep(1.04) },
      convenio: comercio,
      escalasVivas: escalasComercio,
    });
    expect(plan.errores).toEqual([]);
    expect(plan.escritos.map((e) => e.ruta.split("/").pop())).toEqual(["2026-10", "2026-11", comercio.id]);
    expect(plan.avisos[1]).toMatch(/^Escala 2026-11: Respecto de el período 2026-10: 21 categoría\(s\) suben entre 2\.0% y 2\.0%/);
    expect(plan.escritos[2].campos).toMatchObject({ ultimo_periodo: "2026-11", ultimo_periodo_nombre: "Noviembre 2026" });
  });

  it("escribe exactamente lo que escribiría el panel con el mismo CSV", () => {
    const plan = planDeCarga({
      manifiesto: { convenio: comercio.id, escalas: { "2026-10": { csv: "oct.csv", nombre_sin_incidencia: "Bono" } } },
      csv: { "oct.csv": csvDesdeSep(1, { no_remunerativo_sin_incidencia: 25000 }) },
      convenio: comercio,
      escalasVivas: escalasComercio,
    });
    const sueldos = {};
    for (const c of clavesSep) sueldos[c] = { ...sep.categorias[c], no_remunerativo_sin_incidencia: 25000 };
    expect(plan.escritos[0].campos).toEqual(documentoDeEscala({ claves: clavesSep, sueldos, mesVigencia: "Octubre 2026", nombreSinIncidencia: "Bono" }));
  });

  it("un mes que ya existe se reemplaza, y avisa qué categorías se borrarían", () => {
    const plan = planDeCarga({
      manifiesto: { convenio: comercio.id, escalas: { "2026-09": { csv: "sep.csv" } } },
      csv: { "sep.csv": "categoria,basico,no_remunerativo\nVendedor B,1226349,120000" },
      convenio: comercio,
      escalasVivas: escalasComercio,
    });
    expect(plan.errores).toEqual([]);
    expect(plan.escritos[0].reemplaza).toBe(true);
    expect(plan.avisos.some((a) => a.includes("Se van a borrar 20 categoría(s)"))).toBe(true);
  });

  it("frena, sin escribir nada, con un CSV roto, un archivo que falta o un período mal escrito", () => {
    const base = { convenio: comercio, escalasVivas: escalasComercio };
    const roto = planDeCarga({
      ...base,
      manifiesto: { convenio: comercio.id, escalas: { "2026-10": { csv: "x.csv" } } },
      csv: { "x.csv": "categoria,basico,no_remunerativo\nVendedor B,,120000" },
    });
    expect(roto.errores).toHaveLength(1);
    expect(roto.errores[0]).toMatch(/^Escala 2026-10: Fila 2 \("Vendedor B"\)/);
    expect(roto.escritos).toEqual([]);

    const falta = planDeCarga({ ...base, manifiesto: { convenio: comercio.id, escalas: { "2026-10": { csv: "x.csv" } } }, csv: {} });
    expect(falta.errores).toEqual(['Escala 2026-10: falta el archivo "x.csv".']);

    const mal = planDeCarga({ ...base, manifiesto: { convenio: comercio.id, escalas: { "2026-9": { csv: "x.csv" } } }, csv: { "x.csv": csvDesdeSep(1) } });
    expect(mal.errores[0]).toMatch(/no tiene el formato AAAA-MM/);
    expect(mal.escritos).toEqual([]);
  });

  it("la suma sin incidencia necesita su nombre; un nombre sin suma sólo avisa", () => {
    const base = { convenio: comercio, escalasVivas: escalasComercio };
    const sinNombre = planDeCarga({
      ...base,
      manifiesto: { convenio: comercio.id, escalas: { "2026-10": { csv: "o.csv" } } },
      csv: { "o.csv": csvDesdeSep(1, { no_remunerativo_sin_incidencia: 25000 }) },
    });
    expect(sinNombre.errores[0]).toMatch(/no dice "nombre_sin_incidencia"/);
    expect(sinNombre.escritos).toEqual([]);

    const sinSuma = planDeCarga({
      ...base,
      manifiesto: { convenio: comercio.id, escalas: { "2026-10": { csv: "o.csv", nombre_sin_incidencia: "Bono" } } },
      csv: { "o.csv": csvDesdeSep(1) },
    });
    expect(sinSuma.errores).toEqual([]);
    expect(sinSuma.avisos.some((a) => a.includes("ninguna categoría trae esa suma"))).toBe(true);
  });

  it("un convenio con adicionales por unidad no se publica sin los valores del período", () => {
    const periodos = Object.keys(escalasCamioneros).sort();
    const ultimo = escalasCamioneros[periodos[periodos.length - 1]];
    const texto = generarCsvEscala(Object.keys(ultimo.categorias), ultimo.categorias);
    const base = { csv: { "c.csv": texto }, convenio: camioneros, escalasVivas: escalasCamioneros };

    const sinValores = planDeCarga({ ...base, manifiesto: { convenio: camioneros.id, escalas: { "2027-01": { csv: "c.csv" } } } });
    expect(sinValores.errores.length).toBeGreaterThan(0);
    expect(sinValores.errores[0]).toMatch(/Falta el valor del período/);

    const conValores = planDeCarga({
      ...base,
      manifiesto: { convenio: camioneros.id, escalas: { "2027-01": { csv: "c.csv", valores_del_periodo: ultimo.valores_del_periodo } } },
    });
    expect(conValores.errores).toEqual([]);
    expect(conValores.escritos[0].campos.valores_del_periodo).toEqual(ultimo.valores_del_periodo);
  });

  it("sin convenio en la base, o sin nada que publicar, no hay plan", () => {
    const sinConvenio = planDeCarga({
      manifiesto: { convenio: "no-existe", escalas: { "2026-10": { csv: "o.csv" } } }, csv: { "o.csv": csvDesdeSep(1) }, convenio: null,
    });
    expect(sinConvenio.errores).toEqual(['El convenio "no-existe" no existe en la base.']);
    expect(sinConvenio.escritos).toEqual([]);
    expect(planDeCarga({ manifiesto: { convenio: comercio.id }, convenio: comercio }).errores).toEqual([
      "El carga.json no tiene ni escalas ni contribuciones para publicar.",
    ]);
  });
});

describe("planDeCarga: contribuciones", () => {
  const vivas = { "2026-09": { id: "2026-09", ...tablaSep } };

  it("parte de la última tabla anterior y cambia el FFEP, las bases del art. 9 y la vigencia", () => {
    const plan = planDeCarga({
      manifiesto: { contribuciones: { "2026-10": { ffep: 1971, bases_art9: { minima: 146759.98, maxima: 4769631.49 } } } },
      contribucionesVivas: vivas,
    });
    expect(plan.errores).toEqual([]);
    expect(plan.avisos).toEqual([]);
    const [e] = plan.escritos;
    expect(e.ruta).toBe("parametros_contribuciones/2026-10");
    expect(e.reemplaza).toBe(false);
    expect(e.campos).not.toHaveProperty("id");
    expect(e.campos.vigencia).toBe("Octubre 2026");
    expect(e.campos.universales.find((u) => u.id === "ffep").monto).toBe(1971);
    expect(e.campos.bases_art9).toEqual({ ...tablaSep.bases_art9, minima: 146759.98, maxima: 4769631.49 });
    expect(e.campos.regimenes).toEqual(tablaSep.regimenes);
    expect(e.campos.criterios_contables).toEqual(tablaSep.criterios_contables);
    expect(e.campos.detraccion).toEqual(tablaSep.detraccion);
  });

  it("sin bases nuevas repite las anteriores y lo avisa; sin FFEP o sin tabla anterior, frena", () => {
    const sinBases = planDeCarga({ manifiesto: { contribuciones: { "2026-10": { ffep: 1971 } } }, contribucionesVivas: vivas });
    expect(sinBases.errores).toEqual([]);
    expect(sinBases.avisos[0]).toMatch(/se repiten las bases del art\. 9 de 2026-09/);
    expect(sinBases.escritos[0].campos.bases_art9).toEqual(tablaSep.bases_art9);

    expect(planDeCarga({ manifiesto: { contribuciones: { "2026-10": {} } }, contribucionesVivas: vivas }).errores[0]).toMatch(/falta el "ffep"/);
    expect(planDeCarga({ manifiesto: { contribuciones: { "2026-05": { ffep: 1765 } } }, contribucionesVivas: vivas }).errores[0]).toMatch(
      /no hay ninguna tabla de contribuciones anterior/
    );
  });

  it("las escalas van antes que el convenio, y el convenio antes que las contribuciones", () => {
    const plan = planDeCarga({
      manifiesto: {
        convenio: comercio.id,
        escalas: { "2026-10": { csv: "o.csv" } },
        contribuciones: { "2026-10": { ffep: 1971, bases_art9: { minima: 1, maxima: 2 } } },
      },
      csv: { "o.csv": csvDesdeSep(1.02) },
      convenio: comercio,
      escalasVivas: escalasComercio,
      contribucionesVivas: vivas,
    });
    expect(plan.errores).toEqual([]);
    expect(plan.escritos.map((e) => e.ruta.split("/")[0])).toEqual(["convenios", "convenios", "parametros_contribuciones"]);
  });
});
