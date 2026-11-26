// lib/calificaciones.js
// Las calificaciones que la gente deja al pie del recibo ("¿Te sirvió este
// cálculo?", de 1 a 5 estrellas), y lo que el panel muestra de ellas.
//
// POR QUÉ ASÍ Y NO CON UN CARTEL: se pensó en un aviso que apareciera a los
// pocos minutos de calcular, y se descartó (26/11/2026). Interrumpe al que
// todavía está leyendo el recibo, y al que ya se fue no le llega. La tarjeta
// aparece debajo del recibo, recién cuando hay recibo, y no insiste: si la
// persona califica o dice "Ahora no", no se le vuelve a preguntar por un
// tiempo (DIAS_SIN_PREGUNTAR).
//
// QUÉ SE GUARDA Y PARA QUÉ (análisis del 26/11/2026): las estrellas solas no
// dicen qué arreglar. Por eso cada calificación lleva:
//   - lo que la persona contesta con un toque, todo opcional menos las
//     estrellas: el motivo si calificó bajo (MOTIVOS: contables, a
//     diferencia del texto libre), quién es (PERFILES) y un comentario;
//   - el contexto, que se toma solo y no le pide nada: convenio, mes y
//     categoría calculados, celular o computadora, si calculó a mano o abrió
//     un link compartido, si el recibo traía avisos (por ejemplo, que falta
//     la tabla del mes) y cuántos cálculos hizo en la visita.
// QUÉ NO SE GUARDA: ningún importe del sueldo, la antigüedad, la IP ni nada
// que identifique a la persona. El comentario avisa que no se escriban datos
// personales, y el panel puede borrar cualquiera.
//
// CÓMO SE GUARDA: en la colección `calificaciones` de Firestore, por la API
// REST, sin sesión y sin el SDK (la calculadora no lo descarga). Las reglas
// (firestore.rules) dejan que cualquiera CREE una calificación con esta forma
// exacta y que la cambie (estrellas, motivos, perfil y comentario) durante
// MINUTOS_PARA_CAMBIAR desde que la creó; sólo el administrador las lee y las
// borra. Cada una tiene un id al azar que sólo conoce el navegador que la
// creó: con eso completa lo opcional después, sin poder leer ni tocar las
// demás. Las horas las pone el servidor de Firestore, no el reloj del
// navegador.
//
// Lo puro (armar las escrituras, decidir si se pregunta, resumir para el
// panel) está separado de lo que toca la red o el navegador para poder
// probarlo: test/calificaciones.test.js. LAS LISTAS DE ABAJO SE REPITEN EN
// firestore.rules: si se cambia una, hay que cambiar las dos y volver a pegar
// las reglas en la consola.

export const COLECCION = "calificaciones";
/** Cuánto tiempo puede la persona cambiar lo que contestó. Igual en firestore.rules. */
export const MINUTOS_PARA_CAMBIAR = 30;
/** Largo máximo del comentario. Igual en firestore.rules. */
export const MAX_COMENTARIO = 1000;
/** Largo máximo de la categoría guardada (con la zona, si la hay). Igual en firestore.rules. */
export const MAX_CATEGORIA = 150;
/** Hasta cuántas estrellas se pregunta el motivo. */
export const PREGUNTA_MOTIVO_HASTA = 3;

/** Por qué calificó bajo. El orden es el de la pantalla. Igual en firestore.rules. */
export const MOTIVOS = [
  { id: "numero_no_cierra", texto: "El número no me cierra" },
  { id: "falta_categoria_o_concepto", texto: "Falta mi categoría o un concepto" },
  { id: "dificil_de_usar", texto: "Es difícil de usar" },
  { id: "datos_viejos", texto: "Los datos no están al día" },
  { id: "otro", texto: "Otra cosa" },
];
/** Quién calcula. Igual en firestore.rules. */
export const PERFILES = [
  { id: "empleado", texto: "Trabajo en relación de dependencia" },
  { id: "empleador", texto: "Soy empleador" },
  { id: "contador_rrhh", texto: "Contador o RR. HH." },
  { id: "otro", texto: "Otro" },
];
export const DISPOSITIVOS = ["movil", "escritorio"];
export const ORIGENES = ["manual", "link"];

