// test/vigia/preparadorContribuciones.test.js
// De los hallazgos del Boletín al borrador de contribuciones, con un Firestore
// simulado: nace con las bases, se completa con el FFEP, revisa un mes ya
// publicado si el Boletín dice otra cosa, y no resucita un borrador descartado.
import { describe, it, expect } from "vitest";
import junio from "../fixtures/vigia/parametros_contribuciones-2026-06.json";
import julio from "../fixtures/vigia/parametros_contribuciones-2026-07.json";
import agosto from "../fixtures/vigia/parametros_contribuciones-2026-08.json";
import septiembre from "../fixtures/vigia/parametros_contribuciones-2026-09.json";
import { prepararContribuciones, agruparPorPeriodo } from "../../scripts/vigia/preparadores/contribuciones.mjs";
import { armarTablaDelMes, ffepDe } from "../../lib/vigia/contribuciones.js";

const aviso = (url, fecha, titulo) => ({ id: url, url, fecha, titulo });
const BASES_OCT = { tipo: "bases_art9", norma: "Resolución ANSES 290/2026", datos: { minima: 147000.12, maxima: 4800000.55, periodo: "2026-10", cita: "…" }, aviso: aviso("https://bo/anses-290", "2026-10-01", "ANSES Res 290/2026") };
const FFEP_OCT = { tipo: "ffep", norma: "Disposición SRT 10/2026", datos: { monto: 1970, periodo: "2026-10", cita: "…" }, aviso: aviso("https://bo/srt-10", "2026-10-27", "SRT Disp 10/2026") };

/** Un Firestore de mentira: tablas publicadas y borradores en memoria. */
function firestoreFalso({ tablas = {}, borradores = {} } = {}) {
  const docs = { ...borradores };
  return {
    escrituras: [],
    async listar(coleccion) {
      if (coleccion === "parametros_contribuciones") return Object.entries(tablas).map(([id, t]) => ({ id, ...t }));
      if (coleccion === "borradores") return Object.entries(docs).map(([id, b]) => ({ id, ...b, _updateTime: "u1" }));
      return [];
    },
    async leerCrudo(ruta) {
      const id = ruta.replace("borradores/", "");
      return docs[id] ? { campos: docs[id], updateTime: "u1" } : null;
    },
    async crear(ruta, datos) {
      const id = ruta.replace("borradores/", "");
      if (docs[id]) return { creado: false, existia: true };
      docs[id] = datos;
      this.escrituras.push(["crear", id]);
      return { creado: true };
    },
    async actualizar(ruta, cambios, opciones) {
      const id = ruta.replace("borradores/", "");
      docs[id] = { ...docs[id], ...cambios };
      this.escrituras.push(["actualizar", id, Object.keys(cambios), opciones]);
      return { actualizado: true };
    },
    docs,
  };
}
const tablas = { "2026-06": junio, "2026-07": julio, "2026-08": agosto, "2026-09": septiembre };
const correr = (firestore, hallazgos, estado = {}) =>
  prepararContribuciones({ hallazgos, firestore, estado, corridaId: "c1", ahora: "2026-11-05T12:00:09.000Z" });

describe("agrupar los hallazgos", () => {
  it("por período, bases y FFEP por separado, ignorando lo que no tiene período", () => {
    expect(agruparPorPeriodo([BASES_OCT, FFEP_OCT, { tipo: "ffep", datos: {} }])).toEqual({ "2026-10": { bases: BASES_OCT, ffep: FFEP_OCT } });
  });
});

