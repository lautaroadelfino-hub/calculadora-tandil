// lib/directorio.js
// El directorio de convenios de la portada: ordenar, buscar y agrupar.
//
// POR QUÉ EXISTE: la portada mostraba los convenios en el orden en que
// Firestore devolvía los documentos (o sea, ninguno estable para quien busca
// el suyo) y sin forma de filtrar. Con 3 convenios eso se nota poco; con 40
// obliga a leer una grilla entera. Estas funciones son puras -entra una lista,
// sale otra- para que se puedan probar sin navegador y sin tocar la base.
//
// NO cambia el modelo de datos: lee los mismos campos que ya trae cada
// documento (nombre, cct, sector, descripcion) y no escribe nada.

import { SECTORES, estiloDeSector } from "./herramientas.js";

/** Desde cuántos convenios activos aparece el buscador (inclusive). */
export const UMBRAL_BUSCADOR = 8;

/** Desde cuántos convenios activos la grilla se parte por sector (inclusive). */
export const UMBRAL_AGRUPAR = 10;

/** ¿Ya hay tantos convenios como para que buscar sea más rápido que mirar? */
export function debeBuscar(cantidad) {
  return Number(cantidad) >= UMBRAL_BUSCADOR;
}

/** ¿Ya hay tantos como para que la grilla plana deje de leerse de un vistazo? */
export function debeAgrupar(cantidad) {
  return Number(cantidad) >= UMBRAL_AGRUPAR;
}

// Rango de acentos combinados (tras normalize NFD), escrito con escapes ASCII
// para no meter caracteres combinados crudos en el código fuente. Mismo
// criterio que lib/texto.js.
const COMBINING = new RegExp("[\u0300-\u036f]", "g");

/**
 * "Gastronómicos (UTHGRA)" -> "gastronomicos uthgra".
 * Sin acentos, sin mayúsculas y sin signos: así "gastronomicos" encuentra
 * "Gastronómicos", y "130/75" se parte en "130 75" para encontrar "CCT 130/75".
 */
export function normalizarBusqueda(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Orden alfabético por nombre, ignorando acentos y mayúsculas. No muta. */
export function ordenarConvenios(lista) {
  return [...(lista || [])].sort((a, b) =>
    String((a && a.nombre) || "").localeCompare(String((b && b.nombre) || ""), "es", {
      sensitivity: "base",
      numeric: true,
    })
  );
}

/**
 * El texto contra el que se busca un convenio: nombre, número de CCT, etiqueta
 * del sector y descripción. El sector entra acá aunque ya NO se imprima en la
 * tarjeta: que no se muestre no quiere decir que no se pueda buscar por ahí
 * (quien escribe "transporte" espera encontrar Camioneros).
 */
export function textoBuscable(convenio) {
  const c = convenio || {};
  return [
    c.nombre,
    c.cct ? `cct ${c.cct}` : "",
    estiloDeSector(c.sector).sector,
    c.descripcion,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Filtra por nombre, número de CCT, sector o descripción.
 * - Consulta vacía = lista completa.
 * - Varias palabras = tienen que aparecer TODAS, en cualquier orden
 *   ("comercio 130" encuentra Empleados de Comercio CCT 130/75).
 * - También compara contra la versión "pegada" (sin separadores), para que
 *   "4089" encuentre el CCT 40/89.
 */
export function filtrarConvenios(lista, consulta) {
  const base = lista || [];
  const terminos = normalizarBusqueda(consulta).split(" ").filter(Boolean);
  if (terminos.length === 0) return [...base];
  return base.filter((c) => {
    const heno = normalizarBusqueda(textoBuscable(c));
    const henoPegado = heno.replace(/ /g, "");
    return terminos.every((t) => heno.includes(t) || henoPegado.includes(t));
  });
}

const VALORES_DE_SECTOR = new Set(SECTORES.map((s) => s.value));

/**
 * El sector con el que se agrupa un convenio. Un documento sin sector, o con
 * uno que no está en SECTORES, cae en "privado": el mismo criterio que usa
 * estiloDeSector() para pintarlo. Así ningún convenio desaparece de la portada
 * por tener el campo vacío, que es indistinguible de no haberlo cargado nunca.
 */
export function claveDeSector(convenio) {
  const valor = convenio && convenio.sector;
  return VALORES_DE_SECTOR.has(valor) ? valor : SECTORES[0].value;
}

/**
 * Parte la lista en grupos por sector, en el orden de SECTORES y con los
 * convenios de cada grupo ordenados alfabéticamente. Los sectores sin
 * convenios no aparecen: nunca se dibuja un encabezado vacío.
 */
export function agruparPorSector(lista) {
  const base = lista || [];
  return SECTORES.map((s) => ({
    value: s.value,
    label: s.label,
    color: s.color,
    convenios: ordenarConvenios(base.filter((c) => claveDeSector(c) === s.value)),
  })).filter((g) => g.convenios.length > 0);
}