/** Dónde recuerda el navegador que ya calificó o que no quiso. */
export const CLAVE_LOCAL = "liquidar:calificacion";
/** Cuántos días no se vuelve a preguntar. */
export const DIAS_SIN_PREGUNTAR = { calificada: 120, descartada: 30 };

const PROYECTO = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const DOCUMENTOS = `projects/${PROYECTO}/databases/(default)/documents`;
const URL_COMMIT = `https://firestore.googleapis.com/v1/${DOCUMENTOS}:commit`;

const DIA_MS = 24 * 60 * 60 * 1000;
const ID_DE_MOTIVO = new Set(MOTIVOS.map((m) => m.id));
const ID_DE_PERFIL = new Set(PERFILES.map((p) => p.id));

/** Un id al azar para la calificación nueva (20 caracteres, como los de Firestore). */
export function nuevoIdDeCalificacion(azar = () => Math.random()) {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(20));
    return Array.from(bytes, (b) => letras[b % letras.length]).join("");
  }
  return Array.from({ length: 20 }, () => letras[Math.floor(azar() * letras.length)]).join("");
}

/** 1 a 5, entero; cualquier otra cosa es null. */
export function estrellasValidas(n) {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
}

/** El comentario como se guarda: sin espacios de más en las puntas y cortado al máximo. Vacío = null. */
export function limpiarComentario(texto) {
  const t = String(texto ?? "").replace(/\r\n?/g, "\n").trim();
  return t ? t.slice(0, MAX_COMENTARIO) : null;
}

/** Los motivos conocidos, sin repetir y en el orden de la pantalla. */
export function motivosValidos(lista) {
  const elegidos = new Set((Array.isArray(lista) ? lista : []).filter((m) => ID_DE_MOTIVO.has(m)));
  return MOTIVOS.map((m) => m.id).filter((id) => elegidos.has(id));
}

export const perfilValido = (p) => (ID_DE_PERFIL.has(p) ? p : null);

/**
 * El contexto que se toma solo, ya validado: lo que no tenga la forma
 * esperada no se manda (las reglas lo rechazarían y se perdería la
 * calificación entera por un dato accesorio).
 */
export function contextoValido({ convenioId, periodo, categoria, dispositivo, origen, conAvisos, calculos } = {}) {
  const ctx = {};
  if (typeof convenioId === "string" && /^[a-z0-9-]{1,60}$/.test(convenioId)) ctx.convenioId = convenioId;
  if (typeof periodo === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) ctx.periodo = periodo;
  const cat = String(categoria ?? "").trim();
  if (cat) ctx.categoria = cat.slice(0, MAX_CATEGORIA);
  if (DISPOSITIVOS.includes(dispositivo)) ctx.dispositivo = dispositivo;
  if (ORIGENES.includes(origen)) ctx.origen = origen;
  if (typeof conAvisos === "boolean") ctx.conAvisos = conAvisos;
  const n = Number(calculos);
  if (Number.isInteger(n) && n >= 1) ctx.calculos = Math.min(n, 999);
  return ctx;
}

const nombreDe = (id) => `${DOCUMENTOS}/${COLECCION}/${id}`;

/** Un valor ya validado al formato tipado de la API REST (sólo los tipos que se usan acá). */
function aRest(v) {
  if (typeof v === "boolean") return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(aRest) } };
  return { stringValue: String(v) };
}
const aCampos = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, aRest(v)]));

/**
 * La escritura que crea la calificación: las estrellas y el contexto.
 * `currentDocument.exists: false` hace que Firestore la rechace si el id ya
 * existiera, y la hora (`creadoEl`) la pone el servidor: las reglas exigen
 * que sea la del pedido.
 */
export function escrituraNueva({ id, estrellas, contexto }) {
  const e = estrellasValidas(estrellas);
  const ctx = contextoValido(contexto);
  if (!id || !e || !ctx.convenioId || !ctx.periodo) throw new Error("Calificación inválida.");
  return {
    writes: [
      {
        update: { name: nombreDe(id), fields: aCampos({ estrellas: e, ...ctx }) },
        updateTransforms: [{ fieldPath: "creadoEl", setToServerValue: "REQUEST_TIME" }],
        currentDocument: { exists: false },
      },
    ],
  };
}

/** Los campos que la persona puede cambiar después de crear la calificación. Igual en firestore.rules. */
export const CAMPOS_QUE_CAMBIAN = ["estrellas", "motivos", "perfil", "comentario"];

