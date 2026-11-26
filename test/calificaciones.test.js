// test/calificaciones.test.js
// La calificación del pie del recibo (lib/calificaciones.js): lo que se manda
// a Firestore, cuándo se pregunta, lo que resume el panel, y que las listas y
// los topes del código sigan siendo los mismos que valida firestore.rules
// (están escritos en los dos lados: si se separan, las calificaciones se
// rechazan en silencio).

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  MOTIVOS,
  PERFILES,
  DISPOSITIVOS,
  ORIGENES,
  MAX_COMENTARIO,
  MAX_CATEGORIA,
  MINUTOS_PARA_CAMBIAR,
  CAMPOS_QUE_CAMBIAN,
  DIAS_SIN_PREGUNTAR,
  nuevoIdDeCalificacion,
  estrellasValidas,
  limpiarComentario,
  motivosValidos,
  contextoValido,
  escrituraNueva,
  escrituraDeCambio,
  enviarCalificacion,
  leerRegistro,
  guardarRegistro,
  debePreguntar,
  puedeCambiar,
  dispositivoDe,
  resumenDeCalificaciones,
  calificacionesACsv,
  CLAVE_LOCAL,
} from "../lib/calificaciones.js";

const CONTEXTO = { convenioId: "comercio-cct-130-75", periodo: "2026-11", categoria: "Vendedor B", origen: "manual", conAvisos: false, calculos: 2, dispositivo: "movil" };
const dias = (n) => n * 24 * 60 * 60 * 1000;

describe("lo que se manda a Firestore", () => {
  it("el id es de 20 letras y números, como pide la regla", () => {
    for (let i = 0; i < 20; i++) expect(nuevoIdDeCalificacion()).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(nuevoIdDeCalificacion()).not.toBe(nuevoIdDeCalificacion());
  });

  it("crear: las estrellas y el contexto tipados, la hora del servidor y que el id no exista", () => {
    const { writes } = escrituraNueva({ id: "a".repeat(20), estrellas: 4, contexto: CONTEXTO });
    expect(writes).toHaveLength(1);
    const [w] = writes;
    expect(w.update.name).toMatch(/\/documents\/calificaciones\/a{20}$/);
    expect(w.update.fields).toEqual({
      estrellas: { integerValue: "4" },
      convenioId: { stringValue: "comercio-cct-130-75" },
      periodo: { stringValue: "2026-11" },
      categoria: { stringValue: "Vendedor B" },
      dispositivo: { stringValue: "movil" },
      origen: { stringValue: "manual" },
      conAvisos: { booleanValue: false },
      calculos: { integerValue: "2" },
    });
    expect(w.updateTransforms).toEqual([{ fieldPath: "creadoEl", setToServerValue: "REQUEST_TIME" }]);
    expect(w.currentDocument).toEqual({ exists: false });
    expect(w.updateMask).toBeUndefined();
  });

  it("el contexto que no tiene la forma esperada no se manda (si no, la regla rechazaría toda la calificación)", () => {
    const ctx = contextoValido({
      convenioId: "comercio-cct-130-75", periodo: "2026-11",
      categoria: "  " + "x".repeat(400) + "  ", dispositivo: "tablet", origen: "qr", conAvisos: "sí", calculos: 0,
    });
    expect(ctx).toEqual({ convenioId: "comercio-cct-130-75", periodo: "2026-11", categoria: "x".repeat(MAX_CATEGORIA) });
    expect(contextoValido({ convenioId: "Comercio CCT", periodo: "2026-13", calculos: 5000 })).toEqual({ calculos: 999 });
  });

  it("sin convenio, sin mes o con estrellas fuera de 1 a 5 no se arma nada", () => {
    expect(() => escrituraNueva({ id: "a".repeat(20), estrellas: 4, contexto: { periodo: "2026-11" } })).toThrow();
    expect(() => escrituraNueva({ id: "a".repeat(20), estrellas: 4, contexto: { convenioId: "x" } })).toThrow();
    for (const e of [0, 6, 3.5, "4", null]) {
      if (estrellasValidas(e)) continue;
      expect(() => escrituraNueva({ id: "a".repeat(20), estrellas: e, contexto: CONTEXTO })).toThrow();
    }
    expect(estrellasValidas("4")).toBe(4);
  });

  it("cambiar: sólo los cuatro campos que la persona contesta, con la hora del servidor y que la calificación exista", () => {
    const { writes } = escrituraDeCambio({
      id: "b".repeat(20), estrellas: 2, motivos: ["otro", "numero_no_cierra", "otro", "inventado"], perfil: "empleador", comentario: "  No me da\r\nlo mismo  ",
    });
    const [w] = writes;
    expect(w.updateMask).toEqual({ fieldPaths: CAMPOS_QUE_CAMBIAN });
    expect(w.update.fields).toEqual({
      estrellas: { integerValue: "2" },
      motivos: { arrayValue: { values: [{ stringValue: "numero_no_cierra" }, { stringValue: "otro" }] } },
      perfil: { stringValue: "empleador" },
      comentario: { stringValue: "No me da\nlo mismo" },
    });
    expect(w.updateTransforms).toEqual([{ fieldPath: "actualizadoEl", setToServerValue: "REQUEST_TIME" }]);
    expect(w.currentDocument).toEqual({ exists: true });
  });

  it("cambiar sin motivos, perfil ni comentario los saca del documento (están en la máscara y no en los campos)", () => {
    const [w] = escrituraDeCambio({ id: "b".repeat(20), estrellas: 5, motivos: [], perfil: "jefe", comentario: "   " }).writes;
    expect(w.update.fields).toEqual({ estrellas: { integerValue: "5" } });
    expect(w.updateMask.fieldPaths).toEqual(expect.arrayContaining(["motivos", "perfil", "comentario"]));
  });

  it("el comentario se limpia y se corta en el máximo", () => {
    expect(limpiarComentario("   ")).toBeNull();
    expect(limpiarComentario(undefined)).toBeNull();
    expect(limpiarComentario("a".repeat(MAX_COMENTARIO + 50))).toHaveLength(MAX_COMENTARIO);
    expect(motivosValidos(["dificil_de_usar", "numero_no_cierra"])).toEqual(["numero_no_cierra", "dificil_de_usar"]);
  });
});

