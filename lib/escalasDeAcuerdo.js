// lib/escalasDeAcuerdo.js
// Qué escalas muestra la página de cada acuerdo, y con qué forma.
//
// POR QUÉ EXISTE: la página de un acuerdo traía el título, la fecha y el botón
// para bajar el PDF, y ningún número. Quien buscaba "escala salarial
// camioneros noviembre 2026" llegaba y tenía que abrir el documento; Google
// tampoco encontraba nada que leer y dejó 19 de esas páginas sin indexar
// (revisión de Search Console del 27/11/2026). Los básicos ya están en la
// base, porque la calculadora liquida con ellos. Acá se decide en la página de
// qué acuerdo va la escala de cada mes y se la ordena para mostrarla.
//
// La base guarda UNA escala por mes, la que rige hoy. Un acuerdo, en cambio,
// es un documento con fecha. Las dos cosas coinciden sólo cuando ese documento
// es el último que fijó ese mes. Por eso:
//   - cada mes va en UNA sola página (paginaDeCadaPeriodo), y
//   - la página dice que los importes son los que usa la calculadora.
//
// Todo sale de los datos cargados, como en lib/textoConvenio.js: si falta el
// dato, la frase o la tabla se omite. Es puro (sin Firestore), para que corra
// en el servidor y en los tests.

import { leerClave } from "./escalaCsv.js";
import { esPeriodoValido, mesAnterior, mesSiguiente, nombreDePeriodo, periodoDeMes, tituloDePeriodo } from "./periodos.js";

/** Una vigencia de más meses que estos es un error de tipeo, no un acuerdo. */
export const TOPE_DE_MESES = 24;
/** Cuántos meses entran en la tabla de una página (los más nuevos). */
export const TOPE_DE_COLUMNAS = 12;
/** Los documentos que fijan importes. Una homologación aprueba los de otro. */
const TIPOS_CON_ESCALA = ["escala", "acuerdo"];

const numeroDeMes = (palabra) => {
  const periodo = periodoDeMes(palabra, "2000");
  return periodo ? Number(periodo.slice(5)) : null;
};
const aPeriodo = (anio, mes) => `${anio}-${String(mes).padStart(2, "0")}`;

/**
 * De la vigencia como la escribe el dueño en /admin a la lista de meses:
 *   "noviembre 2026"                      -> ["2026-11"]
 *   "abril a julio 2026"                  -> ["2026-04", …, "2026-07"]
 *   "octubre 2026 a mayo 2027"            -> ["2026-10", …, "2027-05"]
 *   "octubre, noviembre y diciembre 2026" -> ["2026-10", "2026-11", "2026-12"]
 * Se leen los meses nombrados y el año que acompaña a cada uno; al que no lo
 * trae se le pone el del mes que sigue ("diciembre a abril 2026" empieza en
 * diciembre de 2025). El resultado va del primer mes nombrado al último. Lo
 * que no se entiende devuelve una lista vacía: sin meses no hay tabla, que es
 * mejor que una tabla del mes equivocado.
 */
export function periodosDeVigencia(vigencia) {
  const palabras = String(vigencia || "").match(/\d+|[^\d\s.,;:()/\-–—]+/g) || [];
  const meses = [];
  for (const palabra of palabras) {
    if (/^\d+$/.test(palabra)) {
      // Un año va con el último mes nombrado que todavía no tiene el suyo
      // ("septiembre de 2026"). Los demás números son días: se saltean.
      const ultimo = meses[meses.length - 1];
      if (/^(19|20)\d{2}$/.test(palabra) && ultimo && ultimo.anio === null) ultimo.anio = Number(palabra);
      continue;
    }
    const mes = numeroDeMes(palabra);
    if (mes) meses.push({ mes, anio: null });
  }
  if (!meses.length || meses.every((m) => m.anio === null)) return [];

  for (let i = meses.length - 2; i >= 0; i--) {
    const sigue = meses[i + 1];
    if (meses[i].anio === null && sigue.anio !== null) meses[i].anio = sigue.anio - (meses[i].mes > sigue.mes ? 1 : 0);
  }
  for (let i = 1; i < meses.length; i++) {
    const antes = meses[i - 1];
    if (meses[i].anio === null) meses[i].anio = antes.anio + (meses[i].mes < antes.mes ? 1 : 0);
  }

  const desde = aPeriodo(meses[0].anio, meses[0].mes);
  const hasta = aPeriodo(meses[meses.length - 1].anio, meses[meses.length - 1].mes);
  if (desde > hasta) return [];
  const lista = [];
  for (let p = desde; p && p <= hasta; p = mesSiguiente(p)) {
    lista.push(p);
    if (lista.length > TOPE_DE_MESES) return [];
  }
  return lista;
}

