// test/vigia/correrBoletin.test.js
// Una corrida del Boletín Oficial de punta a punta, con la red simulada: el
// listado real del 1/9/2026, el aviso real de la Res. ANSES 257/2026 y páginas
// vacías para el resto. Tiene que salir el borrador de septiembre 2026 con
// las bases del Boletín y el FFEP arrastrado de agosto, el estado tiene que
// avanzar día por día, hoy no se cierra hasta mañana, lo visto no se repite, y
// lo que no se pudo bajar se reintenta en la corrida siguiente.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import junio from "../fixtures/vigia/parametros_contribuciones-2026-06.json";
import julio from "../fixtures/vigia/parametros_contribuciones-2026-07.json";
import agosto from "../fixtures/vigia/parametros_contribuciones-2026-08.json";
import { correrBoletinOficial, diaAnterior, TOPE_REINTENTOS } from "../../scripts/vigia/correrBoletin.mjs";
import { estadoInicial } from "../../scripts/vigia/estado.mjs";
import { firestoreFalso } from "./ayudas/firestoreFalso.js";

const carpeta = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "vigia");
const listado = readFileSync(join(carpeta, "boletin-listado-20260901.html"), "utf8");
const anses257 = readFileSync(join(carpeta, "boletin-aviso-anses-257-2026.html"), "utf8");
const paginaVacia = "<html><body><h1>Sección Primera</h1><p>Legislación y Avisos Oficiales</p></body></html>";
const avisoSinInteres = '<html><head><title>BOLETIN OFICIAL REPUBLICA ARGENTINA - MINISTERIO DE CAPITAL HUMANO - Resolución 999/2026</title></head><body><div id="cuerpoDetalleAviso">Desígnase a una persona en un cargo.</div></body></html>';

const respuesta = (texto, extra = {}) => ({ ok: true, status: 200, cookies: [], texto: () => texto, ...extra });
/** La red: el listado del 1/9 real, el aviso de ANSES real, el resto sin interés; otros días, vacíos. */
const red = ({ caidos = [], limitados = [] } = {}) => vi.fn(async (url) => {
  if (caidos.some((c) => url.includes(c))) return respuesta("", { ok: false, status: 503 });
  if (limitados.some((c) => url.includes(c))) return respuesta("", { ok: false, status: 429 });
  if (url.endsWith("/seccion/primera/20260901")) return respuesta(listado);
  if (url.includes("/seccion/primera/")) return respuesta(paginaVacia);
  if (url.includes("/detalleAviso/primera/346683/20260901")) return respuesta(anses257);
  return respuesta(avisoSinInteres);
});
const tablas = { "2026-06": junio, "2026-07": julio, "2026-08": agosto };
const correr = (extra) => correrBoletinOficial({ firestore: firestoreFalso({ tablas }), estado: estadoInicial(), hoy: "2026-09-01", corridaId: "c1", ...extra });

