// lib/escalaCsv.js
// Lectura y escritura del CSV de escalas salariales.
//
// POR QUÉ EXISTE: esta lógica vivía dentro de components/admin/EscalasTab.jsx,
// que es la pestaña más vieja del panel ("Lógica portada sin cambios desde la
// versión anterior", dice su propio comentario) y la que se usa todos los
// meses. Al estar dentro del componente no se podía probar, y acumuló varios
// errores que hacían perder datos sin avisar:
//
//   - La presencia de zona se decidía mirando SÓLO el primer elemento de la
//     lista ordenada alfabéticamente. Si esa fila no tenía zona, la columna se
//     ignoraba entera y la calculadora después no encontraba ninguna categoría.
//   - Una categoría con una coma en el nombre ("Vendedor, Rama A") corría las
//     columnas y el sueldo se leía como texto -> 0.
//   - Subir un CSV con menos categorías que las cargadas borraba el resto, sin
//     decir nada, porque el guardado pisa el período entero.

import { parsearNumero } from "./numeros.js";

export const SEPARADOR_CLAVE = "|";

/** Una clave de escala es "Zona|Categoría" o simplemente "Categoría". */
export function armarClave(zona, categoria) {
  const z = String(zona || "").trim();
  const c = String(categoria || "").trim();
  return z ? `${z}${SEPARADOR_CLAVE}${c}` : c;
}

export function leerClave(clave) {
  const partes = String(clave || "").split(SEPARADOR_CLAVE);
  return partes.length > 1
    ? { zona: partes[0].trim(), categoria: partes.slice(1).join(SEPARADOR_CLAVE).trim() }
    : { zona: null, categoria: partes[0].trim() };
}

/** ¿Alguna de estas claves tiene zona? (antes se miraba sólo la primera) */
export function tieneZonas(claves = []) {
  return claves.some((c) => String(c).includes(SEPARADOR_CLAVE));
}

/** Parte una línea de CSV respetando las comillas dobles. */
export function partirLinea(linea, separador) {
  const campos = [];
  let actual = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (entreComillas && linea[i + 1] === '"') { actual += '"'; i++; }
      else entreComillas = !entreComillas;
    } else if (ch === separador && !entreComillas) {
      campos.push(actual);
      actual = "";
    } else {
      actual += ch;
    }
  }
  campos.push(actual);
  return campos.map((c) => c.trim());
}

export function detectarSeparador(header) {
  const punto = (header.match(/;/g) || []).length;
  const coma = (header.match(/,/g) || []).length;
  return punto > coma ? ";" : ",";
}

/**
 * Lee un CSV de escala.
 *
 * Columnas aceptadas: [zona,] categoria, basico, no_remunerativo [, no_remunerativo_sin_incidencia]
 * La zona se detecta por el encabezado, y si no hay encabezado reconocible se
 * infiere por la cantidad de columnas. La suma sin incidencia es opcional y
 * SÓLO se lee si el encabezado la declara: es la segunda suma no remunerativa
 * de algunos acuerdos (la "asignación extraordinaria" de Comercio), que no
 * genera antigüedad ni presentismo y no paga aportes ni contribuciones.
 *
 * @returns {{sueldos: Object, claves: string[], errores: string[], advertencias: string[]}}
 */
export function parsearCsvEscala(texto) {
  const errores = [];
  const advertencias = [];
  const sueldos = {};
  const claves = [];

  const lineas = String(texto || "").replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (lineas.length < 2) {
    return { sueldos, claves, errores: ["El archivo no tiene filas de datos."], advertencias };
  }

  const header = lineas[0].toLowerCase();
  const separador = detectarSeparador(header);
  const columnasHeader = partirLinea(header, separador);
  // La zona se declara en el encabezado. Se acepta "escala" como sinónimo
  // porque así lo nombra el convenio gastronómico ("Escala A" / "Escala B").
  const headerDeclaraZona = columnasHeader[0] === "zona" || columnasHeader[0] === "escala";
  const headerDeclaraSinIncidencia = columnasHeader.includes("no_remunerativo_sin_incidencia");

  lineas.slice(1).forEach((linea, idx) => {
    const nroFila = idx + 2; // +1 por el encabezado, +1 porque el humano cuenta desde 1
    const col = partirLinea(linea, separador);

    // Si el encabezado no lo dice, se infiere por cantidad de columnas (sólo
    // cuando no hay columna de sin incidencia, que también suma una).
    const conZona = headerDeclaraZona || (!headerDeclaraSinIncidencia && col.length >= 4);
    const desplazamiento = conZona ? 1 : 0;
    const zona = conZona ? col[0] : null;
    const categoria = col[desplazamiento];
    const textoBasico = col[desplazamiento + 1];
    const textoNr = col[desplazamiento + 2];
    const textoSinIncidencia = headerDeclaraSinIncidencia ? col[desplazamiento + 3] : undefined;

    if (!categoria) {
      advertencias.push(`Fila ${nroFila}: no tiene categoría, se saltea.`);
      return;
    }
    if (categoria.includes(SEPARADOR_CLAVE) || String(zona || "").includes(SEPARADOR_CLAVE)) {
      errores.push(`Fila ${nroFila}: el nombre no puede contener el carácter "${SEPARADOR_CLAVE}".`);
      return;
    }

    const basico = parsearNumero(textoBasico);
    const nr = parsearNumero(textoNr);
    const sinIncidencia = headerDeclaraSinIncidencia ? parsearNumero(textoSinIncidencia) : null;

    if (!basico.ok) {
      errores.push(`Fila ${nroFila} ("${categoria}"): el básico no se entiende (${basico.motivo}).`);
      return;
    }
    if (!nr.ok) {
      errores.push(`Fila ${nroFila} ("${categoria}"): el no remunerativo no se entiende (${nr.motivo}).`);
      return;
    }
    if (sinIncidencia && !sinIncidencia.ok) {
      errores.push(`Fila ${nroFila} ("${categoria}"): la suma sin incidencia no se entiende (${sinIncidencia.motivo}).`);
      return;
    }
    if (basico.valor === null) {
      errores.push(`Fila ${nroFila} ("${categoria}"): falta el sueldo básico.`);
      return;
    }

    const clave = armarClave(zona, categoria);
    if (sueldos[clave]) {
      advertencias.push(`Fila ${nroFila}: "${clave}" está repetida; queda el último valor.`);
    } else {
      claves.push(clave);
    }
    sueldos[clave] = { basico: basico.valor, no_remunerativo: nr.valor ?? 0 };
    if (sinIncidencia) sueldos[clave].no_remunerativo_sin_incidencia = sinIncidencia.valor ?? 0;
  });

  if (claves.length === 0 && errores.length === 0) {
    errores.push("El archivo no tiene ninguna fila con datos válidos.");
  }

  return { sueldos, claves: claves.sort((a, b) => a.localeCompare(b)), errores, advertencias };
}