/**
 * Los meses que cubre un acuerdo: los de su vigencia. Una escala sin vigencia
 * legible cubre el mes de su fecha (las de Camioneros llevan fecha del día 1).
 * Las homologaciones y los "otros" no cubren ninguno.
 */
export function periodosDeAcuerdo(acuerdo) {
  if (!acuerdo || !TIPOS_CON_ESCALA.includes(acuerdo.tipo)) return [];
  const deVigencia = periodosDeVigencia(acuerdo.vigencia);
  if (deVigencia.length) return deVigencia;
  const mes = String(acuerdo.fecha || "").slice(0, 7);
  return acuerdo.tipo === "escala" && esPeriodoValido(mes) ? [mes] : [];
}

/**
 * En la página de qué acuerdo va la escala de cada mes: { "2026-11": acuerdo }.
 * Recibe los acuerdos publicados de UN convenio.
 *
 * Cuando varios documentos cubren el mismo mes, gana:
 *   1. El que EMPIEZA más tarde. Comercio firmó el 22/7/2026 un acuerdo para
 *      julio a septiembre; la circular anterior, "abril a julio 2026", también
 *      nombra julio, pero los importes de julio que quedaron en la base son
 *      los del acuerdo nuevo. Una revisión siempre empieza después que lo que
 *      revisa.
 *   2. Si empiezan el mismo mes, la escala antes que el acuerdo: son la misma
 *      ronda (el acuerdo del 27/10 y "Escalas salariales octubre 2026 a mayo
 *      2027") y la planilla es el documento de los importes.
 *   3. Después, el de fecha más nueva, y el id para que sea determinista.
 * No se compara por fecha antes que por comienzo porque las escalas llevan la
 * fecha del primer día de su vigencia y los acuerdos la de la firma.
 */
export function paginaDeCadaPeriodo(acuerdos) {
  const leGana = (x, y) => {
    if (x.periodos[0] !== y.periodos[0]) return x.periodos[0] > y.periodos[0];
    if (x.acuerdo.tipo !== y.acuerdo.tipo) return x.acuerdo.tipo === "escala";
    const [fx, fy] = [String(x.acuerdo.fecha || ""), String(y.acuerdo.fecha || "")];
    if (fx !== fy) return fx > fy;
    return String(x.acuerdo.id || "") < String(y.acuerdo.id || "");
  };
  const elegido = {};
  for (const acuerdo of acuerdos || []) {
    const candidato = { acuerdo, periodos: periodosDeAcuerdo(acuerdo) };
    for (const p of candidato.periodos) {
      if (!elegido[p] || leGana(candidato, elegido[p])) elegido[p] = candidato;
    }
  }
  return Object.fromEntries(Object.entries(elegido).map(([p, c]) => [p, c.acuerdo]));
}

/**
 * Qué muestra la página de un acuerdo.
 * @param acuerdo          el de la página
 * @param delConvenio      los acuerdos publicados de su convenio
 * @param periodosCargados los meses con escala en la base
 * @returns {{ periodos: string[], enOtraPagina: { acuerdo: object, periodos: string[] }[] }}
 *   `periodos`: los meses cuya escala va en ESTA página, en orden;
 *   `enOtraPagina`: los demás meses de su vigencia que tienen escala, con el
 *   acuerdo que la muestra (el acuerdo de Camioneros del 18/9 lleva a la
 *   escala de cada mes).
 */