describe("enviar", () => {
  afterEach(() => vi.restoreAllMocks());

  it("manda un POST al commit de Firestore con el cuerpo armado", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true }));
    const cuerpo = escrituraNueva({ id: "c".repeat(20), estrellas: 5, contexto: CONTEXTO });
    await enviarCalificacion(cuerpo, { fetchFn });
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toMatch(/^https:\/\/firestore\.googleapis\.com\/v1\/projects\/.+\/databases\/\(default\)\/documents:commit$/);
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(opciones.body)).toEqual(cuerpo);
  });

  it("si Firestore no lo acepta o no hay red, lanza un mensaje para la persona (y el detalle va a la consola)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rechazo = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: { status: "PERMISSION_DENIED" } }) }));
    await expect(enviarCalificacion({}, { fetchFn: rechazo })).rejects.toThrow("No pudimos guardar tu calificación");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("PERMISSION_DENIED"));
    const sinRed = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    await expect(enviarCalificacion({}, { fetchFn: sinRed })).rejects.toThrow("No hay conexión");
  });
});

describe("cuándo se pregunta", () => {
  const ahora = new Date("2026-11-26T15:00:00Z");
  const hace = (ms) => new Date(ahora.getTime() - ms).toISOString();

  it("a quien nunca contestó, siempre", () => {
    expect(debePreguntar(null, ahora)).toBe(true);
    expect(debePreguntar({ estado: "rara", el: hace(0) }, ahora)).toBe(true);
    expect(debePreguntar({ estado: "calificada", el: "cualquier cosa" }, ahora)).toBe(true);
  });

  it("después de calificar, no por un tiempo largo; después de 'Ahora no', por uno más corto", () => {
    expect(debePreguntar({ estado: "calificada", el: hace(dias(DIAS_SIN_PREGUNTAR.calificada - 1)) }, ahora)).toBe(false);
    expect(debePreguntar({ estado: "calificada", el: hace(dias(DIAS_SIN_PREGUNTAR.calificada)) }, ahora)).toBe(true);
    expect(debePreguntar({ estado: "descartada", el: hace(dias(DIAS_SIN_PREGUNTAR.descartada - 1)) }, ahora)).toBe(false);
    expect(debePreguntar({ estado: "descartada", el: hace(dias(DIAS_SIN_PREGUNTAR.descartada)) }, ahora)).toBe(true);
    expect(DIAS_SIN_PREGUNTAR.descartada).toBeLessThan(DIAS_SIN_PREGUNTAR.calificada);
  });

  it("se puede cambiar lo contestado durante la ventana de la regla, con un minuto de margen", () => {
    const reg = (min) => ({ estado: "calificada", id: "x", el: hace(min * 60 * 1000) });
    expect(puedeCambiar(reg(1), ahora)).toBe(true);
    expect(puedeCambiar(reg(MINUTOS_PARA_CAMBIAR - 1.5), ahora)).toBe(true);
    expect(puedeCambiar(reg(MINUTOS_PARA_CAMBIAR - 0.5), ahora)).toBe(false);
    expect(puedeCambiar({ estado: "descartada", el: hace(0) }, ahora)).toBe(false);
  });

  it("lo guardado en el navegador nunca rompe nada (almacén lleno, bloqueado o con basura)", () => {
    const roto = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceeded"); } };
    expect(leerRegistro(roto)).toBeNull();
    expect(() => guardarRegistro(roto, { estado: "calificada" })).not.toThrow();
    const basura = { getItem: () => "{no es json", setItem: () => {} };
    expect(leerRegistro(basura)).toBeNull();
    const mem = new Map();
    const almacen = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
    guardarRegistro(almacen, { estado: "descartada", el: "2026-11-26T00:00:00.000Z" });
    expect(JSON.parse(mem.get(CLAVE_LOCAL))).toEqual({ estado: "descartada", el: "2026-11-26T00:00:00.000Z" });
    expect(leerRegistro(almacen)).toEqual({ estado: "descartada", el: "2026-11-26T00:00:00.000Z" });
  });

  it("celular o computadora, por el ancho de la ventana", () => {
    expect(dispositivoDe(375)).toBe("movil");
    expect(dispositivoDe(767)).toBe("movil");
    expect(dispositivoDe(768)).toBe("escritorio");
    expect(dispositivoDe(undefined)).toBe("escritorio");
  });
});