/** Arma el CSV de un período ya cargado, para bajarlo y editarlo. */
export function generarCsvEscala(claves = [], sueldos = {}) {
  const conZona = tieneZonas(claves);
  // La columna de la suma sin incidencia sólo se escribe si alguna categoría la
  // tiene: así el archivo de un convenio que no la usa sigue siendo el de siempre.
  const conSinIncidencia = claves.some((c) => Number(sueldos[c]?.no_remunerativo_sin_incidencia) > 0);
  const cabecera =
    (conZona ? "zona,categoria,basico,no_remunerativo" : "categoria,basico,no_remunerativo") +
    (conSinIncidencia ? ",no_remunerativo_sin_incidencia" : "");
  const escapar = (v) => (String(v).includes(",") ? `"${String(v).replace(/"/g, '""')}"` : String(v));

  const filas = claves.map((clave) => {
    const { zona, categoria } = leerClave(clave);
    const s = sueldos[clave] || {};
    const celdas = conZona
      ? [zona ?? "", categoria, s.basico ?? 0, s.no_remunerativo ?? 0]
      : [categoria, s.basico ?? 0, s.no_remunerativo ?? 0];
    if (conSinIncidencia) celdas.push(s.no_remunerativo_sin_incidencia ?? 0);
    return celdas.map(escapar).join(",");
  });

  return [cabecera, ...filas].join("\n");
}

/**
 * Plantilla para un convenio NUEVO, que todavía no tiene ninguna categoría.
 * Antes esto bajaba sólo el encabezado, sin una sola fila: el usuario tenía que
 * adivinar el formato, que existía únicamente en el código.
 */
export function plantillaEjemplo(conZona = false) {
  return conZona
    ? [
        "zona,categoria,basico,no_remunerativo",
        "Escala A,Nivel 1,1000000,50000",
        "Escala A,Nivel 2,1100000,50000",
        "Escala B,Nivel 1,900000,40000",
        "Escala B,Nivel 2,990000,40000",
      ].join("\n")
    : [
        "categoria,basico,no_remunerativo",
        "Categoria de ejemplo A,1000000,50000",
        "Categoria de ejemplo B,1100000,50000",
        "Categoria de ejemplo C,1250000,50000",
      ].join("\n");
}

/** Formato de id de período. El mismo que ya validaba la pestaña de Ganancias. */
export const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

export function validarPeriodo(periodo) {
  const p = String(periodo || "").trim();
  if (!p) return "Escribí el período, con el formato AAAA-MM. Por ejemplo: 2026-09.";
  if (!FORMATO_PERIODO.test(p)) {
    return `"${p}" no tiene el formato AAAA-MM. Escribí por ejemplo 2026-09, con el mes en dos dígitos: si ponés 2026-9 los períodos se ordenan mal y la calculadora elige el mes equivocado.`;
  }
  const mes = Number(p.slice(5, 7));
  if (mes < 1 || mes > 12) return `"${p}" tiene un mes que no existe.`;
  return null;
}

/**
 * Revisa una escala antes de publicarla. Devuelve los motivos por los que
 * conviene frenar, y los que sólo ameritan avisar.
 */
export function revisarEscalaAntesDePublicar({ claves = [], sueldos = {}, clavesPrevias = [] }) {
  const errores = [];
  const advertencias = [];

  if (claves.length === 0) {
    errores.push("No hay ninguna categoría para publicar.");
    return { errores, advertencias, desaparecen: [] };
  }

  const conBasico = claves.filter((c) => Number(sueldos[c]?.basico) > 0);
  if (conBasico.length === 0) {
    errores.push("Todas las categorías tienen el sueldo básico en cero. Revisá el archivo antes de publicar.");
  }

  const enCero = claves.filter((c) => !(Number(sueldos[c]?.basico) > 0));
  if (enCero.length > 0 && conBasico.length > 0) {
    advertencias.push(`Hay ${enCero.length} categoría(s) con el básico en cero: ${enCero.slice(0, 5).join(", ")}${enCero.length > 5 ? "…" : ""}`);
  }

  // Lo que estaba cargado y no viene en el archivo nuevo se va a borrar,
  // porque al publicar se reemplaza el período entero.
  const desaparecen = clavesPrevias.filter((c) => !claves.includes(c));
  if (desaparecen.length > 0) {
    advertencias.push(
      `Se van a borrar ${desaparecen.length} categoría(s) que hoy están cargadas y no vienen en el archivo: ${desaparecen.slice(0, 5).join(", ")}${desaparecen.length > 5 ? "…" : ""}`
    );
  }

  return { errores, advertencias, desaparecen };
}
