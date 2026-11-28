// test/calificaciones.test.js
// La calificación del pie del recibo (lib/calificaciones.js): lo que se manda
// a Firestore, cuándo se pregunta, lo que resume el panel, el CSV, y que las
// listas y los topes del código sigan siendo los mismos que valida
// firestore.rules (están escritos en los dos lados: si se separan, las
// calificaciones se rechazan en silencio).

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  MOTIVOS,
  PERFILES,
  DISPOSITIVOS,
  ORIGENES,
  ENTORNOS,
  MAX_COMENTARIO,
  MAX_CATEGORIA,
  MINUTOS_PARA_CAMBIAR,
  CAMPOS_QUE_CAMBIAN,
  DIAS_SIN_INVITAR,
  nuevoIdDeCalificacion,
  estrellasValidas,
  limpiarComentario,
  motivosValidos,
  contextoValido,
  entornoDe,
  escrituraNueva,
  escrituraDeCambio,
  enviarCalificacion,
  leerRegistro,
  guardarRegistro,
  debeInvitar,
  calificoHacePoco,
  puedeCambiar,
  dispositivoDe,
  fechaArgentina,
  lunesArgentino,
  resumenDeCalificaciones,
  calificacionesACsv,
  CLAVE_LOCAL,
} from "../lib/calificaciones.js";

const CONTEXTO = { convenioId: "comercio-cct-130-75", periodo: "2026-11", categoria: "Vendedor B", origen: "manual", faltanDatos: false, calculos: 2, dispositivo: "movil" };
const dias = (n) => n * 24 * 60 * 60 * 1000;