describe("el resumen del panel", () => {
  const ts = (iso) => ({ toDate: () => new Date(iso) });
  const lista = [
    { id: "1", estrellas: 5, convenioId: "comercio-cct-130-75", perfil: "empleado", dispositivo: "movil", origen: "manual", conAvisos: false, creadoEl: ts("2026-11-23T10:00:00Z") },
    { id: "2", estrellas: 4, convenioId: "comercio-cct-130-75", dispositivo: "escritorio", origen: "link", conAvisos: false, creadoEl: ts("2026-11-24T10:00:00Z"), comentario: "Muy claro" },
    { id: "3", estrellas: 2, convenioId: "gastronomicos-cct-389-04", perfil: "empleador", dispositivo: "movil", origen: "manual", conAvisos: true, motivos: ["numero_no_cierra", "datos_viejos"], creadoEl: ts("2026-11-25T10:00:00Z"), comentario: "No me da" },
    { id: "4", estrellas: 1, convenioId: "gastronomicos-cct-389-04", conAvisos: true, motivos: ["numero_no_cierra"], creadoEl: ts("2026-11-16T10:00:00Z") },
    { id: "5", estrellas: 7, convenioId: "x", creadoEl: ts("2026-11-25T10:00:00Z") }, // inválida: no cuenta
  ];

  it("totales, satisfacción (4 o 5) y cuántas de cada estrella", () => {
    const r = resumenDeCalificaciones(lista);
    expect(r.total).toBe(4);
    expect(r.promedio).toBe(3);
    expect(r.satisfaccion).toBe(0.5);
    expect(r.porEstrellas).toEqual({ 1: 1, 2: 1, 3: 0, 4: 1, 5: 1 });
  });

  it("los motivos se cuentan sobre las bajas, de más a menos", () => {
    const r = resumenDeCalificaciones(lista);
    expect(r.bajas).toBe(2);
    expect(r.motivos[0]).toMatchObject({ clave: "numero_no_cierra", total: 2 });
    expect(r.motivos.find((m) => m.clave === "datos_viejos").total).toBe(1);
    expect(r.motivos.map((m) => m.clave).sort()).toEqual(MOTIVOS.map((m) => m.id).sort());
  });

  it("los cortes: convenio, perfil, dispositivo, origen y avisos", () => {
    const r = resumenDeCalificaciones(lista);
    const de = (filas, clave) => filas.find((f) => f.clave === clave);
    expect(de(r.porConvenio, "gastronomicos-cct-389-04")).toMatchObject({ total: 2, promedio: 1.5, satisfaccion: 0 });
    expect(de(r.porConvenio, "comercio-cct-130-75")).toMatchObject({ total: 2, promedio: 4.5, satisfaccion: 1 });
    expect(de(r.porPerfil, "(no contestó)").total).toBe(2);
    expect(de(r.porDispositivo, "movil").total).toBe(2);
    expect(de(r.porOrigen, "link").total).toBe(1);
    expect(de(r.porAvisos, "con avisos")).toMatchObject({ total: 2, promedio: 1.5 });
    expect(de(r.porAvisos, "sin avisos")).toMatchObject({ total: 2, promedio: 4.5 });
  });

  it("semana a semana arranca el lunes, y los comentarios van del más nuevo al más viejo", () => {
    const r = resumenDeCalificaciones(lista);
    expect(r.porSemana.map((s) => [s.clave, s.total])).toEqual([["2026-11-16", 1], ["2026-11-23", 3]]);
    expect(r.comentarios.map((c) => c.id)).toEqual(["3", "2"]);
  });

  it("'desde' deja afuera lo anterior", () => {
    expect(resumenDeCalificaciones(lista, { desde: new Date("2026-11-24T00:00:00Z") }).total).toBe(2);
  });

  it("el CSV tiene una fila por calificación y escapa comas, comillas y saltos", () => {
    const csv = calificacionesACsv([
      { estrellas: 2, motivos: ["numero_no_cierra", "otro"], comentario: 'Dice "neto", y\nno cierra', convenioId: "comercio-cct-130-75", periodo: "2026-11", conAvisos: true, creadoEl: { seconds: 1764000000 } },
    ]);
    const [cabecera, fila] = csv.split(/\n(?=\d{4}-)/);
    expect(cabecera).toBe("fecha,estrellas,motivos,perfil,comentario,convenio,periodo,categoria,dispositivo,origen,con_avisos,calculos");
    expect(fila).toBe(`${new Date(1764000000 * 1000).toISOString()},2,numero_no_cierra otro,,"Dice ""neto"", y\nno cierra",comercio-cct-130-75,2026-11,,,,si,`);
  });
});

