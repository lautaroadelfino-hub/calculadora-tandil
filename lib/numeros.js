// lib/numeros.js
// UN solo lector de números escritos a mano en formato argentino.
//
// POR QUÉ EXISTE: había tres implementaciones distintas del mismo problema
// (EscalasTab, GananciasTab y convenioForm), escritas el mismo día, y dos
// tenían errores que guardaban datos mal SIN AVISAR:
//   - "8,333%"    -> NaN -> 0  y con eso se borraba la regla de presentismo
//   - "1.500"     -> 1.5       una retención fija de $1.500 quedaba en $1,50
//   - "2.000.030" -> NaN -> 0  el formato en que ARCA publica la escala
//
// La lección de fondo no es el parser: es que devolver 0 ante algo ilegible
// convierte un error del usuario en un dato plausible. Por eso acá lo central
// es `parsearNumero`, que distingue "inválido" de "cero". El que llama decide
// qué hacer, pero ya no puede hacerlo por accidente.

const SEPARADORES_INVISIBLES = /[\s  ]/g;

/**
 * Lee un número escrito a mano en formato argentino.
 *
 * Acepta: "1.234,56"  "1.500"  "8,333%"  "$ 1.273.746,00"  "-2,5"  1234  ""
 * Reglas de desambiguación (es-AR):
 *   - Si hay coma y punto, manda el último que aparece: ese es el decimal.
 *   - Si sólo hay coma, es el separador decimal.
 *   - Si sólo hay punto y parte en grupos de 3, son miles: "1.500" = 1500.
 *     (Para escribir uno y medio hay que poner "1,5", como corresponde acá.)
 *
 * @returns {{ok: boolean, valor: number|null, motivo: string|null}}
 *   ok:false con valor:null si el texto no representa un número.
 *   Un texto vacío devuelve ok:true y valor:null (es "no cargado", no "cero").
 */
export function parsearNumero(entrada) {
  if (typeof entrada === "number") {
    return Number.isFinite(entrada)
      ? { ok: true, valor: entrada, motivo: null }
      : { ok: false, valor: null, motivo: "no es un número finito" };
  }

  if (entrada === null || entrada === undefined) {
    return { ok: true, valor: null, motivo: null };
  }

  const original = String(entrada).replace(SEPARADORES_INVISIBLES, "");
  if (original === "") return { ok: true, valor: null, motivo: null };

  // Se toleran símbolos de moneda y de porcentaje porque la gente los escribe.
  let s = original.replace(/[$%]/g, "");
  if (s === "") return { ok: false, valor: null, motivo: "no tiene ningún dígito" };

  if (/[^0-9,.\-+]/.test(s)) {
    return { ok: false, valor: null, motivo: `tiene caracteres que no son números: "${original}"` };
  }

  let signo = 1;
  if (s.startsWith("-")) { signo = -1; s = s.slice(1); }
  else if (s.startsWith("+")) { s = s.slice(1); }
  if (s.includes("-") || s.includes("+")) {
    return { ok: false, valor: null, motivo: `el signo está en el medio: "${original}"` };
  }
  if (!/[0-9]/.test(s)) return { ok: false, valor: null, motivo: "no tiene ningún dígito" };

  const tieneComa = s.includes(",");
  const tienePunto = s.includes(".");

  if (tieneComa && tienePunto) {
    // El separador decimal es el que aparece último; el otro es de miles.
    const decimal = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    if (s.split(decimal).length > 2) {
      return { ok: false, valor: null, motivo: `tiene más de un separador decimal: "${original}"` };
    }
    s = s.split(miles).join("").replace(decimal, ".");
  } else if (tieneComa) {
    if (s.split(",").length > 2) {
      // "1,234,56" no es formato argentino ni inglés: es un error de tipeo.
      return { ok: false, valor: null, motivo: `tiene más de una coma: "${original}"` };
    }
    s = s.replace(",", ".");
  } else if (tienePunto) {
    const partes = s.split(".");
    const grupos = partes.slice(1);
    // Miles: varios puntos, o uno solo seguido de exactamente 3 dígitos.
    const pareceMiles = grupos.length > 1 || grupos[0]?.length === 3;
    if (pareceMiles) {
      if (!grupos.every((g) => /^[0-9]{3}$/.test(g))) {
        return { ok: false, valor: null, motivo: `los grupos de miles están mal formados: "${original}"` };
      }
      s = partes.join("");
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, valor: null, motivo: `no se pudo leer: "${original}"` };
  return { ok: true, valor: signo * n, motivo: null };
}

/**
 * Versión indulgente, para lugares donde un valor ausente o ilegible debe
 * simplemente valer algo (por ejemplo pintar una vista previa).
 * NO usar antes de guardar en Firestore: ahí hay que usar `parsearNumero`
 * y frenar al usuario, que es justamente lo que antes no pasaba.
 */
export function aNumero(entrada, porDefecto = 0) {
  const r = parsearNumero(entrada);
  return r.ok && r.valor !== null ? r.valor : porDefecto;
}

/** ¿Este texto es un número legible? (vacío cuenta como legible: es "sin cargar") */
export function esNumeroValido(entrada) {
  return parsearNumero(entrada).ok;
}

/** Formatea para mostrar en pantalla, en es-AR. */
export function formatearNumero(n, decimales = 2) {
  if (n === "" || n === null || n === undefined) return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export default parsearNumero;
