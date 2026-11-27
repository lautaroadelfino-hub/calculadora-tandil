// lib/calificaciones.js
// Las calificaciones que la gente deja en el recibo ("¿Te sirvió este
// cálculo?", de 1 a 5 estrellas), y lo que el panel muestra de ellas.
//
// POR QUÉ ASÍ Y NO CON UN CARTEL: se pensó en un aviso que apareciera a los
// pocos minutos de calcular, y se descartó (26/11/2026). Interrumpe al que
// todavía está leyendo el recibo, y al que ya se fue no le llega. Tampoco hay
// reloj: la tarjeta (components/calculadora/CalificarExperiencia.jsx) entra
// recién cuando los tres números del recibo ya se vieron enteros. Flota en la
// columna del recibo, pegada al pie de la pantalla mientras el recibo está a
// la vista, y al final se apoya sola debajo del recibo: nunca queda encima
// del formulario. Después de la estrella pregunta lo opcional de a una
// pregunta. No tiene "Ahora no" ni × (el dueño, 26/11/2026: que quede
// flotando y que no moleste): el que no quiere no toca nada, y si después de
// la estrella sigue leyendo el recibo sin contestar, la tarjeta se achica a
// una línea que sigue flotando. Después de calificar no se vuelve a preguntar
// por un tiempo (DIAS_SIN_PREGUNTAR; "descartada" queda sólo por los
// registros de la primera versión, que tenía "Ahora no").
//
// QUÉ SE GUARDA Y PARA QUÉ (análisis del 26/11/2026): las estrellas solas no
// dicen qué arreglar. Por eso cada calificación lleva:
//   - lo que la persona contesta con un toque, todo opcional menos las
//     estrellas: el motivo si calificó bajo (MOTIVOS: contables, a
//     diferencia del texto libre), para qué usó la calculadora (PERFILES) y
//     un comentario;
//   - el contexto, que se toma solo y no le pide nada: convenio, mes y
//     categoría del recibo que calificó, celular o computadora, si ese recibo
//     lo armó un link compartido o lo calculó a mano, si le faltaban datos
//     (una tabla del mes que no está, o que se tomó de otro mes) y cuántas
//     cuentas lleva en esa visita a la página.
//   - `entorno: "prueba"` cuando no viene de liquidar.ar (la PC, una
//     preview): esas también van a la base de producción, y el panel las deja
//     afuera de los números.
// QUÉ NO SE GUARDA: ningún importe del sueldo, la antigüedad, la IP ni nada
// que identifique a la persona. El comentario avisa que no se escriban datos
// personales, la persona lo puede borrar, y el panel puede borrar cualquiera.
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
// LO QUE LAS REGLAS NO PUEDEN EVITAR: que alguien con un programa cree
// calificaciones falsas, porque no hay sesión con la que limitarlo (revisión
// del 26/11/2026). El panel tiene con qué limpiarlas (borrar una o todas las
// filtradas); si algún día pasa de verdad, la salida es que la tarjeta escriba
// por una ruta del sitio con límite por IP (ver docs/continuidad.md).
//
// Lo puro (armar las escrituras, decidir si se pregunta, resumir para el
// panel) está separado de lo que toca la red o el navegador para poder
// probarlo: test/calificaciones.test.js. LAS LISTAS DE ABAJO SE REPITEN EN
// firestore.rules (un test controla que coincidan): si se cambia una, hay que
// cambiar las dos y volver a pegar las reglas en la consola.

export const COLECCION = "calificaciones";
/**
 * Cuánto tiempo puede la persona cambiar lo que contestó: un día. Con 30
 * minutos se perdía el comentario de quien se ponía a comparar con su recibo
 * y volvía más tarde (revisión del 26/11/2026). El id es secreto, así que una
 * ventana larga no expone nada. Igual en firestore.rules.
 */
export const MINUTOS_PARA_CAMBIAR = 24 * 60;
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
/** Para qué usó la calculadora. Igual en firestore.rules. */
export const PERFILES = [
  { id: "empleado", texto: "Trabajo en relación de dependencia" },
  { id: "empleador", texto: "Soy empleador" },
  { id: "contador_rrhh", texto: "Contador o RR. HH." },
  { id: "otro", texto: "Otro" },
];
export const DISPOSITIVOS = ["movil", "escritorio"];
export const ORIGENES = ["manual", "link"];
export const ENTORNOS = ["prueba"];
/** Desde dónde una calificación cuenta como real. */
export const SITIOS_DE_PRODUCCION = ["liquidar.ar", "www.liquidar.ar"];