describe("firestore.rules valida lo mismo que manda el código", () => {
  const reglas = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const bloque = reglas.slice(reglas.indexOf("function calificacionValida"), reglas.indexOf("// --- Todo lo demás está cerrado"));

  it("las listas de motivos, perfiles, dispositivos y orígenes", () => {
    const lista = (campo) => {
      const m = bloque.match(new RegExp(`d\\.${campo}(?:\\.hasOnly\\(| in )\\[([^\\]]+)\\]`));
      return m ? m[1].split(",").map((s) => s.trim().replace(/'/g, "")) : null;
    };
    expect(lista("motivos")).toEqual(MOTIVOS.map((m) => m.id));
    expect(lista("perfil")).toEqual(PERFILES.map((p) => p.id));
    expect(lista("dispositivo")).toEqual(DISPOSITIVOS);
    expect(lista("origen")).toEqual(ORIGENES);
  });

  it("los largos, la ventana para cambiar y los campos que se pueden cambiar", () => {
    expect(bloque).toContain(`d.comentario.size() <= ${MAX_COMENTARIO}`);
    expect(bloque).toContain(`d.categoria.size() <= ${MAX_CATEGORIA}`);
    expect(bloque).toContain(`duration.value(${MINUTOS_PARA_CAMBIAR}, 'm')`);
    const cambiables = bloque.match(/affectedKeys\(\)\s*\.hasOnly\(\[([^\]]+)\]\)/)[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(cambiables).toEqual([...CAMPOS_QUE_CAMBIAN, "actualizadoEl"]);
  });

  it("todo lo que el código puede mandar está entre las claves permitidas", () => {
    const permitidas = bloque.match(/d\.keys\(\)\.hasOnly\(\[([^\]]+)\]\)/)[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    const mandadas = [
      ...Object.keys(escrituraNueva({ id: "a".repeat(20), estrellas: 1, contexto: CONTEXTO }).writes[0].update.fields),
      ...CAMPOS_QUE_CAMBIAN, "creadoEl", "actualizadoEl",
    ];
    for (const k of mandadas) expect(permitidas).toContain(k);
  });
});
