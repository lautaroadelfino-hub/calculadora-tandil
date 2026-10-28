// lib/periodos.js
// Qué período de una tabla se usa para liquidar un mes.
//
// Las tablas que cambian por período (Ganancias, contribuciones patronales,
// bases del art. 9) no siempre están cargadas para el mes que se liquida. La
// regla es una sola y tiene que estar escrita una sola vez:
//
//   1. Si el período pedido está cargado, se usa ése.
//   2. Si no, se usa el más reciente ANTERIOR a él, y se avisa.
//   3. Si no hay ninguno anterior, ninguno. Nunca uno posterior: una tabla de
//      diciembre no sirve para liquidar julio, aunque sea la única cargada.
//
// Antes esta regla vivía en veinte líneas adentro de la pantalla del recibo,
// sólo para Ganancias, y en otras diez adentro de parametrosLaborales.js para
// las bases del art. 9. Dos copias de la misma regla es una copia de más.
//
// Y una segunda regla, también una sola vez (periodoPorDefecto): con qué mes
// ARRANCA la calculadora. Es el más nuevo que no sea posterior al mes en
// curso. Un acuerdo puede fijar meses que todavía no empezaron y el dueño los
// publica por adelantado; esos meses quedan en el desplegable, pero la
// página, la pregunta frecuente y los datos para Google hablan del mes que
// la gente vive.

/** El formato que tiene que tener el id de un período: "2026-07", nunca "2026-7". */
export const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

export const esPeriodoValido = (p) => FORMATO_PERIODO.test(String(p || ""));

/**
 * Elige el período a usar.
 *
 * @param {string[]} disponibles  ids de los períodos cargados, en cualquier orden.
 * @param {string} pedido         el período que se quiere liquidar, "AAAA-MM".
 * @returns {{ periodo: string|null, exacto: boolean, ignorados: string[] }}
 *   `periodo` es el que hay que usar (o null si no hay ninguno que sirva);
 *   `exacto` dice si es el pedido o uno anterior;
 *   `ignorados` son ids que no tienen formato de período y por eso no se
 *   consideraron. Se devuelven en vez de tragarse, para que quien llama pueda
 *   avisar: un "2026-8" cargado a mano es un dato que no se está usando.
 */
export function elegirPeriodo(disponibles, pedido) {
  const ids = [...new Set((disponibles || []).map((p) => String(p)))];
  const ignorados = ids.filter((p) => !esPeriodoValido(p));
  const validos = ids.filter(esPeriodoValido).sort();

  if (!esPeriodoValido(pedido)) return { periodo: null, exacto: false, ignorados };
  if (validos.includes(pedido)) return { periodo: pedido, exacto: true, ignorados };

  const anteriores = validos.filter((p) => p < pedido);
  const elegido = anteriores.length ? anteriores[anteriores.length - 1] : null;
  return { periodo: elegido, exacto: false, ignorados };
}

/**
 * De una tabla por período (Ganancias, contribuciones), qué período usar para
 * un mes: el exacto si está cargado, y si no el más reciente anterior. Es
 * `elegirPeriodo` sin la lista de ignorados, con la forma que espera la
 * pantalla: { periodo, exacto }.
 */
export function periodoDeTabla(disponibles, pedido) {
  const e = elegirPeriodo(disponibles, pedido);
  return { periodo: e.periodo, exacto: e.exacto };
}

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-07" -> "julio de 2026". Lo que no se entiende se devuelve como vino. */
export function nombreDePeriodo(periodo) {
  if (!periodo) return "otro período";
  const [anio, mes] = String(periodo).split("-");
  const nombre = MESES[Number(mes) - 1];
  return nombre && esPeriodoValido(periodo) ? `${nombre} de ${anio}` : String(periodo);
}

/**
 * "2026-07" -> "Julio 2026": el nombre con el que producción guarda
 * `mes_vigencia` y `vigencia` ("Septiembre 2026"). Lo que no se entiende se
 * devuelve como vino.
 */
export function tituloDePeriodo(periodo) {
  const [anio, mes] = String(periodo || "").split("-");
  const nombre = MESES[Number(mes) - 1];
  if (!nombre || !esPeriodoValido(periodo)) return String(periodo || "");
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${anio}`;
}

const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Los nombres como aparecen en el Boletín Oficial y en las circulares, con
// las abreviaturas y variantes que se vieron ("SEPT.", "setiembre", "DIC.").
const ALIAS_DE_MES = { set: 9, sept: 9, setiembre: 9 };

/**
 * De un nombre de mes (entero, abreviado, con o sin acento) y un año, el
 * período "AAAA-MM"; null si el mes no se reconoce.
 */
export function periodoDeMes(nombreMes, anio) {
  const limpio = sinAcentos(nombreMes).replace(/[^a-z]/g, "");
  if (!limpio || !/^\d{4}$/.test(String(anio))) return null;
  let indice = ALIAS_DE_MES[limpio] || null;
  if (!indice) {
    const i = MESES.findIndex((m) => sinAcentos(m) === limpio || (limpio.length >= 3 && sinAcentos(m).startsWith(limpio)));
    if (i >= 0) indice = i + 1;
  }
  return indice ? `${anio}-${String(indice).padStart(2, "0")}` : null;
}

/** El período siguiente: "2026-12" -> "2027-01". */
export function mesSiguiente(periodo) {
  if (!esPeriodoValido(periodo)) return null;
  const [anio, mes] = periodo.split("-").map(Number);
  return mes === 12 ? `${anio + 1}-01` : `${anio}-${String(mes + 1).padStart(2, "0")}`;
}

/**
 * La fecha de hoy en la Argentina (UTC−3, sin horario de verano), "AAAA-MM-DD".
 * Se recibe la fecha para poder probarlo.
 */
export function hoyArgentina(fecha = new Date()) {
  return new Date(fecha.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** El período en curso en la Argentina, "AAAA-MM". */
export function periodoActual(fecha = new Date()) {
  return hoyArgentina(fecha).slice(0, 7);
}

/**
 * El período con el que arranca la calculadora: el más nuevo de los cargados
 * que no sea posterior al mes en curso. Si todos son futuros (un convenio
 * nuevo cargado desde el mes que viene), el más cercano a hoy. `hoy` se
 * recibe ("AAAA-MM" o "AAAA-MM-DD") para poder probarlo; sin él, el mes en
 * curso en la Argentina.
 *
 * @returns {string|null} null si no hay ningún período con formato válido.
 */
export function periodoPorDefecto(disponibles, hoy = periodoActual()) {
  const validos = [...new Set((disponibles || []).map((p) => String(p)))].filter(esPeriodoValido).sort();
  if (!validos.length) return null;
  const mes = String(hoy || "").slice(0, 7);
  if (!esPeriodoValido(mes)) return validos[validos.length - 1];
  const vigentes = validos.filter((p) => p <= mes);
  return vigentes.length ? vigentes[vigentes.length - 1] : validos[0];
}