describe("una corrida del Boletín Oficial", () => {
  it("lee hoy, baja sólo los avisos de interés y deja el borrador de septiembre", async () => {
    const pedirFn = red();
    const firestore = firestoreFalso({ tablas });
    const estado = estadoInicial();
    const guardarAvance = vi.fn();
    const r = await correr({ pedirFn, firestore, estado, guardarAvance });
    expect(r.items).toBe(100);
    // 5 avisos (cuatro Resoluciones de ANSES y una RG de ARCA); los otros 95 (decretos, Secretaría de Trabajo, ENACOM…) no se bajan.
    expect(r.nuevos).toBe(5);
    expect(r.diasRevisados).toEqual(["2026-09-01"]);
    expect(pedirFn).toHaveBeenCalledTimes(6);
    expect(r.hallazgos.map((h) => [h.tipo, h.norma, h.aviso.url])).toEqual([["bases_art9", "Resolución ANSES 257/2026", "https://www.boletinoficial.gob.ar/detalleAviso/primera/346683/20260901"]]);
    expect(r.alertas).toEqual([]);
    expect(r.borradores.map((b) => [b.id, b.accion])).toEqual([["contribuciones--nacional--2026-09", "nuevo"]]);
    const b = firestore.docs["contribuciones--nacional--2026-09"];
    expect(b.datos.bases_art9).toEqual({ minima: 144363.55, maxima: 4691748.47 });
    expect(b.datos.vigencia).toBe("Septiembre 2026");
    expect(b.partes.ffep).toMatchObject({ origen: "arrastrado", valor: 1905, de: "2026-08" });
    expect(b.fuente).toMatchObject({ nombre: "boletinOficial", url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/346683/20260901", fecha: "2026-09-01" });
    expect(b.partes.bases_art9.cita).toMatch(/^bases imponibles mínima y máxima/);
    // El estado: hoy se leyó pero no se cierra; los 7 quedaron vistos; el avance se guardó.
    const f = estado.fuentes.boletinOficial;
    expect(f.ultimaFechaRevisada).toBe("2026-08-31");
    expect(f.vistos).toHaveLength(5);
    expect(f.limitadoSeguidos).toBe(0);
    expect(r.parcial).toBe(false);
    expect(f.vistos).toContain("primera/346683/20260901");
    expect(guardarAvance).toHaveBeenCalledTimes(1);
  });

  it("la segunda corrida del mismo día no repite nada; al día siguiente cierra ayer", async () => {
    const firestore = firestoreFalso({ tablas });
    const estado = estadoInicial();
    await correr({ pedirFn: red(), firestore, estado });
    const r2 = await correr({ pedirFn: red(), firestore, estado });
    expect(r2.nuevos).toBe(0);
    expect(r2.borradores).toEqual([]);
    expect(firestore.escrituras.filter(([a]) => a === "crear")).toHaveLength(1);
    const pedirFn = red();
    const r3 = await correr({ pedirFn, firestore, estado, hoy: "2026-09-02" });
    expect(r3.diasRevisados).toEqual(["2026-09-01", "2026-09-02"]);
    expect(r3.nuevos).toBe(0);
    expect(estado.fuentes.boletinOficial.ultimaFechaRevisada).toBe("2026-09-01");
    // Un miércoles sin avisos se anota, pero uno solo no es una falla.
    expect(estado.fuentes.boletinOficial.diasVaciosSeguidos).toBe(1);
  });

  it("tres días hábiles seguidos sin avisos es una falla con nombre", async () => {
    const estado = estadoInicial();
    estado.fuentes.boletinOficial.ultimaFechaRevisada = "2026-09-01";
    await expect(correr({ pedirFn: red(), estado, hoy: "2026-09-04" })).rejects.toThrow(/3 días hábiles seguidos sin avisos/);
  });

  it("--desde rellena días pasados y no retrocede el último día cerrado", async () => {
    const estado = estadoInicial();
    estado.fuentes.boletinOficial.ultimaFechaRevisada = "2026-09-02";
    const r = await correr({ pedirFn: red(), estado, hoy: "2026-09-03", desde: "2026-08-31" });
    expect(r.diasRevisados).toEqual(["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(r.borradores).toHaveLength(1);
    expect(estado.fuentes.boletinOficial.ultimaFechaRevisada).toBe("2026-09-02");
    // El lunes 31/8 vacío se anota; el 1/9 con avisos lo borra; el 2 y el 3 vacíos suman dos: todavía no es falla.
    expect(estado.fuentes.boletinOficial.diasVaciosSeguidos).toBe(2);
  });

  it("un aviso que no se pudo bajar queda para reintentar, y se lee en la corrida siguiente", async () => {
    const firestore = firestoreFalso({ tablas });
    const estado = estadoInicial();
    const r1 = await correr({ pedirFn: red({ caidos: ["346683"] }), firestore, estado });
    expect(r1.borradores).toEqual([]);
    expect(estado.fuentes.boletinOficial.reintentos).toHaveLength(1);
    expect(estado.fuentes.boletinOficial.reintentos[0]).toMatchObject({ id: "primera/346683/20260901", url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/346683/20260901", fecha: "2026-09-01", organismo: "ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL" });
    expect(estado.fuentes.boletinOficial.reintentos[0].titulo).toContain("Resolución 257/2026");
    expect(estado.fuentes.boletinOficial.vistos).not.toContain("primera/346683/20260901");
    const r2 = await correr({ pedirFn: red(), firestore, estado });
    expect(r2.borradores.map((b) => b.id)).toEqual(["contribuciones--nacional--2026-09"]);
    expect(estado.fuentes.boletinOficial.reintentos).toEqual([]);
    expect(TOPE_REINTENTOS).toBe(50);
  });

  it("un aviso pegado a mano se lee aunque ya se haya visto y no mueve los días", async () => {
    const firestore = firestoreFalso({ tablas });
    const estado = estadoInicial();
    estado.fuentes.boletinOficial.ultimaFechaRevisada = "2026-09-10";
    const pedirFn = red();
    const r = await correr({ pedirFn, firestore, estado, hoy: "2026-09-11", item: "https://www.boletinoficial.gob.ar/detalleAviso/primera/346683/20260901" });
    expect(pedirFn).toHaveBeenCalledTimes(1);
    expect(r.borradores.map((b) => b.id)).toEqual(["contribuciones--nacional--2026-09"]);
    expect(r.diasRevisados).toEqual([]);
    expect(estado.fuentes.boletinOficial.ultimaFechaRevisada).toBe("2026-09-10");
    // Sin organismo en el listado, lo saca del título del aviso.
    expect(r.hallazgos[0].norma).toBe("Resolución ANSES 257/2026");
  });

  it("si el Boletín limita los pedidos (HTTP 429), la corrida queda parcial: nada se pierde y sigue mañana", async () => {
    const firestore = firestoreFalso({ tablas });
    const estado = estadoInicial();
    estado.fuentes.boletinOficial.ultimaFechaRevisada = "2026-08-30";
    const guardarAvance = vi.fn();
    // El 31/8 se lista bien (vacío); el 1/9 se lista, y el aviso de ANSES responde 429.
    const r = await correr({ pedirFn: red({ limitados: ["346683"] }), firestore, estado, guardarAvance });
    expect(r.parcial).toBe(true);
    expect(r.notas[0]).toMatch(/HTTP 429.*quedó parcial/);
    expect(r.borradores).toEqual([]);
    const f = estado.fuentes.boletinOficial;
    // El 31/8 quedó cerrado, el 1/9 (hoy) no; el aviso no quedó visto ni en reintentos.
    expect(f.ultimaFechaRevisada).toBe("2026-08-31");
    expect(f.vistos).not.toContain("primera/346683/20260901");
    expect(f.reintentos).toEqual([]);
    expect(f.limitadoSeguidos).toBe(1);
    expect(guardarAvance).toHaveBeenCalledTimes(2);
    // Mañana lo vuelve a leer sin que nadie haga nada.
    const r2 = await correr({ pedirFn: red(), firestore, estado, hoy: "2026-09-02" });
    expect(r2.borradores.map((b) => b.id)).toEqual(["contribuciones--nacional--2026-09"]);
    expect(f.limitadoSeguidos).toBe(0);
  });

  it("tres corridas seguidas cortadas por el 429 son una falla con nombre", async () => {
    const estado = estadoInicial();
    estado.fuentes.boletinOficial.limitadoSeguidos = 2;
    const limitado = vi.fn(async () => respuesta("", { ok: false, status: 429 }));
    await expect(correr({ pedirFn: limitado, estado })).rejects.toThrow(/3 corridas seguidas cortadas/);
  });

  it("en ensayo no escribe pero cuenta lo que haría", async () => {
    const firestore = firestoreFalso({ tablas });
    const r = await correr({ pedirFn: red(), firestore, escribir: false });
    expect(r.borradores).toHaveLength(1);
    expect(firestore.escrituras).toEqual([]);
  });

  it("el día anterior cruza el mes", () => {
    expect(diaAnterior("2026-09-01")).toBe("2026-08-31");
    expect(diaAnterior("2027-01-01")).toBe("2026-12-31");
  });
});
