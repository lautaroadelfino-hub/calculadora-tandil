// lib/validacionEntradas.js
// Lo que la persona escribe en la calculadora, antes de que llegue al motor.
//
// POR QUÉ EXISTE: la auditoría en frío del 13/9/2026 encontró la validación
// puesta al revés. El navegador rechazaba 36,5 horas semanales sin decir nada
// (el botón "Calcular" quedaba mudo), y a la vez aceptaba 999 horas, 1.000
// horas extras o 999 pernoctes en un mes y armaba un recibo de 25 millones
// con cara de correcto. Y unas horas vacías o en cero calculaban jornada
// completa en silencio.
//
// Acá se decide, con nombre y apellido, qué es un error (no se calcula, se
// dice cuál campo y por qué) y qué es un aviso (se calcula, y el recibo lo
// dice). Los números se aceptan con coma o con punto. El motor sigue teniendo
// sus propias defensas: esto es la primera línea, no la única.

import { parsearNumero } from "./numeros.js";
import { POR_DEFECTO } from "./vocabularioConvenios.js";

/** Los límites de lo posible en un mes. Pasarse es un error, no un aviso. */
export const TOPES = {
  horas_semanales: 84,
  antiguedad_años: 60,
  horas_extras_mes: 300,
  dias_mes: 31,
  dias_vacaciones: 35,
  km_mes: 50000,
  viajes_mes: 200,
  art_alicuota_pct: 30,
  hijos: 20,
  numero_generico: 1000000,
};

/** Los campos numéricos que la pantalla pregunta siempre, sean del convenio o no. */
export const UNIVERSALES_NUMERICOS = ["dias_vacaciones", "art_alicuota", "art_suma_fija", "hijos", "hijos_incapacitados"];

const ETIQUETAS_UNIVERSALES = {
  periodo: "Período a liquidar",
  carga_horaria: "Horas semanales",
  antiguedad_años: "Años de antigüedad",
  horas_extras_50: "Horas extras al 50%",
  horas_extras_100: "Horas extras al 100%",
  dias_vacaciones: "Días de vacaciones",
  art_alicuota: "Alícuota de ART",
  art_suma_fija: "Cuota fija de la ART",
  hijos: "Hijos a cargo",
  hijos_incapacitados: "Hijos con discapacidad",
};

/** El nombre con el que la pantalla muestra un campo, para nombrarlo en un error. */
export function etiquetaDeCampo(convenio, id) {
  const declarado = (convenio?.inputs_requeridos || []).find((i) => i.id === id);
  return declarado?.label || ETIQUETAS_UNIVERSALES[id] || id;
}

/** Los ids de todos los campos numéricos de esta calculadora. */
export function camposNumericos(convenio) {
  const delConvenio = (convenio?.inputs_requeridos || []).filter((i) => i.tipo === "number").map((i) => i.id);
  return [...new Set([...delConvenio, ...UNIVERSALES_NUMERICOS])];
}

/** Qué unidad mide cada pregunta de cantidad de los adicionales por unidad (día, km, viaje). */
function unidadDeCantidad(convenio) {
  const unidades = {};
  for (const regla of Object.values(convenio?.reglas_calculo?.adicionales_por_unidad || {})) {
    if (regla && regla.cantidad_de && regla.unidad) unidades[regla.cantidad_de] = regla.unidad;
  }
  return unidades;
}

const fmt = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });

/**
 * Revisa y normaliza lo que la persona cargó.
 *
 * @returns {{ valores: object, errores: Record<string,string>, avisos: string[], hayErrores: boolean }}
 *   `valores` es lo que va al motor: los numéricos ya convertidos a número
 *   (vacío = 0, salvo la ART, donde vacío significa "no la sé"); `errores`
 *   va por id de campo, en el orden en que aparecen en pantalla.
 */