export function escalasDeLaPagina(acuerdo, delConvenio, periodosCargados) {
  const cargados = new Set((periodosCargados || []).filter(esPeriodoValido));
  const pagina = paginaDeCadaPeriodo(delConvenio);
  const periodos = [];
  const enOtraPagina = [];
  for (const p of periodosDeAcuerdo(acuerdo)) {
    const duenio = pagina[p];
    if (!cargados.has(p) || !duenio) continue;
    if (duenio.id === acuerdo.id) {
      periodos.push(p);
      continue;
    }
    const ya = enOtraPagina.find((o) => o.acuerdo.id === duenio.id);
    if (ya) ya.periodos.push(p);
    else enOtraPagina.push({ acuerdo: duenio, periodos: [p] });
  }
  return { periodos: periodos.slice(-TOPE_DE_COLUMNAS), enOtraPagina };
}

/**
 * Los meses que hay que leer de la base para armar la página: los que se
 * muestran y, de cada uno, el anterior si está cargado (para decir cuánto
 * cambió). Sin repetidos.
 */
export function periodosALeer(periodos, periodosCargados) {
  const cargados = new Set(periodosCargados || []);
  const lista = [];
  for (const p of periodos || []) {
    const anterior = mesAnterior(p);
    if (anterior && cargados.has(anterior) && !lista.includes(anterior)) lista.push(anterior);
    if (!lista.includes(p)) lista.push(p);
  }
  return lista;
}

// ---------------------------------------------------------------------------
// La tabla
// ---------------------------------------------------------------------------

const ORDEN = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const numero = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Una fila de la escala (un número suelto en las cargas viejas, un objeto en las demás) a sus tres importes. */
function importesDe(fila) {
  if (typeof fila === "number") return { basico: fila, noRemunerativo: 0, sinIncidencia: 0 };
  if (!fila || typeof fila !== "object") return null;
  return {
    basico: numero(fila.basico),
    noRemunerativo: numero(fila.no_remunerativo),
    sinIncidencia: numero(fila.no_remunerativo_sin_incidencia),
  };
}

const categoriasDe = (escala) => (escala && escala.categorias) || {};
const tieneCentavos = (n) => Math.abs(n - Math.round(n)) > 0.004;

/** El importe que comparten todas las categorías de un mes, o null si cambia de una a otra. */
function importeComun(escala, campo) {
  const valores = Object.values(categoriasDe(escala)).map(importesDe).filter(Boolean).map((i) => i[campo]);
  if (!valores.length) return 0;
  return valores.every((v) => v === valores[0]) ? valores[0] : null;
}

/**
 * La tabla de básicos: una fila por categoría y una columna por mes. Las
 * categorías van en orden alfabético con los números en su orden ("más de 20"
 * antes que "más de 110"), agrupadas por zona si el convenio las tiene
 * (Gastronómicos: "Escala A", "Escala B"). Una categoría que no está en un mes
 * lleva null en esa columna.
 *
 * @param escalas  { "2026-10": documento de la escala }
 * @param periodos los meses a mostrar, en orden
 */
export function tablaDeEscalas(escalas, periodos) {
  const meses = (periodos || []).filter((p) => escalas && escalas[p]);
  const claves = [...new Set(meses.flatMap((p) => Object.keys(categoriasDe(escalas[p]))))];
  const porZona = new Map();
  for (const clave of claves) {
    const { zona, categoria } = leerClave(clave);
    const importes = meses.map((p) => importesDe(categoriasDe(escalas[p])[clave]));
    const fila = {
      categoria,
      basico: importes.map((i) => (i ? i.basico : null)),
      noRemunerativo: importes.map((i) => (i ? i.noRemunerativo : null)),
    };
    if (!porZona.has(zona || "")) porZona.set(zona || "", []);
    porZona.get(zona || "").push(fila);
  }
  const grupos = [...porZona.entries()]
    .sort(([a], [b]) => ORDEN.compare(a, b))
    .map(([zona, filas]) => ({ zona: zona || null, filas: filas.sort((a, b) => ORDEN.compare(a.categoria, b.categoria)) }));

  const sumas = meses.map((p) => ({
    noRemunerativo: importeComun(escalas[p], "noRemunerativo"),
    sinIncidencia: importeComun(escalas[p], "sinIncidencia"),
    nombreSinIncidencia: String(escalas[p].nombre_sin_incidencia || "").trim() || null,
  }));
  const todos = grupos.flatMap((g) => g.filas);
  return {
    periodos: meses.map((p) => ({ id: p, nombre: String(escalas[p].mes_vigencia || "").trim() || tituloDePeriodo(p) })),
    grupos,
    categorias: todos.length,
    // Camioneros publica con centavos; Comercio y Gastronómicos, en pesos enteros.
    decimales: todos.some((f) => [...f.basico, ...f.noRemunerativo].some((v) => v !== null && tieneCentavos(v))) ? 2 : 0,
    sumas,
    // Si en algún mes la suma no remunerativa cambia según la categoría, hace falta su propia tabla.
    noRemunerativoPorCategoria: sumas.some((s) => s.noRemunerativo === null),
  };
}

