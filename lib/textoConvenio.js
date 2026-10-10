// lib/textoConvenio.js
// El texto que acompaña a cada calculadora: un párrafo con qué calcula y las
// preguntas frecuentes. Todo sale de los DATOS cargados (la escala del
// período, las reglas del convenio, el último acuerdo), nunca de texto
// escrito a mano: así no envejece cuando el dueño carga un mes nuevo, y nada
// afirma una cifra que no esté en la base. Si falta el dato, la frase o la
// pregunta se omite.
//
// POR QUÉ EXISTE: la página de cada calculadora tenía como único texto el
// nombre del convenio y el formulario. Google no tenía con qué relacionarla a
// "calculadora sueldo camioneros" ni a "cuánto cobra un chofer". Es puro, con
// tests sobre los fixtures de cada convenio.

import { APORTES_PERSONALES, AGUINALDO, RECARGOS_HORA_EXTRA } from "./parametrosLaborales.js";
import { POR_DEFECTO } from "./vocabularioConvenios.js";

// "$ 1.075.910,44": el espacio que pone Intl entre el signo y el número es uno
// "fino" (U+202F); se cambia por uno común para que el texto se copie y se
// busque como la gente lo escribe.
const formatoPesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });
const pesos = { format: (n) => formatoPesos.format(n).replace(/[  ]/g, " ") };
const porcentaje = (fraccion) => `${(Number(fraccion) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;

const valorDeOpcion = (o) => String(typeof o === "object" && o ? o.value || o.label : o);

/**
 * El valor con el que arranca un campo del formulario: su default si está
 * entre las opciones (un default viejo puede haber quedado fuera cuando se
 * recargaron las categorías), si no la primera opción.
 */
function valorDeReferencia(convenio, id) {
  const campo = ((convenio && convenio.inputs_requeridos) || []).find((i) => i && i.id === id);
  if (!campo) return null;
  const opciones = (campo.opciones || []).map(valorDeOpcion);
  if (campo.default && (opciones.length === 0 || opciones.includes(String(campo.default)))) return String(campo.default);
  return opciones[0] || null;
}

/** La categoría con la que arranca el formulario. */
export const categoriaDeReferencia = (convenio) => valorDeReferencia(convenio, "categoria");

/** La zona con la que arranca el formulario (convenios con escalas por zona), o null. */
export const zonaDeReferencia = (convenio) => valorDeReferencia(convenio, "zona");

/**
 * El básico (y el no remunerativo) de esa categoría en la escala. Una escala
 * con zonas guarda las claves como "Zona|Categoría": se busca con la zona de
 * referencia y, si no está, en cualquier zona.
 */
export function basicoDeReferencia(escala, categoria, zona = null) {
  const cats = (escala && escala.categorias) || {};
  if (!categoria) return null;
  const claves = Object.keys(cats);
  const clave =
    claves.find((k) => k === categoria) ||
    (zona ? claves.find((k) => k === `${zona}|${categoria}`) : null) ||
    claves.find((k) => k.endsWith(`|${categoria}`));
  if (!clave) return null;
  const fila = cats[clave];
  const basico = typeof fila === "number" ? fila : Number(fila && fila.basico);
  if (!Number.isFinite(basico) || basico <= 0) return null;
  const noRemunerativo = typeof fila === "object" ? Number(fila.no_remunerativo) || 0 : 0;
  return { clave, basico, noRemunerativo };
}

const nombreCompleto = (c) => (c.cct ? `${c.nombre} (CCT ${c.cct})` : c.nombre);

/**
 * El párrafo de arriba. `periodoNombre` es el nombre legible del período de
 * la escala ("Septiembre 2026"); `periodos` la lista cargada (más nuevo
 * primero); `ultimoAcuerdo` el acuerdo publicado más nuevo, si hay.
 */
export function parrafoDeConvenio({ convenio, escala, periodoNombre, periodos = [], ultimoAcuerdo = null }) {
  const categoria = categoriaDeReferencia(convenio);
  const ref = basicoDeReferencia(escala, categoria, zonaDeReferencia(convenio));
  const partes = [];
  partes.push(
    `Simulá el recibo de sueldo de ${nombreCompleto(convenio)}${periodoNombre ? ` con la escala de ${periodoNombre}` : ""}` +
      (ref ? `: el básico de ${categoria} es ${pesos.format(ref.basico)}` : "") +
      "."
  );
  if (periodos.length > 1) {
    const masViejo = periodos[periodos.length - 1].nombre;
    const masNuevo = periodos[0].nombre;
    partes.push(`Escalas cargadas de ${masViejo} a ${masNuevo}.`);
  }
  return { texto: partes.join(" "), ultimoAcuerdo };
}

const BASE_ANTIGUEDAD = {
  basico: "el sueldo básico",
  basico_mas_adicionales: "el básico más los adicionales",
  basico_mas_antiguedad: "el básico más la antigüedad",
  remunerativo: "el total remunerativo",
};
/** "el básico" -> "del básico"; "la base…" -> "de la base…". */
const de = (frase) => (frase.startsWith("el ") ? `del ${frase.slice(3)}` : `de ${frase}`);

const condicionDe = (r) =>
  r.condicion === "solo_afiliado" ? " (sólo afiliados)" : r.condicion === "solo_no_afiliado" ? " (sólo no afiliados)" : "";

/**
 * Las preguntas frecuentes, como [{ id, pregunta, respuesta }] con texto
 * plano. Cada una aparece sólo si el dato que la responde está cargado.
 */
export function preguntasFrecuentes({ convenio, escala, periodoNombre }) {
  const reglas = (convenio && convenio.reglas_calculo) || {};
  const categoria = categoriaDeReferencia(convenio);
  const ref = basicoDeReferencia(escala, categoria, zonaDeReferencia(convenio));
  const mes = periodoNombre ? ` en ${periodoNombre}` : "";
  const preguntas = [];

  if (ref && periodoNombre) {
    const nr = ref.noRemunerativo > 0 ? `, más ${pesos.format(ref.noRemunerativo)} no remunerativos` : "";
    preguntas.push({
      id: "basico",
      pregunta: `¿Cuál es el sueldo básico de ${convenio.nombre}${mes}?`,
      respuesta: `El básico de ${categoria} es ${pesos.format(ref.basico)} por mes según la escala de ${periodoNombre}${nr}. A eso se suman antigüedad, horas extras y adicionales, y se descuentan los aportes. Calculá tu caso con tu categoría y tu antigüedad en la calculadora de arriba.`,
    });
  }

  const medio = ref ? ` Con el básico de ${categoria} de ${periodoNombre}, sin antigüedad ni adicionales, el medio aguinaldo sería ${pesos.format(ref.basico * AGUINALDO.proporcionDeLaMejorRemuneracion)}.` : "";
  preguntas.push({
    id: "aguinaldo",
    pregunta: `¿Cómo se calcula el aguinaldo de ${convenio.nombre}?`,
    respuesta: `El medio aguinaldo (SAC) es el ${porcentaje(AGUINALDO.proporcionDeLaMejorRemuneracion)} de la mejor remuneración mensual del semestre y se cobra en junio y en diciembre (arts. 121 y 122 LCT).${medio} La calculadora lo incluye en el recibo cuando marcás que el mes lleva aguinaldo.`,
  });

  const ant = reglas.antiguedad;
  if (ant && Number(ant.porcentaje_por_año) > 0) {
    const base = BASE_ANTIGUEDAD[ant.aplica_sobre] || "la base que fija el convenio";
    preguntas.push({
      id: "antiguedad",
      pregunta: `¿Cómo se calcula la antigüedad en el CCT ${convenio.cct || ""}`.trim() + "?",
      respuesta: `Un ${porcentaje(ant.porcentaje_por_año)} ${de(base)} por cada año de servicio, según las reglas cargadas para ${convenio.nombre}.`,
    });
  }

  const pres = reglas.presentismo;
  if (pres && Number(pres.porcentaje) > 0) {
    const base = BASE_ANTIGUEDAD[pres.aplica_sobre] || "la base que fija el convenio";
    preguntas.push({
      id: "presentismo",
      pregunta: `¿Cuánto es el presentismo en ${convenio.nombre}?`,
      respuesta: `El presentismo es un ${porcentaje(pres.porcentaje)} sobre ${base}. Se pierde según las inasistencias que fija el convenio.`,
    });
  }

  const jornada = reglas.jornada || {};
  const divisor = Number(jornada.divisor_horas_mensuales) || Number(POR_DEFECTO.jornada && POR_DEFECTO.jornada.divisor_horas_mensuales) || 0;
  const horasSemana = Number(jornada.horas_semanales_completas) || 0;
  if (divisor > 0) {
    preguntas.push({
      id: "horas_extras",
      pregunta: `¿Cómo se liquidan las horas extras en ${convenio.nombre}?`,
      respuesta: `El valor de la hora sale de dividir el sueldo mensual por ${divisor}${horasSemana ? ` (jornada completa de ${horasSemana} horas semanales)` : ""}. La hora extra común se paga con un ${porcentaje(RECARGOS_HORA_EXTRA.al50 - 1)} de recargo y la de sábado después de las 13, domingo o feriado con un ${porcentaje(RECARGOS_HORA_EXTRA.al100 - 1)} (art. 201 LCT). La calculadora usa la escala del mes que elegís.`,
    });
  }

  const aportes = APORTES_PERSONALES.map((a) => a.label.toLowerCase().replace(/^ley 19\.032 /, "")).join(", ");
  const retenciones = Object.values(reglas.retenciones_sindicales || {})
    .filter((r) => r && r.label)
    .map((r) => `${r.label}${r.valor_fijo ? ` (${pesos.format(r.valor_fijo)})` : ""}${condicionDe(r)}`);
  preguntas.push({
    id: "descuentos",
    pregunta: `¿Qué descuentos tiene el recibo de ${convenio.nombre}?`,
    respuesta: `Los aportes de ley: ${aportes}, sobre lo remunerativo.${retenciones.length ? ` Y los del convenio: ${retenciones.join(", ")}.` : ""} La calculadora los muestra uno por uno en el recibo.`,
  });

  return preguntas;
}