export function normalizarEntradas(convenio, valores = {}, periodo = "") {
  const errores = {};
  const avisos = [];
  const salida = { ...valores };
  const completas = Number(convenio?.reglas_calculo?.jornada?.horas_semanales_completas) || POR_DEFECTO.jornada.horas_semanales_completas;
  const unidades = unidadDeCantidad(convenio);

  if (!periodo) errores.periodo = "Elegí el mes que querés liquidar.";

  for (const id of camposNumericos(convenio)) {
    const crudo = valores[id];
    if (crudo === "" || crudo === null || crudo === undefined) {
      if (id === "carga_horaria") {
        errores[id] = `Cargá las horas semanales (jornada completa: ${completas} hs).`;
      } else if (id === "art_alicuota") {
        salida[id] = "";
      } else {
        salida[id] = 0;
      }
      continue;
    }
    const parseado = typeof crudo === "number" ? { ok: Number.isFinite(crudo), valor: crudo } : parsearNumero(String(crudo));
    if (!parseado.ok) {
      errores[id] = `"${crudo}" no es un número. Usá sólo cifras; para los decimales, coma o punto.`;
      continue;
    }
    const n = parseado.valor;
    if (n < 0) {
      errores[id] = "No puede ser negativo.";
      continue;
    }
    salida[id] = n;

    if (id === "carga_horaria") {
      if (n === 0) errores[id] = `Poné las horas semanales que trabaja (jornada completa: ${completas} hs).`;
      else if (n > TOPES.horas_semanales) errores[id] = `Más de ${TOPES.horas_semanales} horas semanales no es posible.`;
      else if (n > completas) avisos.push(`Cargaste ${fmt(n)} hs semanales, más que la jornada completa de ${completas}: el básico va por jornada completa y el resto como horas extras.`);
    } else if (id === "antiguedad_años") {
      if (n > TOPES.antiguedad_años) errores[id] = `Más de ${TOPES.antiguedad_años} años de antigüedad no es posible.`;
    } else if (id === "dias_vacaciones") {
      if (n > TOPES.dias_vacaciones) errores[id] = `Más de ${TOPES.dias_vacaciones} días de vacaciones en un mes no es posible.`;
    } else if (id === "art_alicuota") {
      if (n > TOPES.art_alicuota_pct) errores[id] = `Una alícuota de ART mayor al ${TOPES.art_alicuota_pct}% no es posible. Va en porcentaje: 5 quiere decir 5%.`;
    } else if (id === "hijos" || id === "hijos_incapacitados") {
      if (n > TOPES.hijos) errores[id] = `Más de ${TOPES.hijos} no es posible.`;
    } else if (unidades[id] === "dia") {
      if (n > TOPES.dias_mes) errores[id] = `${fmt(n)} días en un mes no es posible (máximo ${TOPES.dias_mes}).`;
    } else if (unidades[id] === "km") {
      if (n > TOPES.km_mes) errores[id] = `${fmt(n)} km en un mes no es posible (máximo ${fmt(TOPES.km_mes)}).`;
    } else if (unidades[id] === "viaje") {
      if (n > TOPES.viajes_mes) errores[id] = `${fmt(n)} viajes en un mes no es posible (máximo ${TOPES.viajes_mes}).`;
    } else if (id !== "horas_extras_50" && id !== "horas_extras_100" && id !== "art_suma_fija" && n > TOPES.numero_generico) {
      errores[id] = "Ese número es demasiado grande para ser real.";
    }
  }

  // Las horas extras se miran juntas: un mes tiene 720 horas.
  const extras = (Number(salida.horas_extras_50) || 0) + (Number(salida.horas_extras_100) || 0);
  if (extras > TOPES.horas_extras_mes) {
    const mensaje = `Entre las dos, ${fmt(extras)} horas extras en un mes no es posible (máximo ${TOPES.horas_extras_mes}).`;
    if (!errores.horas_extras_50) errores.horas_extras_50 = mensaje;
    if (!errores.horas_extras_100) errores.horas_extras_100 = mensaje;
  }

  // Los errores salen en el orden de la pantalla: período, campos del
  // convenio, después los universales. Así el primero es el de más arriba.
  const orden = ["periodo", ...(convenio?.inputs_requeridos || []).map((i) => i.id), ...UNIVERSALES_NUMERICOS];
  const ordenados = {};
  for (const id of orden) if (errores[id]) ordenados[id] = errores[id];
  for (const id of Object.keys(errores)) if (!ordenados[id]) ordenados[id] = errores[id];

  return { valores: salida, errores: ordenados, avisos, hayErrores: Object.keys(ordenados).length > 0 };
}
