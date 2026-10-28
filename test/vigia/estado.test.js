// test/vigia/estado.test.js
// La memoria del vigía: qué vio, cómo le fue, y cuándo avisar de una fuente rota.
import { describe, it, expect } from "vitest";
import {
  FUENTES, estadoInicial, completarEstado, fueVisto, marcarVisto, registrarResultadoFuente, idDeCorrida, podarCorridas, leerEstado, guardarEstado, registrarCorrida, RUTA_ESTADO,
} from "../../scripts/vigia/estado.mjs";

describe("el estado", () => {
  it("arranca con todas las fuentes sin nada visto y se completa con lo guardado", () => {
    const inicial = estadoInicial();
    expect(Object.keys(inicial.fuentes)).toEqual(FUENTES);
    expect(inicial.fuentes.camioneros).toEqual({ vistos: [], ultimoOk: null, fallasSeguidas: 0, ultimoError: null, ultimaFechaRevisada: null, ultimoItem: null });
    const completado = completarEstado({ ultimoAvisoVivo: "2026-10", fuentes: { camioneros: { vistos: ["a"], fallasSeguidas: 2 }, nueva: { vistos: "no es lista" } } });
    expect(completado.ultimoAvisoVivo).toBe("2026-10");
    expect(completado.fuentes.camioneros).toMatchObject({ vistos: ["a"], fallasSeguidas: 2, ultimoOk: null });
    expect(completado.fuentes.boletinOficial.vistos).toEqual([]);
    expect(completado.fuentes.nueva.vistos).toEqual([]);
    expect(completarEstado(null)).toEqual(estadoInicial());
  });

  it("marcar visto no repite y conserva sólo los últimos", () => {
    const estado = estadoInicial();
    marcarVisto(estado, "faecys", "a");
    marcarVisto(estado, "faecys", "b");
    marcarVisto(estado, "faecys", "a");
    expect(estado.fuentes.faecys.vistos).toEqual(["b", "a"]);
    expect(fueVisto(estado, "faecys", "a")).toBe(true);
    expect(fueVisto(estado, "faecys", "zzz")).toBe(false);
    expect(fueVisto(estado, "inexistente", "a")).toBe(false);
    for (let i = 0; i < 400; i++) marcarVisto(estado, "faecys", `item-${i}`, { tope: 300 });
    expect(estado.fuentes.faecys.vistos).toHaveLength(300);
    expect(estado.fuentes.faecys.vistos[0]).toBe("item-100");
    expect(estado.fuentes.faecys.vistos[299]).toBe("item-399");
  });

  it("una fuente que falla avisa la primera vez y cada 7, y se limpia cuando vuelve", () => {
    const estado = estadoInicial();
    const avisos = [];
    for (let i = 1; i <= 15; i++) avisos.push(registrarResultadoFuente(estado, "uthgra", { ok: false, error: new Error("cambió el formato"), ahora: "2026-11-05T12:00:00.000Z" }).avisar);
    expect(avisos.map((a, i) => (a ? i + 1 : null)).filter(Boolean)).toEqual([1, 7, 14]);
    expect(estado.fuentes.uthgra).toMatchObject({ fallasSeguidas: 15, ultimoError: "cambió el formato", ultimoOk: null });
    expect(registrarResultadoFuente(estado, "uthgra", { ok: true, ahora: "2026-11-06T12:00:00.000Z" })).toEqual({ avisar: false });
    expect(estado.fuentes.uthgra).toMatchObject({ fallasSeguidas: 0, ultimoError: null, ultimoOk: "2026-11-06T12:00:00.000Z" });
  });

  it("el id de la corrida es ordenable y sirve como id de documento", () => {
    expect(idDeCorrida(new Date("2026-11-05T12:00:07.123Z"))).toBe("2026-11-05T12-00-07Z");
    expect(idDeCorrida(new Date("2026-11-05T12:00:07.123Z")) < idDeCorrida(new Date("2026-11-06T00:00:00.000Z"))).toBe(true);
  });
});

describe("con Firestore (simulado)", () => {
  const cliente = (docs) => ({
    guardados: [],
    borrados: [],
    async leer(ruta) { return docs[ruta] || null; },
    async reemplazar(ruta, datos) { this.guardados.push([ruta, datos]); return {}; },
    async listar() { return Object.keys(docs).filter((r) => r.startsWith("vigia_corridas/")).map((r) => ({ id: r.split("/")[1] })); },
    async borrar(ruta) { this.borrados.push(ruta); return { borrado: true }; },
  });

  it("lee el estado completándolo, lo guarda entero y registra la corrida", async () => {
    const c = cliente({ [RUTA_ESTADO]: { ultimoAvisoVivo: "2026-10" } });
    const estado = await leerEstado(c);
    expect(estado.ultimoAvisoVivo).toBe("2026-10");
    expect(estado.fuentes.arca.vistos).toEqual([]);
    await guardarEstado(c, estado);
    await registrarCorrida(c, { id: "2026-11-05T12-00-07Z", inicio: "x" });
    expect(c.guardados.map(([r]) => r)).toEqual([RUTA_ESTADO, "vigia_corridas/2026-11-05T12-00-07Z"]);
  });

  it("poda las corridas más viejas y deja las últimas", async () => {
    const docs = {};
    for (let i = 1; i <= 65; i++) docs[`vigia_corridas/2026-09-${String(i).padStart(2, "0")}T12-00-00Z`] = {};
    const c = cliente(docs);
    expect(await podarCorridas(c, { conservar: 60 })).toBe(5);
    expect(c.borrados).toEqual([1, 2, 3, 4, 5].map((i) => `vigia_corridas/2026-09-${String(i).padStart(2, "0")}T12-00-00Z`));
    expect(await podarCorridas(cliente({}), { conservar: 60 })).toBe(0);
  });
});