/**
 * Cuánto cambian los básicos de un mes respecto de otro, en porcentaje:
 * { min, max } entre las categorías que están en los dos. Null si no hay
 * ninguna para comparar.
 */
export function variacionDeBasicos(escala, anterior) {
  const antes = categoriasDe(anterior);
  const cambios = [];
  for (const [clave, fila] of Object.entries(categoriasDe(escala))) {
    const a = importesDe(antes[clave]);
    const b = importesDe(fila);
    if (!a || !b || !(a.basico > 0) || !(b.basico > 0)) continue;
    cambios.push((b.basico / a.basico - 1) * 100);
  }
  if (!cambios.length) return null;
  const redondear = (x) => Math.round(x * 100) / 100;
  return { min: redondear(Math.min(...cambios)), max: redondear(Math.max(...cambios)) };
}

// El espacio entre el signo y el número (y entre el número y el %) es uno que
// no se corta: en el celular "$" quedaba al final de un renglón y el importe
// en el siguiente. Intl pone a veces uno fino (U+202F); se unifica.
const pesos = (n, decimales = Number.isInteger(n) ? 0 : 2) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    .format(n)
    .replace(/[\s\u00a0\u202f]/g, "\u00a0");
const porciento = (x) => `${Math.abs(x).toLocaleString("es-AR", { maximumFractionDigits: 2 })}\u00a0%`;

/**
 * Lo que cambia en un mes, en frases, para leer arriba de la tabla:
 *   "Los básicos suben 1,7 % respecto de octubre de 2026."
 *   "Suma no remunerativa: $ 120.000 en todas las categorías."
 * `anterior` es la escala del mes anterior, si está cargada.
 */
export function frasesDelMes({ periodo, escala, anterior = null }) {
  const frases = [];
  const previo = nombreDePeriodo(mesAnterior(periodo));
  const cambio = anterior ? variacionDeBasicos(escala, anterior) : null;
  if (cambio) {
    if (cambio.min === 0 && cambio.max === 0) frases.push(`Los básicos son los mismos que en ${previo}.`);
    else if (cambio.min === cambio.max) frases.push(`Los básicos ${cambio.min > 0 ? "suben" : "bajan"} ${porciento(cambio.min)} respecto de ${previo}.`);
    else if (cambio.min >= 0) frases.push(`Los básicos suben entre ${porciento(cambio.min)} y ${porciento(cambio.max)} respecto de ${previo}.`);
    else if (cambio.max <= 0) frases.push(`Los básicos bajan entre ${porciento(cambio.max)} y ${porciento(cambio.min)} respecto de ${previo}.`);
    // Si unos suben y otros bajan no hay una frase honesta: se mira la tabla.
  }

  const noRem = importeComun(escala, "noRemunerativo");
  const noRemAntes = anterior ? importeComun(anterior, "noRemunerativo") : 0;
  if (noRem === null) frases.push("La suma no remunerativa cambia según la categoría.");
  else if (noRem > 0 && anterior && noRemAntes !== null && noRemAntes > 0 && noRemAntes !== noRem) {
    frases.push(`Suma no remunerativa: ${pesos(noRem)} en todas las categorías (en ${previo}, ${pesos(noRemAntes)}).`);
  } else if (noRem > 0) frases.push(`Suma no remunerativa: ${pesos(noRem)} en todas las categorías.`);
  else if (anterior && noRemAntes !== 0) frases.push(`No hay suma no remunerativa, a diferencia de ${previo}.`);

  const extra = importeComun(escala, "sinIncidencia");
  const nombreExtra = String((escala && escala.nombre_sin_incidencia) || "").trim() || "Suma extraordinaria no remunerativa";
  if (extra === null) frases.push(`${nombreExtra}: cambia según la categoría.`);
  else if (extra > 0) frases.push(`${nombreExtra}: ${pesos(extra)} en todas las categorías.`);
  return frases;
}