/**
 * La escritura que cambia lo que la persona contestó en una calificación que
 * este navegador creó: estrellas, motivos, perfil y comentario. Toca sólo esos
 * campos (`updateMask`) y la hora del cambio, que también pone el servidor.
 * Lo que venga vacío se borra del documento (desmarcar un motivo, borrar el
 * comentario).
 */
export function escrituraDeCambio({ id, estrellas, motivos, perfil, comentario }) {
  const e = estrellasValidas(estrellas);
  if (!id || !e) throw new Error("Calificación inválida.");
  const campos = { estrellas: e };
  const m = motivosValidos(motivos);
  if (m.length) campos.motivos = m;
  const p = perfilValido(perfil);
  if (p) campos.perfil = p;
  const c = limpiarComentario(comentario);
  if (c) campos.comentario = c;
  return {
    writes: [
      {
        update: { name: nombreDe(id), fields: aCampos(campos) },
        updateMask: { fieldPaths: CAMPOS_QUE_CAMBIAN },
        updateTransforms: [{ fieldPath: "actualizadoEl", setToServerValue: "REQUEST_TIME" }],
        currentDocument: { exists: true },
      },
    ],
  };
}

/** Manda una escritura a Firestore. Lanza un Error con un mensaje para la persona si no se guardó. */
export async function enviarCalificacion(cuerpo, { fetchFn = fetch } = {}) {
  let r;
  try {
    r = await fetchFn(URL_COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new Error("No hay conexión. Probá de nuevo en un rato.");
  }
  if (!r.ok) {
    // El detalle queda en la consola; a la persona, algo que entienda.
    let detalle = "";
    try { detalle = JSON.stringify(await r.json()); } catch { /* sin cuerpo */ }
    console.error(`[calificaciones] Firestore respondió ${r.status}: ${detalle}`);
    throw new Error("No pudimos guardar tu calificación. Probá de nuevo en un rato.");
  }
}

// --- Lo que recuerda el navegador -----------------------------------------

/** Lo guardado en el navegador, o null. Nunca lanza (Safari en modo privado, cookies bloqueadas). */
export function leerRegistro(almacen) {
  try {
    const crudo = almacen?.getItem(CLAVE_LOCAL);
    const r = crudo ? JSON.parse(crudo) : null;
    return r && typeof r === "object" ? r : null;
  } catch {
    return null;
  }
}

export function guardarRegistro(almacen, registro) {
  try { almacen?.setItem(CLAVE_LOCAL, JSON.stringify(registro)); } catch { /* sin almacenamiento: se vuelve a preguntar, nada más */ }
}

/** ¿Se le pregunta a esta persona? Sí, salvo que haya calificado o dicho "Ahora no" hace poco. */
export function debePreguntar(registro, ahora = new Date()) {
  if (!registro || !registro.estado || !registro.el) return true;
  const dias = DIAS_SIN_PREGUNTAR[registro.estado];
  const desde = Date.parse(registro.el);
  if (!dias || !Number.isFinite(desde)) return true;
  return ahora.getTime() - desde >= dias * DIA_MS;
}

/** ¿Todavía puede cambiar la calificación que creó? Con un minuto de margen por los relojes. */
export function puedeCambiar(registro, ahora = new Date()) {
  if (!registro || registro.estado !== "calificada" || !registro.id) return false;
  const desde = Date.parse(registro.el);
  return Number.isFinite(desde) && ahora.getTime() - desde < (MINUTOS_PARA_CAMBIAR - 1) * 60 * 1000;
}

/** "movil" o "escritorio", por el ancho de la ventana (el corte de Tailwind `md`, 768 px). */
export function dispositivoDe(ancho) {
  return Number(ancho) > 0 && Number(ancho) < 768 ? "movil" : "escritorio";
}

// --- Para el panel ---------------------------------------------------------

/** Una fecha de Firestore (Timestamp del SDK, texto ISO o Date) a Date, o null. */
export function aFecha(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const promedio = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Proporción de 4 y 5 estrellas: la "satisfacción", más robusta que el promedio. */
const satisfaccion = (xs) => (xs.length ? xs.filter((e) => e >= 4).length / xs.length : null);

/** Agrupa por un campo y resume cada grupo: cuántas, promedio y satisfacción. */
function porGrupo(validas, campo, sinDato = "(sin dato)") {
  const grupos = new Map();
  for (const c of validas) {
    const k = c[campo] === undefined || c[campo] === null || c[campo] === "" ? sinDato : String(c[campo]);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(c.estrellas);
  }
  return [...grupos.entries()]
    .map(([clave, xs]) => ({ clave, total: xs.length, promedio: promedio(xs), satisfaccion: satisfaccion(xs) }))
    .sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave));
}