/** Dónde recuerda el navegador que ya calificó o que no quiso. */
export const CLAVE_LOCAL = "liquidar:calificacion";
/** Cuántos días no se vuelve a preguntar. */
export const DIAS_SIN_PREGUNTAR = { calificada: 120, descartada: 30 };
/** Cuánto se espera a Firestore antes de dar el envío por perdido. */
export const TOPE_ENVIO_MS = 15000;

const PROYECTO = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const DOCUMENTOS = `projects/${PROYECTO}/databases/(default)/documents`;
const URL_COMMIT = `https://firestore.googleapis.com/v1/${DOCUMENTOS}:commit`;

const MIN_MS = 60 * 1000;
const DIA_MS = 24 * 60 * MIN_MS;
/** La Argentina es UTC−3 todo el año (sin horario de verano desde 2009). */
const ARGENTINA_MS = -3 * 60 * MIN_MS;
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

/** "prueba" si la página no es la de producción (la PC, una preview); null si es liquidar.ar. */
export function entornoDe(hostname) {
  return SITIOS_DE_PRODUCCION.includes(String(hostname || "").toLowerCase()) ? null : "prueba";
}

/**
 * El contexto que se toma solo, ya validado: lo que no tenga la forma
 * esperada no se manda (las reglas lo rechazarían y se perdería la
 * calificación entera por un dato accesorio).
 */
