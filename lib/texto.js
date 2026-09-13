// lib/texto.js
// Utilidades de texto compartidas por los formularios del panel.

// Rango de acentos combinados (tras normalize NFD). Se arma con escapes ASCII
// para no meter caracteres combinados crudos en el código fuente.
const COMBINING = new RegExp("[\u0300-\u036f]", "g");

/**
 * "Cuota Afiliado (2,5%)" -> "cuota_afiliado_2_5". Sirve de id estable para lo
 * que el usuario nombra a mano: retenciones, adicionales, conceptos de una
 * tabla. Si el texto no deja nada utilizable, se usa `siVacio`.
 */
export function slug(texto, siVacio = "item") {
  return (
    String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(COMBINING, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || siVacio
  );
}
