// lib/vigia/contribuciones.js
// La tabla de contribuciones de un mes nuevo, a partir de la última cargada.
//
// Lo único que cambia todos los meses son las bases del art. 9 y el FFEP; las
// alícuotas, la detracción y el SCVO casi nunca. Así que el mes nuevo es una
// copia del anterior con esas dos cosas cambiadas y el nombre del mes. Es la
// misma función para el botón "Copiar del mes anterior" de /admin y para el
// preparador del vigía: un solo lugar donde se arma el documento.
//
// Puro. La forma del documento es la de data/contribuciones.seed.json, y se
// comprueba con las mismas validaciones del formulario (lib/contribucionesForm.js).

import { tituloDePeriodo } from "../periodos.js";
import { tablaToForm, validarFormContribuciones } from "../contribucionesForm.js";

const copia = (o) => JSON.parse(JSON.stringify(o));
const dos = (n) => Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** El FFEP que trae una tabla (suma fija universal con id "ffep"), o null. */
export function ffepDe(tabla) {
  const u = ((tabla && tabla.universales) || []).find((x) => x && x.id === "ffep");
  return u && Number.isFinite(Number(u.monto)) ? Number(u.monto) : null;
}

/** Una copia de la tabla con otro FFEP. Si la tabla no lo tenía, se agrega. */
export function conFfep(tabla, monto) {
  const t = copia(tabla);
  t.universales = Array.isArray(t.universales) ? t.universales : [];
  const u = t.universales.find((x) => x && x.id === "ffep");
  if (u) u.monto = monto;
  else t.universales.unshift({ id: "ffep", label: "FFEP (Fondo Fiduciario de Enfermedades Profesionales)", unidad: "suma_fija", monto, rubro: "art" });
  return t;
}

/**
 * La tabla del período `periodo` a partir de `ultimaTabla`: todo igual salvo
 * la vigencia (el nombre del mes), las bases del art. 9 y el FFEP que se pasen.
 * Las claves que empiezan con "_" (notas de la semilla) no viajan.
 */
export function armarTablaDelMes(ultimaTabla, { periodo, bases = null, ffep = null }) {
  if (!ultimaTabla || typeof ultimaTabla !== "object") throw new Error("Falta la tabla de la que copiar.");
  let t = copia(ultimaTabla);
  for (const k of Object.keys(t)) if (k.startsWith("_")) delete t[k];
  t.vigencia = tituloDePeriodo(periodo);
  if (bases) {
    const minima = Number(bases.minima);
    const maxima = Number(bases.maxima);
    if (!Number.isFinite(minima) || !Number.isFinite(maxima) || maxima <= minima) throw new Error("Las bases del art. 9 no cierran: la máxima tiene que ser mayor que la mínima.");
    t.bases_art9 = { minima, maxima };
  }
  if (ffep != null) {
    if (!Number.isFinite(Number(ffep)) || Number(ffep) <= 0) throw new Error("El FFEP tiene que ser un importe mayor que cero.");
    t = conFfep(t, Number(ffep));
  }
  return t;
}

/** Lo que hace el botón del panel: el mes anterior tal cual, con el nombre del mes nuevo. */
export function copiarDelMesAnterior(tabla, periodo) {
  return armarTablaDelMes(tabla, { periodo });
}

/** Los errores que el formulario de /admin le encontraría a esta tabla; vacío si está bien. */
export function erroresDeTabla(tabla) {
  return validarFormContribuciones(tablaToForm(tabla)).map((e) => e.mensaje);
}

/**
 * En qué difiere una tabla propuesta de la publicada, en las dos cosas que
 * cambian por mes. Vacío si coinciden.
 */
export function diferenciasConPublicada(propuesta, publicada) {
  const difs = [];
  const b1 = (propuesta && propuesta.bases_art9) || {};
  const b2 = (publicada && publicada.bases_art9) || {};
  if (Number(b1.minima) !== Number(b2.minima) || Number(b1.maxima) !== Number(b2.maxima)) {
    difs.push(`bases del art. 9: publicada $${dos(b2.minima)} / $${dos(b2.maxima)}, el Boletín dice $${dos(b1.minima)} / $${dos(b1.maxima)}`);
  }
  const f1 = ffepDe(propuesta);
  const f2 = ffepDe(publicada);
  if (f1 != null && f1 !== f2) difs.push(`FFEP: publicado $${dos(f2)}, el Boletín dice $${dos(f1)}`);
  return difs;
}

const origenDe = (parte, falta, plural) => {
  if (parte.origen === "boletin") return parte.norma || "Boletín Oficial";
  if (parte.origen === "publicada") return "lo publicado";
  return `arrastrad${plural ? "as" : "o"} de ${parte.de ? tituloDePeriodo(parte.de) : "la tabla anterior"}, falta ${falta}`;
};

/** "bases $X / $Y (Resolución ANSES 290/2026)" o "sin bases". */
export function lineaDeBases(parte) {
  if (!parte || !parte.valor) return "sin bases";
  return `bases $${dos(parte.valor.minima)} / $${dos(parte.valor.maxima)} (${origenDe(parte, "la Resolución ANSES", true)})`;
}

/** "FFEP $1.935,00 (arrastrado de Septiembre 2026, falta la Disposición SRT)" o "sin FFEP". */
export function lineaDeFfep(parte) {
  if (!parte || parte.valor == null) return "sin FFEP";
  return `FFEP $${dos(parte.valor)} (${origenDe(parte, "la Disposición SRT", false)})`;
}

/** Las dos partes del borrador, de dónde salió cada una. */
export function lineasDePartes(partes) {
  const p = partes || {};
  return [lineaDeBases(p.bases_art9), lineaDeFfep(p.ffep)];
}

/** El resumen del borrador: qué trae de dónde. */
export function resumenContribuciones({ periodo, partes = {} }) {
  return `${tituloDePeriodo(periodo)}: ${lineasDePartes(partes).join(" · ")}`;
}

/**
 * Lo que el confirm de /admin dice antes de guardar: de dónde sale cada parte
 * de la tabla que se va a publicar. Si el dueño editó a mano un valor que
 * venía del borrador, lo dice en vez de citar una norma que ya no coincide.
 */
export function lineasParaConfirmar({ datos, partes = null }) {
  const b = (datos && datos.bases_art9) || {};
  const f = ffepDe(datos);
  const pb = partes && partes.bases_art9;
  const pf = partes && partes.ffep;
  const basesIguales = Boolean(pb && pb.valor) && Number(pb.valor.minima) === Number(b.minima) && Number(pb.valor.maxima) === Number(b.maxima);
  const ffepIgual = Boolean(pf) && pf.valor != null && Number(pf.valor) === f;
  return [
    basesIguales ? lineaDeBases(pb) : `bases $${dos(b.minima)} / $${dos(b.maxima)}${pb ? " (editadas a mano)" : ""}`,
    f == null ? "sin FFEP" : ffepIgual ? lineaDeFfep(pf) : `FFEP $${dos(f)}${pf ? " (editado a mano)" : ""}`,
  ];
}