const UNIDAD = { dia: "por día", km: "por km", viaje: "por viaje", mes: "por mes" };

/**
 * Los valores del mes que tienen nombre en las reglas del convenio (en
 * Camioneros: comida, pernoctada, viático por km): una fila por valor y una
 * columna por mes. Los que la base guarda con su clave pero ninguna regla
 * nombra no se muestran: una clave interna no le dice nada a nadie.
 */
export function valoresDelMes(convenio, escalas, periodos) {
  const reglas = (convenio && convenio.reglas_calculo && convenio.reglas_calculo.adicionales_por_unidad) || {};
  const meses = (periodos || []).filter((p) => escalas && escalas[p]);
  const vistos = new Set();
  const filas = [];
  for (const regla of Object.values(reglas)) {
    const clave = regla && regla.valor;
    const nombre = String((regla && regla.label) || "").trim();
    if (!clave || !nombre || vistos.has(clave)) continue;
    const valores = meses.map((p) => {
      const v = (escalas[p].valores_del_periodo || {})[clave];
      return Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : null;
    });
    if (valores.every((v) => v === null)) continue;
    vistos.add(clave);
    filas.push({ clave, nombre, unidad: UNIDAD[regla.unidad] || "", valores });
  }
  return filas.sort((a, b) => ORDEN.compare(a.nombre, b.nombre));
}

/**
 * Todo lo que la página de un acuerdo muestra de sus escalas, ya armado:
 * el nombre de los meses, la tabla de básicos, las frases de cada mes y los
 * valores del mes con nombre. Null si no hay ninguna escala para mostrar.
 *
 * @param convenio el documento del convenio (por las reglas que nombran los valores del mes)
 * @param periodos los meses de la página, en orden (escalasDeLaPagina)
 * @param escalas  { "2026-10": documento }: los de la página y, si están, el anterior de cada uno
 * @param hoy      el mes en curso, "AAAA-MM": se marca en la tabla
 */
export function vistaDeEscalas({ convenio, periodos, escalas, hoy = null }) {
  const meses = (periodos || []).filter((p) => escalas && escalas[p]);
  if (!meses.length) return null;
  const tabla = tablaDeEscalas(escalas, meses);
  if (!tabla.categorias) return null;
  return {
    meses: nombreDeLosMeses(meses),
    tabla,
    resumen: meses.map((p, i) => ({
      periodo: p,
      nombre: tabla.periodos[i].nombre,
      frases: frasesDelMes({ periodo: p, escala: escalas[p], anterior: escalas[mesAnterior(p)] || null }),
    })),
    valores: valoresDelMes(convenio, escalas, meses),
    periodoEnCurso: hoy && meses.includes(hoy) ? hoy : null,
  };
}

/** "noviembre de 2026", "octubre a diciembre de 2026", "octubre de 2026 a mayo de 2027". */
export function nombreDeLosMeses(periodos) {
  const lista = (periodos || []).filter(esPeriodoValido);
  if (!lista.length) return "";
  if (lista.length === 1) return nombreDePeriodo(lista[0]);
  const seguidos = lista.every((p, i) => i === 0 || mesAnterior(p) === lista[i - 1]);
  if (!seguidos) return lista.map(nombreDePeriodo).join(", ");
  const [primero, ultimo] = [lista[0], lista[lista.length - 1]];
  const mismoAnio = primero.slice(0, 4) === ultimo.slice(0, 4);
  return mismoAnio
    ? `${nombreDePeriodo(primero).split(" de ")[0]} a ${nombreDePeriodo(ultimo)}`
    : `${nombreDePeriodo(primero)} a ${nombreDePeriodo(ultimo)}`;
}