describe("lo que se manda a Firestore", () => {
  it("el id es de 20 letras y números, como pide la regla", () => {
    for (let i = 0; i < 20; i++) expect(nuevoIdDeCalificacion()).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(nuevoIdDeCalificacion()).not.toBe(nuevoIdDeCalificacion());
  });

  it("crear: las estrellas y el contexto tipados, la hora del servidor y que el id no exista", () => {
    const { writes } = escrituraNueva({ id: "a".repeat(20), estrellas: 4, contexto: { ...CONTEXTO, entorno: "prueba" } });
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
      faltanDatos: { booleanValue: false },
      calculos: { integerValue: "2" },
      entorno: { stringValue: "prueba" },
    });
    expect(w.updateTransforms).toEqual([{ fieldPath: "creadoEl", setToServerValue: "REQUEST_TIME" }]);
    expect(w.currentDocument).toEqual({ exists: false });
    expect(w.updateMask).toBeUndefined();
  });

  it("crear, de quien ya había calificado: va marcada y lleva para qué usa la calculadora, en la misma alta", () => {
    const [w] = escrituraNueva({ id: "b".repeat(20), estrellas: 2, perfil: "contador_rrhh", contexto: { ...CONTEXTO, yaCalifico: true } }).writes;
    expect(w.update.fields).toMatchObject({
      estrellas: { integerValue: "2" },
      perfil: { stringValue: "contador_rrhh" },
      yaCalifico: { booleanValue: true },
    });
    // Sigue siendo un alta: sin máscara y sin `actualizadoEl`, que en el panel contaría como que siguió.
    expect(w.currentDocument).toEqual({ exists: false });
    expect(w.updateMask).toBeUndefined();
    expect(w.updateTransforms).toEqual([{ fieldPath: "creadoEl", setToServerValue: "REQUEST_TIME" }]);

    // La primera de cada persona va como siempre: sin la marca. Y un perfil que no existe no viaja.
    const primera = escrituraNueva({ id: "b".repeat(20), estrellas: 2, perfil: "jefe", contexto: { ...CONTEXTO, yaCalifico: false } }).writes[0].update.fields;
    expect(primera.yaCalifico).toBeUndefined();
    expect(primera.perfil).toBeUndefined();
    expect(contextoValido({ yaCalifico: "sí" })).toEqual({});
    expect(contextoValido({ yaCalifico: true })).toEqual({ yaCalifico: true });
  });

  it("el contexto que no tiene la forma esperada no se manda (si no, la regla rechazaría toda la calificación)", () => {
    const ctx = contextoValido({
      convenioId: "comercio-cct-130-75", periodo: "2026-11",
      categoria: "  " + "x".repeat(400) + "  ", dispositivo: "tablet", origen: "qr", faltanDatos: "sí", calculos: 0, entorno: "produccion",
    });
    expect(ctx).toEqual({ convenioId: "comercio-cct-130-75", periodo: "2026-11", categoria: "x".repeat(MAX_CATEGORIA) });
    expect(contextoValido({ convenioId: "Comercio CCT", periodo: "2026-13", calculos: 5000 })).toEqual({ calculos: 999 });
  });

  it("lo que no viene de liquidar.ar (la PC, una preview) se marca como prueba", () => {
    expect(entornoDe("liquidar.ar")).toBeNull();
    expect(entornoDe("www.liquidar.ar")).toBeNull();
    expect(entornoDe("LIQUIDAR.AR")).toBeNull();
    expect(entornoDe("localhost")).toBe("prueba");
    expect(entornoDe("calificaciones.calculadora-tandil.pages.dev")).toBe("prueba");
    expect(entornoDe("")).toBe("prueba");
  });

  it("sin convenio, sin mes o con estrellas fuera de 1 a 5 no se arma nada", () => {
    expect(() => escrituraNueva({ id: "a".repeat(20), estrellas: 4, contexto: { periodo: "2026-11" } })).toThrow();
    expect(() => escrituraNueva({ id: "a".repeat(20), estrellas: 4, contexto: { convenioId: "x" } })).toThrow();
    for (const e of [0, 6, 3.5, null]) expect(() => escrituraNueva({ id: "a".repeat(20), estrellas: e, contexto: CONTEXTO })).toThrow();
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

  it("manda un POST al commit de Firestore, que sobrevive al cierre de la pestaña y tiene tiempo límite", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true }));
    const cuerpo = escrituraNueva({ id: "c".repeat(20), estrellas: 5, contexto: CONTEXTO });
    await enviarCalificacion(cuerpo, { fetchFn });
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toMatch(/^https:\/\/firestore\.googleapis\.com\/v1\/projects\/.+\/databases\/\(default\)\/documents:commit$/);
    expect(opciones.method).toBe("POST");
    expect(opciones.keepalive).toBe(true);
    expect(opciones.signal).toBeDefined();
    expect(JSON.parse(opciones.body)).toEqual(cuerpo);
  });

  it("si Firestore no lo acepta, lanza un mensaje para la persona con el estado; si no hay respuesta, lo dice", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rechazo = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: { status: "PERMISSION_DENIED" } }) }));
    const e1 = await enviarCalificacion({}, { fetchFn: rechazo }).catch((e) => e);
    expect(e1.message).toContain("No pudimos guardar tu calificación");
    expect(e1.status).toBe(403);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("PERMISSION_DENIED"));
    const sinRed = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    const e2 = await enviarCalificacion({}, { fetchFn: sinRed }).catch((e) => e);
    expect(e2.message).toContain("No hay conexión");
    expect(e2.sinRespuesta).toBe(true);
    expect(e2.status).toBeUndefined();
  });
});