/** Con menos que esto, una diferencia entre grupos no dice nada. El panel lo marca. */
export const MINIMO_PARA_COMPARAR = 20;

/**
 * Lo que muestra la pestaña Calificaciones. Ignora lo que no tenga
 * estrellas válidas. `desde` (Date) deja sólo las de esa fecha en adelante.
 */
export function resumenDeCalificaciones(lista = [], { desde = null } = {}) {
  const validas = lista
    .map((c) => ({ ...c, estrellas: estrellasValidas(c.estrellas), fecha: aFecha(c.creadoEl) }))
    .filter((c) => c.estrellas && (!desde || (c.fecha && c.fecha >= desde)));
  const estrellas = validas.map((c) => c.estrellas);
  const porEstrellas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const e of estrellas) porEstrellas[e] += 1;

  // Los motivos se cuentan sobre las calificaciones bajas, que son las que los ven.
  const bajas = validas.filter((c) => c.estrellas <= PREGUNTA_MOTIVO_HASTA);
  const motivos = MOTIVOS.map((m) => ({
    clave: m.id,
    texto: m.texto,
    total: bajas.filter((c) => Array.isArray(c.motivos) && c.motivos.includes(m.id)).length,
  })).sort((a, b) => b.total - a.total);

  // Semana a semana (lunes), para ver si algo empeoró después de cargar un mes o publicar.
  const semanas = new Map();
  for (const c of validas) {
    if (!c.fecha) continue;
    const d = new Date(Date.UTC(c.fecha.getUTCFullYear(), c.fecha.getUTCMonth(), c.fecha.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    if (!semanas.has(k)) semanas.set(k, []);
    semanas.get(k).push(c.estrellas);
  }
  const porSemana = [...semanas.entries()]
    .map(([clave, xs]) => ({ clave, total: xs.length, promedio: promedio(xs), satisfaccion: satisfaccion(xs) }))
    .sort((a, b) => a.clave.localeCompare(b.clave));

  const conTexto = validas
    .filter((c) => limpiarComentario(c.comentario))
    .sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));

  return {
    total: validas.length,
    promedio: promedio(estrellas),
    satisfaccion: satisfaccion(estrellas),
    porEstrellas,
    bajas: bajas.length,
    motivos,
    porConvenio: porGrupo(validas, "convenioId"),
    porPerfil: porGrupo(validas, "perfil", "(no contestó)"),
    porDispositivo: porGrupo(validas, "dispositivo"),
    porOrigen: porGrupo(validas, "origen"),
    porAvisos: porGrupo(validas.map((c) => ({ ...c, avisos: c.conAvisos === true ? "con avisos" : c.conAvisos === false ? "sin avisos" : null })), "avisos"),
    porSemana,
    comentarios: conTexto,
  };
}

/** Las calificaciones como CSV, para abrir en Excel o en una planilla. */
export function calificacionesACsv(lista = []) {
  const celda = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const columnas = ["fecha", "estrellas", "motivos", "perfil", "comentario", "convenio", "periodo", "categoria", "dispositivo", "origen", "con_avisos", "calculos"];
  const filas = [columnas];
  for (const c of lista) {
    const f = aFecha(c.creadoEl);
    filas.push([
      f ? f.toISOString() : "",
      c.estrellas ?? "",
      Array.isArray(c.motivos) ? c.motivos.join(" ") : "",
      c.perfil ?? "",
      c.comentario ?? "",
      c.convenioId ?? "",
      c.periodo ?? "",
      c.categoria ?? "",
      c.dispositivo ?? "",
      c.origen ?? "",
      c.conAvisos === undefined ? "" : c.conAvisos ? "si" : "no",
      c.calculos ?? "",
    ]);
  }
  return filas.map((fila) => fila.map(celda).join(",")).join("\n");
}
