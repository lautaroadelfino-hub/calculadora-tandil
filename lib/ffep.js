// lib/ffep.js
// El FFEP (Fondo Fiduciario de Enfermedades Profesionales) es una suma fija
// mensual por trabajador, a cargo del empleador, que la SRT actualiza todos
// los meses. La tabla de contribuciones de cada período la lleva como suma
// fija universal; este módulo sabe cuál corresponde a cada mes, para que al
// cargar los valores oficiales de un período en /admin no quede el de otro
// mes (pasó: la tabla de septiembre 2026 tenía el FFEP de febrero).
//
// Los valores están en data/ffep.json, con su fuente.

import historico from "@/data/ffep.json";

const ES_PERIODO = /^\d{4}-\d{2}$/;

/**
 * El FFEP que rige para un período (AAAA-MM): la fila con el `desde` más
 * alto que no supere al mes pedido. Devuelve null si el período es inválido o
 * anterior al primer valor conocido.
 */
export function ffepDelPeriodo(periodo, tabla = historico) {
  if (!ES_PERIODO.test(String(periodo || ""))) return null;
  const vigente = (tabla.valores || [])
    .filter((v) => ES_PERIODO.test(v.desde) && v.desde <= periodo)
    .sort((a, b) => a.desde.localeCompare(b.desde))
    .pop();
  return vigente ? vigente.monto : null;
}

/** El último período para el que hay FFEP conocido (AAAA-MM). */
export function ultimoPeriodoConFfep(tabla = historico) {
  return (tabla.valores || []).map((v) => v.desde).sort().pop() || null;
}

/**
 * Una copia de la tabla de contribuciones con el FFEP del período pedido en
 * la suma fija universal `ffep`. Si el período no tiene valor conocido, la
 * tabla vuelve tal cual: no se inventa.
 */
export function conFfepDelPeriodo(tabla, periodo) {
  const monto = ffepDelPeriodo(periodo);
  if (monto == null || !tabla || !Array.isArray(tabla.universales)) return tabla;
  return {
    ...tabla,
    universales: tabla.universales.map((u) => (u.id === "ffep" ? { ...u, monto } : u)),
  };
}