describe("un mes nuevo", () => {
  it("con las bases nace el borrador: copia de septiembre, bases del Boletín, FFEP arrastrado y en rojo", async () => {
    const fs = firestoreFalso({ tablas });
    const estado = {};
    const r = await correr(fs, [BASES_OCT], estado);
    expect(r.borradores.map((b) => [b.id, b.accion])).toEqual([["contribuciones--nacional--2026-10", "nuevo"]]);
    const b = fs.docs["contribuciones--nacional--2026-10"];
    expect(b.estado).toBe("requiere_revision");
    expect(b.datos).toEqual(armarTablaDelMes(septiembre, { periodo: "2026-10", bases: { minima: 147000.12, maxima: 4800000.55 }, ffep: 1935 }));
    expect(b.partes.bases_art9).toMatchObject({ origen: "boletin", norma: "Resolución ANSES 290/2026", avisoUrl: "https://bo/anses-290", fechaBO: "2026-10-01" });
    expect(b.partes.ffep).toMatchObject({ origen: "arrastrado", valor: 1935, de: "2026-09" });
    expect(b.advertencias).toEqual(["El FFEP es el de Septiembre 2026: todavía no salió la Disposición de la SRT."]);
    expect(b.resumen).toContain("FFEP $1.935,00 (arrastrado de Septiembre 2026, falta la Disposición SRT)");
    expect(b.fuente).toMatchObject({ nombre: "boletinOficial", url: "https://bo/anses-290" });
    expect(b.baseComparacion).toEqual({ periodo: "2026-09" });
    expect(estado.ffepConocido).toBeUndefined();
  });

  it("cuando llega el FFEP, completa el borrador abierto sin pisar las bases y lo deja pendiente", async () => {
    const fs = firestoreFalso({ tablas });
    const estado = {};
    await correr(fs, [BASES_OCT], estado);
    const r = await correr(fs, [FFEP_OCT], estado);
    expect(r.borradores.map((b) => [b.id, b.accion])).toEqual([["contribuciones--nacional--2026-10", "completado"]]);
    const b = fs.docs["contribuciones--nacional--2026-10"];
    expect(b.estado).toBe("pendiente");
    expect(b.partes.bases_art9).toMatchObject({ origen: "boletin", norma: "Resolución ANSES 290/2026" });
    expect(b.partes.ffep).toMatchObject({ origen: "boletin", valor: 1970, norma: "Disposición SRT 10/2026" });
    expect(ffepDe(b.datos)).toBe(1970);
    expect(b.datos.bases_art9).toEqual({ minima: 147000.12, maxima: 4800000.55 });
    expect(b.advertencias).toEqual([]);
    expect(fs.escrituras.at(-1)).toEqual(["actualizar", "contribuciones--nacional--2026-10", ["datos", "partes", "resumen", "advertencias", "estado", "fuente", "actualizadoEl"], { updateTime: "u1" }]);
    expect(estado.ffepConocido).toEqual({ periodo: "2026-10", monto: 1970, norma: "Disposición SRT 10/2026", avisoUrl: "https://bo/srt-10" });
  });

  it("si primero llega el FFEP, nace con las bases arrastradas y después se completa", async () => {
    const fs = firestoreFalso({ tablas });
    const estado = {};
    await correr(fs, [FFEP_OCT], estado);
    let b = fs.docs["contribuciones--nacional--2026-10"];
    expect(b.partes.bases_art9).toMatchObject({ origen: "arrastrado", valor: septiembre.bases_art9, de: "2026-09" });
    expect(b.estado).toBe("requiere_revision");
    await correr(fs, [BASES_OCT], estado);
    b = fs.docs["contribuciones--nacional--2026-10"];
    expect(b.partes.ffep).toMatchObject({ origen: "boletin", valor: 1970 });
    expect(b.partes.bases_art9).toMatchObject({ origen: "boletin" });
    expect(b.estado).toBe("pendiente");
  });

  it("un FFEP nuevo actualiza los borradores abiertos de meses posteriores que lo arrastraban", async () => {
    const fs = firestoreFalso({ tablas });
    const estado = {};
    const basesNov = { ...BASES_OCT, datos: { ...BASES_OCT.datos, periodo: "2026-11" }, norma: "Resolución ANSES 330/2026" };
    await correr(fs, [basesNov], estado);
    expect(fs.docs["contribuciones--nacional--2026-11"].partes.ffep).toMatchObject({ origen: "arrastrado", valor: 1935, de: "2026-09" });
    const r = await correr(fs, [FFEP_OCT], estado);
    expect(r.borradores.map((b) => [b.id, b.accion])).toEqual([
      ["contribuciones--nacional--2026-10", "nuevo"],
      ["contribuciones--nacional--2026-11", "ffep arrastrado actualizado"],
    ]);
    const nov = fs.docs["contribuciones--nacional--2026-11"];
    expect(nov.partes.ffep).toMatchObject({ origen: "arrastrado", valor: 1970, de: "2026-10" });
    expect(ffepDe(nov.datos)).toBe(1970);
  });

  it("un borrador descartado no se vuelve a crear, y sin tabla anterior sólo se anota", async () => {
    const fs = firestoreFalso({ tablas, borradores: { "contribuciones--nacional--2026-10": { estado: "descartado", tipo: "contribuciones" } } });
    const r = await correr(fs, [BASES_OCT]);
    expect(r.borradores).toEqual([]);
    expect(r.notas[0]).toMatch(/está descartado; no se vuelve a crear/);
    const vacio = firestoreFalso({ tablas: {} });
    const r2 = await correr(vacio, [BASES_OCT]);
    expect(r2.borradores).toEqual([]);
    expect(r2.notas[0]).toMatch(/no hay ninguna tabla anterior/);
  });

  it("en ensayo no escribe nada pero cuenta lo que haría", async () => {
    const fs = firestoreFalso({ tablas });
    const r = await prepararContribuciones({ hallazgos: [BASES_OCT], firestore: fs, estado: {}, corridaId: "c1", escribir: false });
    expect(r.borradores).toHaveLength(1);
    expect(fs.escrituras).toEqual([]);
    expect(fs.docs).toEqual({});
  });
});

describe("un mes ya publicado", () => {
  const basesSep = { tipo: "bases_art9", norma: "Resolución ANSES 257/2026", datos: { minima: 144363.55, maxima: 4691748.47, periodo: "2026-09" }, aviso: aviso("https://bo/anses-257", "2026-09-01", "ANSES 257") };

  it("si el Boletín coincide con lo publicado, no hace nada", async () => {
    const fs = firestoreFalso({ tablas });
    const r = await correr(fs, [basesSep]);
    expect(r.borradores).toEqual([]);
    expect(r.notas).toEqual(["Septiembre 2026: la tabla publicada ya coincide con el Boletín Oficial."]);
  });

  it("si difiere, sale un borrador de REVISIÓN con lo publicado corregido y en rojo", async () => {
    const fs = firestoreFalso({ tablas });
    const ffepSep = { tipo: "ffep", norma: "Disposición SRT 9/2026", datos: { monto: 1940, periodo: "2026-09" }, aviso: aviso("https://bo/srt-9", "2026-09-25", "SRT 9") };
    const r = await correr(fs, [ffepSep]);
    expect(r.borradores.map((b) => [b.id, b.accion])).toEqual([["contribuciones--nacional--2026-09--revision-2026-11-05", "revisión"]]);
    const b = fs.docs["contribuciones--nacional--2026-09--revision-2026-11-05"];
    expect(b.estado).toBe("requiere_revision");
    expect(b.revisa).toBe("parametros_contribuciones/2026-09");
    expect(b.resumen).toBe("REVISAR Septiembre 2026: FFEP: publicado $1.935,00, el Boletín dice $1.940,00");
    expect(ffepDe(b.datos)).toBe(1940);
    expect(b.datos.bases_art9).toEqual(septiembre.bases_art9);
  });
});