export function contextoValido({ convenioId, periodo, categoria, dispositivo, origen, faltanDatos, calculos, entorno } = {}) {
  const ctx = {};
  if (typeof convenioId === "string" && /^[a-z0-9-]{1,60}$/.test(convenioId)) ctx.convenioId = convenioId;
  if (typeof periodo === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) ctx.periodo = periodo;
  const cat = String(categoria ?? "").trim();
  if (cat) ctx.categoria = cat.slice(0, MAX_CATEGORIA);
  if (DISPOSITIVOS.includes(dispositivo)) ctx.dispositivo = dispositivo;
  if (ORIGENES.includes(origen)) ctx.origen = origen;
  if (typeof faltanDatos === "boolean") ctx.faltanDatos = faltanDatos;
  const n = Number(calculos);
  if (Number.isInteger(n) && n >= 1) ctx.calculos = Math.min(n, 999);
  if (ENTORNOS.includes(entorno)) ctx.entorno = entorno;
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

/**
 * Manda una escritura a Firestore. Si no se guardó, lanza un Error con un
 * mensaje para la persona y, para quien llama, `status` (lo que respondió
 * Firestore) o `sinRespuesta` (no hubo respuesta: puede haberse guardado
 * igual). `keepalive` deja terminar el pedido aunque la persona cierre la
 * pestaña justo después de tocar una estrella.
 */
export async function enviarCalificacion(cuerpo, { fetchFn = fetch, topeMs = TOPE_ENVIO_MS } = {}) {
  let r;
  try {
    r = await fetchFn(URL_COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      keepalive: true,
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(topeMs) : undefined,
    });
  } catch {
    const e = new Error("No hay conexión. Probá de nuevo en un rato.");
    e.sinRespuesta = true;
    throw e;
  }
  if (!r.ok) {
    // El detalle queda en la consola; a la persona, algo que entienda.
    let detalle = "";
    try { detalle = JSON.stringify(await r.json()); } catch { /* sin cuerpo */ }
    console.error(`[calificaciones] Firestore respondió ${r.status}: ${detalle}`);
    const e = new Error("No pudimos guardar tu calificación. Probá de nuevo en un rato.");
    e.status = r.status;
    throw e;
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

/** ¿Todavía puede cambiar la calificación que creó? Con unos minutos de margen por los relojes. */
export function puedeCambiar(registro, ahora = new Date()) {
  if (!registro || registro.estado !== "calificada" || !registro.id) return false;
  const desde = Date.parse(registro.el);
  return Number.isFinite(desde) && ahora.getTime() - desde < (MINUTOS_PARA_CAMBIAR - 5) * MIN_MS;
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

/** La fecha y hora en la Argentina, "AAAA-MM-DD HH:MM" (para el CSV y el panel). */
export function fechaArgentina(d) {
  const f = aFecha(d);
  return f ? new Date(f.getTime() + ARGENTINA_MS).toISOString().slice(0, 16).replace("T", " ") : "";
}

/** El lunes de la semana de esa fecha, en la Argentina, "AAAA-MM-DD". */
export function lunesArgentino(d) {
  const local = new Date(aFecha(d).getTime() + ARGENTINA_MS);
  const dia = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  dia.setUTCDate(dia.getUTCDate() - ((dia.getUTCDay() + 6) % 7));
  return dia.toISOString().slice(0, 10);
}

const promedio = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Proporción de 4 y 5 estrellas: la "satisfacción", más robusta que el promedio. */
const satisfaccion = (xs) => (xs.length ? xs.filter((e) => e >= 4).length / xs.length : null);

/** ¿El campo tiene algo? Lo que no, va a "(sin dato)" o "(no contestó)" en los cortes del panel. */
const conDato = (v) => !(v === undefined || v === null || v === "");

/** Agrupa por un campo y resume cada grupo: cuántas, promedio y satisfacción. */
function porGrupo(validas, campo, sinDato = "(sin dato)") {
  const grupos = new Map();
  for (const c of validas) {
    const k = conDato(c[campo]) ? String(c[campo]) : sinDato;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(c.estrellas);
  }
  return [...grupos.entries()]
    .map(([clave, xs]) => ({ clave, total: xs.length, promedio: promedio(xs), satisfaccion: satisfaccion(xs) }))
    .sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave));
}

/** Con menos que esto, una diferencia entre grupos no dice nada. El panel lo marca. */
export const MINIMO_PARA_COMPARAR = 20;

/** ¿Es una calificación de prueba (la PC, una preview)? */
export const esPrueba = (c) => c?.entorno === "prueba";

/**
 * Cuántos siguen después de la estrella, para ver si la tarjeta lleva a
 * contestar lo opcional: una fila con el total y una por celular y por
 * computadora. Sale de lo que ya se guarda, sin campos nuevos (las reglas no
 * los aceptarían). `siguieron` son las que tienen `actualizadoEl`: después de
 * la estrella, la persona tocó algo más (otra estrella, un motivo, para qué la
 * usó) o apretó "Enviar". Es lo único que escribe esa hora, en la tarjeta de
 * antes y en la de ahora, así que se pueden comparar (la otra vez que se
 * escribe es muy rara: un reintento del alta que la encuentra ya creada). Los
 * motivos se cuentan sobre las bajas, que son las únicas que los ven.
 *
 * Las tablets no van aparte: dispositivoDe decide sólo por el ancho (768 px),
 * así que una tablet parada de 768 o más cuenta como computadora y una más
 * angosta como celular. Es lo que ve la persona: el sitio se arma igual que
 * en una computadora o un celular de ese ancho. Lo que no dice el dispositivo
 * cuenta sólo en el total.
 */
function seguimientoDe(validas) {
  const fila = (clave, xs) => {
    const bajas = xs.filter((c) => c.estrellas <= PREGUNTA_MOTIVO_HASTA);
    return {
      clave,
      total: xs.length,
      siguieron: xs.filter((c) => aFecha(c.actualizadoEl)).length,
      // Lo mismo que "Para qué la usan" sin la fila "(no contestó)".
      conPerfil: xs.filter((c) => conDato(c.perfil)).length,
      bajas: bajas.length,
      bajasConMotivo: bajas.filter((c) => motivosValidos(c.motivos).length > 0).length,
      conComentario: xs.filter((c) => limpiarComentario(c.comentario)).length,
    };
  };
  return [fila("total", validas), ...DISPOSITIVOS.map((d) => fila(d, validas.filter((c) => c.dispositivo === d)))];
}

/**
 * Lo que muestra la pestaña Calificaciones. Ignora lo que no tenga
 * estrellas válidas y, salvo `incluirPruebas`, las de prueba. `desde` (Date)
 * deja sólo las de esa fecha en adelante; `hasta` (Date, hoy) es hasta dónde
 * llega "semana a semana", que muestra también las semanas sin ninguna: una
 * semana en cero después de semanas con datos es la alarma de que la tarjeta
 * dejó de guardar. `seguimiento` dice cuántos siguen después de la estrella
 * (seguimientoDe), sobre las mismas calificaciones que el resto.
 */
export function resumenDeCalificaciones(lista = [], { desde = null, hasta = new Date(), incluirPruebas = false } = {}) {
  const validas = lista
    .map((c) => ({ ...c, estrellas: estrellasValidas(c.estrellas), fecha: aFecha(c.creadoEl) }))
    .filter((c) => c.estrellas && (incluirPruebas || !esPrueba(c)) && (!desde || (c.fecha && c.fecha >= desde)));
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

  // Semana a semana (de lunes a domingo, en hora argentina), sin saltear las
  // vacías. `siguieron` (como en seguimientoDe) deja comparar las semanas de
  // antes y de después de un cambio en la tarjeta.
  const semanas = new Map();
  for (const c of validas) {
    if (!c.fecha) continue;
    const k = lunesArgentino(c.fecha);
    if (!semanas.has(k)) semanas.set(k, []);
    semanas.get(k).push(c);
  }
  const porSemana = [];
  const fechas = validas.map((c) => c.fecha).filter(Boolean);
  if (fechas.length || desde) {
    const primera = lunesArgentino(desde || new Date(Math.min(...fechas.map((f) => f.getTime()))));
    const actual = lunesArgentino(hasta);
    for (let k = primera; k <= actual; ) {
      const cs = semanas.get(k) || [];
      const xs = cs.map((c) => c.estrellas);
      porSemana.push({
        clave: k,
        total: xs.length,
        promedio: promedio(xs),
        satisfaccion: satisfaccion(xs),
        siguieron: cs.filter((c) => aFecha(c.actualizadoEl)).length,
        enCurso: k === actual,
      });
      const sig = new Date(`${k}T00:00:00Z`);
      sig.setUTCDate(sig.getUTCDate() + 7);
      k = sig.toISOString().slice(0, 10);
    }
  }

  const conTexto = validas
    .filter((c) => limpiarComentario(c.comentario))
    .sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));

  return {
    total: validas.length,
    pruebas: lista.filter(esPrueba).length,
    promedio: promedio(estrellas),
    satisfaccion: satisfaccion(estrellas),
    porEstrellas,
    bajas: bajas.length,
    motivos,
    porConvenio: porGrupo(validas, "convenioId"),
    porPerfil: porGrupo(validas, "perfil", "(no contestó)"),
    porDispositivo: porGrupo(validas, "dispositivo"),
    porOrigen: porGrupo(validas, "origen"),
    porFaltanDatos: porGrupo(
      validas.map((c) => ({ ...c, datos: c.faltanDatos === true ? "faltaban" : c.faltanDatos === false ? "completos" : null })),
      "datos"
    ),
    porSemana,
    seguimiento: seguimientoDe(validas),
    comentarios: conTexto,
    calificaciones: [...validas].sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0)),
  };
}