describe("a quién se invita, y quién ya había calificado", () => {
  const ahora = new Date("2026-11-26T15:00:00Z");
  const hace = (ms) => new Date(ahora.getTime() - ms).toISOString();

  it("a quien nunca contestó, siempre", () => {
    expect(debeInvitar(null, ahora)).toBe(true);
    expect(debeInvitar({ estado: "rara", el: hace(0) }, ahora)).toBe(true);
    expect(debeInvitar({ estado: "calificada", el: "cualquier cosa" }, ahora)).toBe(true);
  });

  it("después de calificar, no por un tiempo largo; después de 'Ahora no', por uno más corto", () => {
    expect(debeInvitar({ estado: "calificada", el: hace(dias(DIAS_SIN_INVITAR.calificada - 1)) }, ahora)).toBe(false);
    expect(debeInvitar({ estado: "calificada", el: hace(dias(DIAS_SIN_INVITAR.calificada)) }, ahora)).toBe(true);
    expect(debeInvitar({ estado: "descartada", el: hace(dias(DIAS_SIN_INVITAR.descartada - 1)) }, ahora)).toBe(false);
    expect(debeInvitar({ estado: "descartada", el: hace(dias(DIAS_SIN_INVITAR.descartada)) }, ahora)).toBe(true);
    expect(DIAS_SIN_INVITAR.descartada).toBeLessThan(DIAS_SIN_INVITAR.calificada);
  });

  it("ya había calificado: sólo quien calificó (no quien dijo 'Ahora no'), y mientras dura el tiempo sin invitar", () => {
    expect(calificoHacePoco(null, ahora)).toBe(false);
    expect(calificoHacePoco({ estado: "calificada", el: hace(0) }, ahora)).toBe(true);
    expect(calificoHacePoco({ estado: "calificada", el: hace(dias(DIAS_SIN_INVITAR.calificada - 1)) }, ahora)).toBe(true);
    // Pasado ese tiempo vuelve a empezar: se la invita y su calificación es otra vez "la primera".
    expect(calificoHacePoco({ estado: "calificada", el: hace(dias(DIAS_SIN_INVITAR.calificada)) }, ahora)).toBe(false);
    expect(calificoHacePoco({ estado: "descartada", el: hace(dias(1)) }, ahora)).toBe(false);
    expect(calificoHacePoco({ estado: "calificada", el: "cualquier cosa" }, ahora)).toBe(false);
  });

  it("se puede cambiar lo contestado durante un día (la ventana de la regla), con unos minutos de margen", () => {
    expect(MINUTOS_PARA_CAMBIAR).toBe(24 * 60);
    const reg = (min) => ({ estado: "calificada", id: "x", el: hace(min * 60 * 1000) });
    expect(puedeCambiar(reg(1), ahora)).toBe(true);
    expect(puedeCambiar(reg(60 * 20), ahora)).toBe(true);
    expect(puedeCambiar(reg(MINUTOS_PARA_CAMBIAR - 6), ahora)).toBe(true);
    expect(puedeCambiar(reg(MINUTOS_PARA_CAMBIAR - 4), ahora)).toBe(false);
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

describe("las fechas, en hora argentina", () => {
  it("la fecha del CSV y del panel", () => {
    expect(fechaArgentina(new Date("2026-12-01T01:15:00Z"))).toBe("2026-11-30 22:15");
    expect(fechaArgentina({ seconds: Date.parse("2026-11-26T15:00:00Z") / 1000 })).toBe("2026-11-26 12:00");
    expect(fechaArgentina(null)).toBe("");
  });

  it("el domingo a la noche es de esa semana, no de la siguiente", () => {
    // Domingo 29/11/2026 21:30 en la Argentina = lunes 30/11 00:30 UTC.
    expect(lunesArgentino(new Date("2026-11-30T00:30:00Z"))).toBe("2026-11-23");
    expect(lunesArgentino(new Date("2026-11-30T03:00:00Z"))).toBe("2026-11-30");
  });
});

describe("el resumen del panel", () => {
  const ts = (iso) => ({ toDate: () => new Date(iso) });
  const lista = [
    { id: "1", estrellas: 5, convenioId: "comercio-cct-130-75", perfil: "empleado", dispositivo: "movil", origen: "manual", faltanDatos: false, creadoEl: ts("2026-11-23T13:00:00Z") },
    { id: "2", estrellas: 4, convenioId: "comercio-cct-130-75", dispositivo: "escritorio", origen: "link", faltanDatos: false, creadoEl: ts("2026-11-24T13:00:00Z"), comentario: "Muy claro" },
    { id: "3", estrellas: 2, convenioId: "gastronomicos-cct-389-04", perfil: "empleador", dispositivo: "movil", origen: "manual", faltanDatos: true, motivos: ["numero_no_cierra", "datos_viejos"], creadoEl: ts("2026-11-25T13:00:00Z"), comentario: "No me da" },
    { id: "4", estrellas: 1, convenioId: "gastronomicos-cct-389-04", faltanDatos: true, motivos: ["numero_no_cierra"], creadoEl: ts("2026-11-09T13:00:00Z") },
    { id: "5", estrellas: 7, convenioId: "x", creadoEl: ts("2026-11-25T13:00:00Z") }, // inválida: no cuenta
    { id: "6", estrellas: 1, convenioId: "comercio-cct-130-75", entorno: "prueba", creadoEl: ts("2026-11-25T13:00:00Z") }, // prueba: no cuenta
  ];
  const HOY = new Date("2026-11-26T15:00:00Z");

  it("totales, satisfacción (4 o 5) y cuántas de cada estrella, sin las de prueba", () => {
    const r = resumenDeCalificaciones(lista, { hasta: HOY });
    expect(r.total).toBe(4);
    expect(r.pruebas).toBe(1);
    expect(r.promedio).toBe(3);
    expect(r.satisfaccion).toBe(0.5);
    expect(r.porEstrellas).toEqual({ 1: 1, 2: 1, 3: 0, 4: 1, 5: 1 });
    expect(resumenDeCalificaciones(lista, { hasta: HOY, incluirPruebas: true }).total).toBe(5);
  });

  it("los motivos se cuentan sobre las bajas, de más a menos", () => {
    const r = resumenDeCalificaciones(lista, { hasta: HOY });
    expect(r.bajas).toBe(2);
    expect(r.motivos[0]).toMatchObject({ clave: "numero_no_cierra", total: 2 });
    expect(r.motivos.find((m) => m.clave === "datos_viejos").total).toBe(1);
    expect(r.motivos.map((m) => m.clave).sort()).toEqual(MOTIVOS.map((m) => m.id).sort());
  });

  it("los cortes: convenio, perfil, dispositivo, origen y si le faltaban datos", () => {
    const r = resumenDeCalificaciones(lista, { hasta: HOY });
    const de = (filas, clave) => filas.find((f) => f.clave === clave);
    expect(de(r.porConvenio, "gastronomicos-cct-389-04")).toMatchObject({ total: 2, promedio: 1.5, satisfaccion: 0 });
    expect(de(r.porConvenio, "comercio-cct-130-75")).toMatchObject({ total: 2, promedio: 4.5, satisfaccion: 1 });
    expect(de(r.porPerfil, "(no contestó)").total).toBe(2);
    expect(de(r.porDispositivo, "movil").total).toBe(2);
    expect(de(r.porOrigen, "link").total).toBe(1);
    expect(de(r.porFaltanDatos, "faltaban")).toMatchObject({ total: 2, promedio: 1.5 });
    expect(de(r.porFaltanDatos, "completos")).toMatchObject({ total: 2, promedio: 4.5 });
  });

  it("la primera de cada persona y las de quien ya había calificado se cuentan aparte, y se puede mirar una sola", () => {
    const conRepetidas = [
      ...lista,
      { id: "7", estrellas: 5, convenioId: "comercio-cct-130-75", perfil: "contador_rrhh", yaCalifico: true, creadoEl: ts("2026-11-25T14:00:00Z") },
      { id: "8", estrellas: 5, convenioId: "comercio-cct-130-75", perfil: "contador_rrhh", yaCalifico: true, creadoEl: ts("2026-11-25T15:00:00Z"), actualizadoEl: ts("2026-11-25T15:01:00Z") },
    ];
    const sinRepetidas = resumenDeCalificaciones(lista, { hasta: HOY });
    const todas = resumenDeCalificaciones(conRepetidas, { hasta: HOY });
    expect(todas.total).toBe(6);
    const de = (clave) => todas.porVez.find((f) => f.clave === clave);
    expect(de("primera")).toMatchObject({ total: 4, promedio: 3 });
    expect(de("siguiente")).toMatchObject({ total: 2, promedio: 5 });
    // Lo de antes del 28/11/2026 no trae el campo: son todas primeras.
    expect(sinRepetidas.porVez).toEqual([expect.objectContaining({ clave: "primera", total: 4 })]);

    // Sólo la primera de cada persona: los mismos números que sin las repetidas.
    const primeras = resumenDeCalificaciones(conRepetidas, { hasta: HOY, vez: "primera" });
    expect(primeras.total).toBe(4);
    expect(primeras.promedio).toBe(sinRepetidas.promedio);
    expect(primeras.seguimiento).toEqual(sinRepetidas.seguimiento);
    expect(primeras.porSemana).toEqual(sinRepetidas.porSemana);

    const siguientes = resumenDeCalificaciones(conRepetidas, { hasta: HOY, vez: "siguiente" });
    expect(siguientes.calificaciones.map((c) => c.id)).toEqual(["8", "7"]);
    expect(siguientes.seguimiento[0]).toMatchObject({ total: 2, siguieron: 1, conPerfil: 2 });
    // Un valor que no existe no filtra nada.
    expect(resumenDeCalificaciones(conRepetidas, { hasta: HOY, vez: "cualquiera" }).total).toBe(6);
  });

  it("semana a semana muestra también las semanas vacías, hasta la que está en curso", () => {
    const r = resumenDeCalificaciones(lista, { hasta: HOY });
    expect(r.porSemana.map((s) => [s.clave, s.total, s.enCurso])).toEqual([
      ["2026-11-09", 1, false],
      ["2026-11-16", 0, false],
      ["2026-11-23", 3, true],
    ]);
    expect(r.porSemana[1]).toMatchObject({ promedio: null, satisfaccion: null });
  });

  it("los comentarios y la lista completa van del más nuevo al más viejo", () => {
    const r = resumenDeCalificaciones(lista, { hasta: HOY });
    expect(r.comentarios.map((c) => c.id)).toEqual(["3", "2"]);
    expect(r.calificaciones.map((c) => c.id)).toEqual(["3", "2", "1", "4"]);
  });

  it("'desde' deja afuera lo anterior, y las semanas arrancan ahí", () => {
    const r = resumenDeCalificaciones(lista, { desde: new Date("2026-11-24T00:00:00Z"), hasta: HOY });
    expect(r.total).toBe(2);
    expect(r.porSemana.map((s) => s.clave)).toEqual(["2026-11-23"]);
  });

  it("cuántos siguen después de la estrella, en total y por celular y computadora, sin las de prueba", () => {
    const el = ts("2026-11-25T13:00:00Z");
    const despues = ts("2026-11-25T13:01:00Z");
    const seguidas = [
      { id: "m1", estrellas: 5, dispositivo: "movil", perfil: "empleado", creadoEl: el, actualizadoEl: despues },
      { id: "m2", estrellas: 2, dispositivo: "movil", motivos: ["numero_no_cierra"], perfil: "contador_rrhh", comentario: "No me da", creadoEl: el, actualizadoEl: despues },
      { id: "m3", estrellas: 3, dispositivo: "movil", creadoEl: el }, // sólo la estrella
      { id: "e1", estrellas: 4, dispositivo: "escritorio", comentario: "Muy claro", creadoEl: el, actualizadoEl: despues },
      { id: "e2", estrellas: 1, dispositivo: "escritorio", motivos: [], creadoEl: el, actualizadoEl: despues }, // marcó un motivo y lo sacó
      { id: "s1", estrellas: 5, perfil: "otro", creadoEl: el }, // sin dispositivo: sólo en el total
      { id: "p1", estrellas: 1, dispositivo: "movil", motivos: ["otro"], perfil: "otro", comentario: "probando", entorno: "prueba", creadoEl: el, actualizadoEl: despues },
      { id: "x1", estrellas: 0, dispositivo: "movil", perfil: "otro", creadoEl: el, actualizadoEl: despues }, // inválida
    ];
    const r = resumenDeCalificaciones(seguidas, { hasta: HOY });
    expect(r.seguimiento).toEqual([
      { clave: "total", total: 6, siguieron: 4, conPerfil: 3, bajas: 3, bajasConMotivo: 1, conComentario: 2 },
      { clave: "movil", total: 3, siguieron: 2, conPerfil: 2, bajas: 2, bajasConMotivo: 1, conComentario: 1 },
      { clave: "escritorio", total: 2, siguieron: 2, conPerfil: 0, bajas: 1, bajasConMotivo: 0, conComentario: 1 },
    ]);
    // "Para qué la usaron" es "Para qué la usan" sin la fila "(no contestó)".
    expect(r.seguimiento[0].conPerfil).toBe(r.total - r.porPerfil.find((f) => f.clave === "(no contestó)").total);
    // Con "Incluir pruebas", la de prueba entra, como en el resto del panel.
    expect(resumenDeCalificaciones(seguidas, { hasta: HOY, incluirPruebas: true }).seguimiento[0]).toMatchObject({ total: 7, siguieron: 5, bajasConMotivo: 2 });
    // Sin ninguna, las filas están igual, en cero.
    expect(resumenDeCalificaciones([], { hasta: HOY }).seguimiento.map((f) => [f.clave, f.total])).toEqual([["total", 0], ["movil", 0], ["escritorio", 0]]);
  });

  it("'siguieron' también semana a semana, para comparar antes y después de cambiar la tarjeta", () => {
    const antes = ts("2026-11-17T13:00:00Z");
    const despues = ts("2026-11-25T13:00:00Z");
    const luego = ts("2026-11-25T13:01:00Z");
    const r = resumenDeCalificaciones(
      [
        { id: "a1", estrellas: 5, creadoEl: antes },
        { id: "a2", estrellas: 4, creadoEl: antes, actualizadoEl: ts("2026-11-17T13:01:00Z") },
        { id: "d1", estrellas: 5, creadoEl: despues, actualizadoEl: luego },
        { id: "d2", estrellas: 2, creadoEl: despues, actualizadoEl: luego },
        { id: "d3", estrellas: 3, creadoEl: despues },
      ],
      { hasta: HOY }
    );
    expect(r.porSemana.map((s) => [s.clave, s.total, s.siguieron])).toEqual([
      ["2026-11-16", 2, 1],
      ["2026-11-23", 3, 2],
    ]);
  });
});

describe("el CSV", () => {
  it("separado por punto y coma (Excel en castellano), con las fechas en hora argentina y el id", () => {
    const csv = calificacionesACsv([
      { id: "abc", estrellas: 2, motivos: ["numero_no_cierra", "otro"], comentario: 'Dice "neto"; y\nno cierra', convenioId: "comercio-cct-130-75", periodo: "2026-11", faltanDatos: true, entorno: "prueba", creadoEl: new Date("2026-12-01T01:15:00Z"), actualizadoEl: new Date("2026-12-01T02:40:00Z") },
      // Como llega del panel: la hora es un Timestamp de Firestore. Sin `actualizadoEl` (no siguió), la celda va vacía.
      { id: "def", estrellas: 5, creadoEl: { toDate: () => new Date("2026-11-26T15:00:00Z") } },
      { id: "ghi", estrellas: 4, yaCalifico: true, creadoEl: { toDate: () => new Date("2026-11-26T15:00:00Z") }, actualizadoEl: { toDate: () => new Date("2026-11-27T02:59:00Z") } },
    ]);
    const [cabecera, fila, sinSeguir, conTimestamp] = csv.split("\r\n");
    expect(cabecera).toBe("fecha;actualizado;estrellas;motivos;perfil;comentario;convenio;periodo;categoria;dispositivo;origen;faltan_datos;calculos;ya_califico;entorno;id");
    expect(fila).toBe('2026-11-30 22:15;2026-11-30 23:40;2;numero_no_cierra otro;;"Dice ""neto""; y\nno cierra";comercio-cct-130-75;2026-11;;;;si;;no;prueba;abc');
    // Diez celdas vacías entre las estrellas y "ya_califico" (de motivos a calculos), y la de entorno.
    expect(sinSeguir).toBe(["2026-11-26 12:00", "", "5", ...Array(10).fill(""), "no", "", "def"].join(";"));
    // 02:59 UTC del 27 es todavía el 26 a la noche en la Argentina.
    expect(conTimestamp.split(";").slice(0, 2)).toEqual(["2026-11-26 12:00", "2026-11-26 23:59"]);
    // La de quien ya había calificado otro recibo.
    expect(conTimestamp.split(";").slice(-3)).toEqual(["si", "", "ghi"]);
  });

  it("un comentario que empieza con =, +, - o @ no llega a Excel como fórmula", () => {
    const comentarios = ["=1+1", "+54 9 11", "-falta el presentismo", "@hola", "=HIPERVINCULO(\"http://x\")"];
    const filas = calificacionesACsv(comentarios.map((c, i) => ({ id: String(i), estrellas: 3, comentario: c }))).split("\r\n").slice(1);
    filas.forEach((fila, i) => {
      const celda = fila.split(";")[5];
      expect(celda.replace(/^"|"$/g, "").replace(/""/g, '"')).toBe("'" + comentarios[i]);
    });
  });
});

describe("firestore.rules valida lo mismo que manda el código", () => {
  const reglas = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const bloque = reglas.slice(reglas.indexOf("function calificacionValida"), reglas.indexOf("// --- Todo lo demás está cerrado"));

  it("las listas de motivos, perfiles, dispositivos, orígenes y entornos", () => {
    const lista = (campo) => {
      const m = bloque.match(new RegExp(`d\\.${campo}(?:\\.hasOnly\\(| in )\\[([^\\]]+)\\]`));
      return m ? m[1].split(",").map((s) => s.trim().replace(/'/g, "")) : null;
    };
    expect(lista("motivos")).toEqual(MOTIVOS.map((m) => m.id));
    expect(lista("perfil")).toEqual(PERFILES.map((p) => p.id));
    expect(lista("dispositivo")).toEqual(DISPOSITIVOS);
    expect(lista("origen")).toEqual(ORIGENES);
    expect(lista("entorno")).toEqual(ENTORNOS);
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
      ...Object.keys(escrituraNueva({ id: "a".repeat(20), estrellas: 1, perfil: "otro", contexto: { ...CONTEXTO, entorno: "prueba", yaCalifico: true } }).writes[0].update.fields),
      ...CAMPOS_QUE_CAMBIAN, "creadoEl", "actualizadoEl",
    ];
    expect(mandadas).toContain("yaCalifico");
    for (const k of mandadas) expect(permitidas).toContain(k);
  });

  it("`yaCalifico` sólo puede ser true, y se pone al crear: no está entre lo que se cambia después", () => {
    expect(bloque).toContain("(!('yaCalifico' in d) || d.yaCalifico == true)");
    expect(CAMPOS_QUE_CAMBIAN).not.toContain("yaCalifico");
    // El código tampoco manda otra cosa que true (un false lo rechazarían las reglas).
    expect(contextoValido({ yaCalifico: false })).toEqual({});
  });
});

// La tarjeta (components/calculadora/CalificarExperiencia.jsx) necesita dos
// cosas de app/globals.css. Va acá, en Node: con jsdom, Vitest no deja leer un
// .css como texto, y node:fs no carga en el build de Cloudflare.
describe("app/globals.css, para la tarjeta de calificación", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  it("tiene la animación del tilde (sin ella, el tilde queda invisible)", () => {
    expect(css).toMatch(/@keyframes calificacion-trazo\s*\{\s*to\s*\{\s*stroke-dashoffset:\s*0;?\s*\}\s*\}/);
  });
  it("tiene el destello de las estrellas al entrar, que arranca y termina sin relleno", () => {
    expect(css).toMatch(/@keyframes calificacion-destello\s*\{\s*0%,\s*100%\s*\{\s*fill:\s*transparent;?\s*\}/);
  });
  it("mientras flota, reserva su alto en lo del recibo y no en la página (la franja de la página incluía a la tarjeta y el recibo saltaba)", () => {
    expect(css).toContain('[data-recibo]:has([data-calificacion="flotando"]) :not([data-flotante], [data-flotante] *)');
    expect(css).toMatch(/scroll-margin-bottom:\s*var\(--reserva-calificacion/);
    expect(css).not.toMatch(/scroll-padding-bottom/);
  });
  it("en el celular se desplaza la ventana, no el body: si no, lo pegado al pie queda debajo de las barras del navegador", () => {
    expect(css).toMatch(/@supports \(overflow-x: clip\)\s*\{\s*body\s*\{\s*overflow-x:\s*clip;/);
  });
  it("el body no tiene alto fijo: con height 100% la barra de arriba se despegaba al bajar una pantalla en la compu", () => {
    const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(sinComentarios).toMatch(/(^|[;}\s])html\s*\{\s*height:\s*100%;\s*\}/);
    expect(sinComentarios).not.toMatch(/body[^{}]*\{[^}]*\bheight:\s*100%/);
  });
});
