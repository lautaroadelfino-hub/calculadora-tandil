// lib/fechas.js
// Las fechas "AAAA-MM-DD" de las novedades, en pantalla.
//
// POR QUÉ EXISTE: la portada y /novedades mostraban la misma novedad con un
// día de diferencia (13/09 y "12 sept 2026"). /novedades hacía
// `new Date("2026-09-13")`, que el navegador interpreta como medianoche UTC y
// en Argentina (UTC−3) cae el día anterior. Acá la fecha se arma con año, mes
// y día locales, y las dos pantallas usan estas mismas dos funciones. Y la
// portada mostraba "13/09" sin año, mezclando 2026 con 2025 en la misma lista.

/** "2026-09-13" -> Date local del 13/9/2026 (sin corrimiento por zona horaria). */
export function fechaLocal(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}

/** "2026-09-13" -> "13/09/26" */
export function fechaCorta(ymd) {
  const d = fechaLocal(ymd);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

const LARGA = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

/** "2026-09-13" -> "13 sept 2026" */
export function fechaLarga(ymd) {
  const d = fechaLocal(ymd);
  return d ? LARGA.format(d) : "";
}