/**
 * Las calificaciones como CSV para el Excel en castellano: separado por punto
 * y coma (con comas, el Excel con configuración argentina pone toda la fila en
 * una columna) y con las fechas en hora argentina: cuándo calificó y, si
 * después tocó algo más o apretó "Enviar", cuándo fue lo último ("actualizado",
 * vacío si no siguió). Un texto que empieza con =, +, -, @, tabulación o
 * retorno se escribe con un apóstrofo adelante: si no, Excel lo toma como
 * fórmula, y los comentarios los escribe cualquiera.
 */
export function calificacionesACsv(lista = []) {
  const celda = (v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const columnas = ["fecha", "actualizado", "estrellas", "motivos", "perfil", "comentario", "convenio", "periodo", "categoria", "dispositivo", "origen", "faltan_datos", "calculos", "entorno", "id"];
  const filas = [columnas];
  for (const c of lista) {
    filas.push([
      fechaArgentina(c.creadoEl),
      fechaArgentina(c.actualizadoEl),
      c.estrellas ?? "",
      Array.isArray(c.motivos) ? c.motivos.join(" ") : "",
      c.perfil ?? "",
      c.comentario ?? "",
      c.convenioId ?? "",
      c.periodo ?? "",
      c.categoria ?? "",
      c.dispositivo ?? "",
      c.origen ?? "",
      c.faltanDatos === undefined ? "" : c.faltanDatos ? "si" : "no",
      c.calculos ?? "",
      c.entorno ?? "",
      c.id ?? "",
    ]);
  }
  return filas.map((fila) => fila.map(celda).join(";")).join("\r\n");
}
