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
