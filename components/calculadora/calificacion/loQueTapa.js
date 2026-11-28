// components/calculadora/calificacion/loQueTapa.js
// Cuánto del pie de la pantalla está tapado, para subir la tira "¿Te sirvió
// este cálculo?" esa medida (CalificarExperiencia.jsx, --tapa).
//
// La tira va pegada (sticky) al pie del viewport de disposición, que es el que
// usa el navegador para acomodar la página. Lo que la persona ve es el
// viewport visual, que puede ser más corto:
// - con el teclado en pantalla: Safari del iPhone y Chrome de Android (desde
//   la 108) achican sólo el visual, y lo pegado al pie queda debajo del
//   teclado. Se escribía a ciegas, con "Enviar" tapado;
// - con una barra del navegador o del sistema que el de disposición no
//   descuenta (se reportó en Samsung Internet con la barra abajo, y pasa con
//   la barra de atajos de un teclado físico en el iPad).
// La cuenta es la misma en los dos casos y no mira dónde está la tira: sólo
// compara los dos viewports. Así no se realimenta (subir la tira no cambia la
// medida) ni depende de en qué coordenadas mide cada navegador un rectángulo,
// que con el viewport visual corrido no está claro en Safari (investigación
// del 27/11/2026, con las fuentes en el PR).
//
// Lo que NO se puede probar acá: no hay teléfono. Los tests cubren la cuenta;
// en un teléfono de verdad se mira con #medidas (README, sección 5).

/** Sin escribir, una diferencia más chica que esto es redondeo o una barra a medio moverse. */
export const TOLERANCIA_PX = 4;
/**
 * Sin escribir, una diferencia más grande que esto no es una barra: es el
 * teclado abierto para OTRO campo (los del formulario). Ahí la tira no sube:
 * aparecería encima de lo que la persona está escribiendo.
 */
export const TOPE_SIN_ESCRIBIR_PX = 96;
/** Escribiendo, el teclado nunca tapa más que esto de la pantalla. Más es una medida rota. */
const TOPE_DEL_TECLADO = 0.6;
/**
 * Menos alto que esto, la pregunta del comentario no entra (el título, dos
 * renglones de caja y el pie): es preferible que el título quede debajo de la
 * barra del sitio a que la caja se achique a nada. Pasa con el teléfono
 * acostado y el teclado abierto.
 */
export const ALTO_MINIMO_PX = 176;
const AIRE_PX = 8;

/**
 * @param alto  window.innerHeight: el alto del viewport de disposición.
 * @param vv  { height, offsetTop, scale }, de window.visualViewport.
 * @param escribiendo  la persona está en la caja del comentario.
 * @returns cuántos px sumarle al `bottom` de la tira para que quede entera a la vista.
 */
export function loQueTapaElPie({ alto, vv, escribiendo = false }) {
  if (!vv || !(alto > 0) || !(vv.height > 0)) return 0;
  // Con zoom de dedos, lo pegado al pie sale de la vista a propósito, y en Safari las medidas no coinciden.
  if (Math.abs((vv.scale ?? 1) - 1) > 0.01) return 0;
  const tapa = Math.round(alto - vv.height - (vv.offsetTop || 0));
  if (escribiendo) return Math.min(Math.max(0, tapa), Math.round(alto * TOPE_DEL_TECLADO));
  return tapa > TOLERANCIA_PX && tapa <= TOPE_SIN_ESCRIBIR_PX ? tapa : 0;
}

/**
 * Cuánto puede medir la tira mientras se escribe o algo tapa el pie: lo que se
 * ve, menos la barra del sitio (pegada arriba y por encima de la tira) y menos
 * la distancia de la tira al pie, con un poco de aire. Antes el tope era lo
 * visible menos 16 px: con el teclado abierto y un comentario de varios
 * renglones, el título y el principio de lo escrito quedaban debajo de la
 * barra (revisión del 27/11/2026).
 * @param visible  visualViewport.height: el alto de lo que se ve.
 * @param corrido  visualViewport.offsetTop: cuánto corrió el navegador lo visible (iOS, para mostrar la caja).
 * @param barra  hasta dónde llega la barra del sitio, desde arriba del viewport de disposición.
 * @param margen  el `bottom` de la tira, sin lo tapado.
 */
export function altoLibre({ visible, corrido = 0, barra = 0, margen = 12 }) {
  const deLaBarra = Math.max(0, barra - corrido);
  return Math.max(ALTO_MINIMO_PX, Math.round(visible - deLaBarra - margen - AIRE_PX));
}
