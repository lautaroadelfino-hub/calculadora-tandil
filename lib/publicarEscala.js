// lib/publicarEscala.js
// Lo que se escribe en Firestore al publicar la escala de un mes: el documento
// de la escala y el del convenio que va con ella (las categorías y zonas de
// los desplegables, y hasta qué período llegan las escalas).
//
// POR QUÉ EXISTE: esta lógica vivía adentro del botón "Guardar y publicar" de
// components/admin/EscalasTab.jsx, sin tests. scripts/cargarMes.mjs publica
// lo mismo desde la línea de comandos y tiene que escribir exactamente lo que
// escribe el panel: por eso los dos llaman acá.

import { leerClave, tieneZonas } from "./escalaCsv.js";

/**
 * El documento de una escala. La suma sin incidencia se escribe sólo si la
 * hay, para no ensuciar las escalas que no la usan con un campo en cero; el
 * nombre de esa suma y los valores del período, sólo si vienen.
 */
export function documentoDeEscala({ claves = [], sueldos = {}, mesVigencia, nombreSinIncidencia = "", valoresDelPeriodo = {} }) {
  const categorias = {};
  for (const clave of claves) {
    const s = sueldos[clave] || {};
    categorias[clave] = {
      basico: Number(s.basico) || 0,
      no_remunerativo: Number(s.no_remunerativo) || 0,
    };
    const sinIncidencia = Number(s.no_remunerativo_sin_incidencia) || 0;
    if (sinIncidencia > 0) categorias[clave].no_remunerativo_sin_incidencia = sinIncidencia;
  }

  const escala = { mes_vigencia: String(mesVigencia || "").trim(), categorias };
  const nombre = String(nombreSinIncidencia || "").trim();
  if (nombre) escala.nombre_sin_incidencia = nombre;
  if (Object.keys(valoresDelPeriodo || {}).length) escala.valores_del_periodo = { ...valoresDelPeriodo };
  return escala;
}

/**
 * El convenio después de publicar una escala con estas claves: los
 * desplegables de categoría y zona pasan a ofrecer lo que la escala trae, y
 * `ultimo_periodo` avanza si este mes es más nuevo que el que había.
 *
 * Devuelve el convenio entero, modificado. No toca nada más.
 */
export function convenioConEscala(convenio, claves = [], periodoID, mesVigencia) {
  const inputs = [...(convenio.inputs_requeridos || [])];

  const indexCategoria = inputs.findIndex((i) => i.id === "categoria");
  if (indexCategoria !== -1) {
    const catPuras = Array.from(new Set(claves.map((c) => leerClave(c).categoria)));
    const defaultActual = inputs[indexCategoria].default;
    // Antes sólo se pisaban las opciones y nunca el default, así que todo
    // convenio nuevo quedaba con default "" y la calculadora tiraba
    // "La categoría no existe" a quien no tocara el desplegable.
    const defaultValido = catPuras.includes(defaultActual) ? defaultActual : catPuras[0] || "";
    inputs[indexCategoria] = { ...inputs[indexCategoria], opciones: catPuras, default: defaultValido };
  }

  // Antes se miraba sólo la primera clave: si el orden alfabético ponía
  // primero una fila sin zona, la columna se ignoraba entera.
  if (tieneZonas(claves)) {
    const zonasPuras = Array.from(new Set(claves.map((c) => leerClave(c).zona).filter(Boolean)));
    const indexZona = inputs.findIndex((i) => i.id === "zona");
    if (indexZona !== -1) {
      const defZona = zonasPuras.includes(inputs[indexZona].default) ? inputs[indexZona].default : zonasPuras[0] || "";
      inputs[indexZona] = { ...inputs[indexZona], opciones: zonasPuras, default: defZona };
    } else {
      inputs.unshift({ id: "zona", tipo: "select", label: "Zona / Escala", default: zonasPuras[0], opciones: zonasPuras });
    }
  }

  // Se anota hasta qué período llegan las escalas. La portada lo usa para
  // decir la verdad ("Escalas hasta septiembre 2026") en vez de afirmar que
  // están actualizadas, que es lo que venía diciendo incluso con dos meses de
  // atraso. Publicar un mes viejo no lo mueve para atrás.
  const periodoMasNuevo = !convenio.ultimo_periodo || periodoID > convenio.ultimo_periodo ? periodoID : convenio.ultimo_periodo;
  const nombreMasNuevo = periodoMasNuevo === periodoID ? mesVigencia : convenio.ultimo_periodo_nombre;

  return {
    ...convenio,
    inputs_requeridos: inputs,
    ultimo_periodo: periodoMasNuevo,
    ultimo_periodo_nombre: nombreMasNuevo || mesVigencia,
  };
}

/** Los tres campos del convenio que publicar una escala puede cambiar: lo único que se escribe de él. */
export const CAMPOS_DEL_CONVENIO_AL_PUBLICAR = ["inputs_requeridos", "ultimo_periodo", "ultimo_periodo_nombre"];
