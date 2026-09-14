// lib/convenioForm.js
// Conversión entre el documento de convenio (Firestore) y el estado del
// formulario del panel admin. Diseñada para ser LOSSLESS en todo lo que el
// motor de liquidación lee: preserva cualquier regla no manejada por el form
// (p. ej. adicionales_remunerativos) y reconstruye reglas_calculo idéntico.

import { parsearNumero } from "./numeros.js";
import { POR_DEFECTO, RUBROS_DEL_COSTO_LABORAL } from "./vocabularioConvenios.js";
import { slug as slugDe } from "./texto.js";

export const BASES = [
  { value: "remunerativo", label: "Remunerativo (bruto)" },
  { value: "remunerativo_habitual", label: "Remunerativo habitual (sin horas extras, SAC ni vacaciones)" },
  { value: "remunerativo_mas_no_remunerativo", label: "Remunerativo + No remunerativo" },
  { value: "no_remunerativo", label: "No remunerativo" },
];

/** Las bases de una contribución patronal: las mismas palabras, sin "sólo no remunerativo". */
export const BASES_PATRONALES = [
  ...BASES.filter((b) => ["remunerativo", "remunerativo_mas_no_remunerativo"].includes(b.value)),
  { value: "basico", label: "Sólo el sueldo básico (Camioneros: aportes patronales del CCT 40/89)" },
];

/** Sobre qué se calcula la antigüedad. */
export const BASES_ANTIGUEDAD = [
  { value: "basico", label: "Sobre el básico" },
  { value: "basico_mas_adicionales", label: "Sobre básico + adicionales remunerativos (Camioneros, ítem 6.1.5)" },
];

/** Las unidades de los adicionales por unidad. */
export const UNIDADES_POR_UNIDAD = [
  { value: "dia", label: "Por día trabajado" },
  { value: "km", label: "Por kilómetro" },
  { value: "viaje", label: "Por viaje" },
  { value: "mes", label: "Por mes (importe fijo)" },
];

export const NATURALEZAS = [
  { value: "no_remunerativo", label: "No remunerativo" },
  { value: "remunerativo", label: "Remunerativo" },
];

export const CONDICIONES = [
  { value: "siempre", label: "Siempre" },
  { value: "solo_afiliado", label: "Solo si está afiliado" },
  { value: "solo_no_afiliado", label: "Solo si NO está afiliado" },
];

// Inputs estándar para un convenio nuevo. La categoría (y la zona) las
// administra automáticamente la pestaña "Escalas paritarias".
export const INPUTS_ESTANDAR = [
  { id: "categoria", tipo: "select", label: "Categoría", default: "", opciones: [] },
  { id: "carga_horaria", tipo: "number", label: "Horas Semanales (Jornada)", default: 48 },
  { id: "antiguedad_años", tipo: "number", label: "Años de Antigüedad", default: 0 },
  { id: "horas_extras_50", tipo: "number", label: "Horas Extras al 50%", default: 0 },
  { id: "horas_extras_100", tipo: "number", label: "Horas Extras al 100%", default: 0 },
  { id: "afiliado_sindicato", tipo: "boolean", label: "Afiliado al Sindicato", default: false },
];

const round = (n) => Math.round(n * 1e6) / 1e6;

// El id de una retención o adicional sale de su nombre. La función vive en
// lib/texto.js porque la tabla de contribuciones la necesita igual.
const slug = (s) => slugDe(s, "retencion");

/** Documento de Firestore -> estado del formulario. */
export function convenioToForm(doc = {}) {
  const r = doc.reglas_calculo || {};
  return {
    id: doc.id || "",
    nombre: doc.nombre || "",
    cct: doc.cct || "",
    activo: doc.activo !== false,
    // Antes el sector se deducía buscando palabras dentro del id del convenio,
    // y fallaba en silencio: el id gastronómico es "gastronomicos-cct-389-04",
    // que no contiene ninguna de las palabras que se buscaban.
    sector: doc.sector || "privado",
    // Por defecto sí, que es lo que el motor venía haciendo.
    nrGeneraAdicionales: r.no_remunerativo_genera_adicionales !== false,
    // La jornada completa del convenio. Vacío = se usan los valores más
    // comunes (48 horas y divisor 200), que es lo que el motor hacía siempre
    // cuando estaban clavados adentro del código.
    jornadaHoras: r.jornada?.horas_semanales_completas ?? "",
    jornadaDivisor: r.jornada?.divisor_horas_mensuales ?? "",
    antiguedadModo: r.antiguedad?.modo === "tramos" ? "tramos" : "lineal",
    antiguedadBase: r.antiguedad?.aplica_sobre || "basico",
    antiguedadPct: r.antiguedad?.porcentaje_por_año != null ? round(r.antiguedad.porcentaje_por_año * 100) : "",
    antiguedadTramos: (r.antiguedad?.tramos || []).map((t) => ({
      desdeAños: t.desde_años ?? "",
      porcentajePct: t.porcentaje != null ? round(t.porcentaje * 100) : "",
    })),
    presentismoPct: r.presentismo?.porcentaje != null ? round(r.presentismo.porcentaje * 100) : "",
    presentismoBase: r.presentismo?.aplica_sobre || "basico_mas_antiguedad",
    // Los adicionales remunerativos son lo que hace funcionar a gastronómicos
    // (complemento de servicio, asistencia perfecta). Hasta ahora el formulario
    // ni los leía: se preservaban de casualidad y un convenio NUEVO no podía
    // tenerlos sin entrar a la consola de Firebase.
    adicionales: Object.entries(r.adicionales_remunerativos || {}).map(([id, ad]) => {
      // Un adicional puede colgarse de una pregunta que se le hace a la
      // persona, en vez de aplicarse siempre. La pregunta vive en
      // inputs_requeridos como cualquier otra.
      const pregunta = (doc.inputs_requeridos || []).find((i) => i.id === ad.depende_de);
      return {
        id,
        label: ad.label || id,
        valorPct: ad.porcentaje != null ? round(ad.porcentaje * 100) : "",
        base: ad.aplica_sobre || "basico",
        condicional: Boolean(ad.depende_de),
        pregunta: pregunta?.label || "",
        preguntaPorDefecto: pregunta ? pregunta.default !== false : true,
      };
    }),
    // Los adicionales por unidad (comida por día, kilómetros): el importe está en
    // la escala del período; acá va la regla y la pregunta que pide la cantidad.
    porUnidad: Object.entries(r.adicionales_por_unidad || {}).map(([id, u]) => {
      const pregunta = (doc.inputs_requeridos || []).find((i) => i.id === u.cantidad_de);
      // Y puede colgarse de una pregunta sí/no: la comida sólo si NO es de
      // larga distancia, los kilómetros sólo si lo es. Varios adicionales
      // pueden compartir la misma pregunta.
      const condicion = (doc.inputs_requeridos || []).find((i) => i.id === u.depende_de);
      return {
        id,
        label: u.label || id,
        valor: u.valor || "",
        unidad: u.unidad || "dia",
        naturaleza: u.naturaleza || "no_remunerativo",
        conIncidencia: u.con_incidencia === true,
        cantidadDe: u.cantidad_de || "",
        preguntaCantidad: pregunta?.label || "",
        cantidadPorDefecto: pregunta?.default ?? 0,
        condicional: Boolean(u.depende_de),
        dependeDe: u.depende_de || "",
        pregunta: condicion?.label || "",
        preguntaPorDefecto: condicion ? condicion.default !== false : true,
        cuando: u.cuando === false ? "no" : "si",
      };
    }),
    retenciones: Object.entries(r.retenciones_sindicales || {}).map(([id, ret]) => ({
      id,
      label: ret.label || id,
      tipoValor: ret.valor_fijo != null ? "fijo" : "porcentaje",
      valor: ret.valor_fijo != null ? ret.valor_fijo : round((ret.porcentaje ?? 0) * 100),
      base: ret.base || "remunerativo",
      condicion: ret.condicion || "siempre",
      // El id "obra_social_extra" era una clave mágica que el motor salteaba.
      // Ahora es un campo visible, para que no dependa de cómo se llame.
      reemplazaObraSocial: ret.reemplaza_obra_social === true || id === "obra_social_extra",
      rubro: ret.rubro || "sindical",
    })),
    // Del lado del empleador: la ART típica de la actividad y lo que el CCT le
    // manda pagar. Van a la sección del costo laboral del recibo.
    artAlicuotaTipicaPct: r.art?.alicuota_tipica != null ? round(r.art.alicuota_tipica * 100) : "",
    contribuciones: Object.entries(r.contribuciones_convenio || {}).map(([id, c]) => ({
      id,
      label: c.label || id,
      tipoValor: c.valor_fijo != null ? "fijo" : "porcentaje",
      valor: c.valor_fijo != null ? c.valor_fijo : round((c.porcentaje ?? 0) * 100),
      base: c.base || "remunerativo",
      rubro: c.rubro || "",
    })),
  };
}

/**
 * Revisa el formulario ANTES de convertirlo en documento.
 *
 * POR QUÉ: antes, un valor ilegible se convertía en 0 y seguía de largo. Y
 * como más abajo la regla sólo se escribe si el número es distinto de cero,
 * escribir "8,333%" con el signo de porcentaje BORRABA la regla de
 * presentismo del convenio: todos los recibos de ese gremio perdían 8,3% de
 * haberes sin un solo mensaje de error. Ahora eso se frena acá.
 *
 * @returns {Array<{campo: string, mensaje: string}>} vacío si está todo bien.
 */
export function validarFormConvenio(form = {}) {
  const errores = [];

  if (!String(form.id || "").trim()) {
    errores.push({ campo: "id", mensaje: "Falta el identificador del convenio." });
  }
  if (!String(form.nombre || "").trim()) {
    errores.push({ campo: "nombre", mensaje: "Falta el nombre del convenio." });
  }

  const revisarNumero = (campo, etiqueta, valor) => {
    const r = parsearNumero(valor);
    if (!r.ok) {
      errores.push({ campo, mensaje: `${etiqueta}: no se entiende el número (${r.motivo}).` });
      return null;
    }
    return r.valor;
  };

  const antiguedad = revisarNumero("antiguedadPct", "Antigüedad", form.antiguedadPct);
  if (antiguedad !== null && (antiguedad < 0 || antiguedad > 100)) {
    errores.push({ campo: "antiguedadPct", mensaje: "Antigüedad: el porcentaje tiene que estar entre 0 y 100." });
  }

  const presentismo = revisarNumero("presentismoPct", "Presentismo", form.presentismoPct);
  if (presentismo !== null && (presentismo < 0 || presentismo > 100)) {
    errores.push({ campo: "presentismoPct", mensaje: "Presentismo: el porcentaje tiene que estar entre 0 y 100." });
  }

  const jornadaHoras = revisarNumero("jornadaHoras", "Jornada completa", form.jornadaHoras);
  if (jornadaHoras !== null && (jornadaHoras <= 0 || jornadaHoras > 84)) {
    errores.push({
      campo: "jornadaHoras",
      mensaje: "Jornada completa: tienen que ser horas semanales entre 1 y 84.",
    });
  }

  const jornadaDivisor = revisarNumero("jornadaDivisor", "Divisor de horas", form.jornadaDivisor);
  if (jornadaDivisor !== null && (jornadaDivisor <= 0 || jornadaDivisor > 400)) {
    errores.push({
      campo: "jornadaDivisor",
      mensaje: "Divisor de horas mensuales: tiene que estar entre 1 y 400. Lo más común es 200.",
    });
  }

  if (form.antiguedadModo === "tramos") {
    const tramos = form.antiguedadTramos || [];
    if (tramos.length === 0) {
      errores.push({
        campo: "antiguedadTramos",
        mensaje: "Antigüedad por tramos: agregá al menos un tramo, o cambiá a porcentaje por año.",
      });
    }
    const desdes = [];
    tramos.forEach((t, i) => {
      const desde = revisarNumero(`antiguedadTramos[${i}].desdeAños`, `Tramo #${i + 1} (desde)`, t.desdeAños);
      const pct = revisarNumero(`antiguedadTramos[${i}].porcentajePct`, `Tramo #${i + 1} (porcentaje)`, t.porcentajePct);
      if (desde === null || pct === null) return;
      if (desde < 0) {
        errores.push({ campo: `antiguedadTramos[${i}].desdeAños`, mensaje: `Tramo #${i + 1}: los años no pueden ser negativos.` });
      }
      if (pct < 0 || pct > 100) {
        errores.push({ campo: `antiguedadTramos[${i}].porcentajePct`, mensaje: `Tramo #${i + 1}: el porcentaje tiene que estar entre 0 y 100.` });
      }
      if (desdes.includes(desde)) {
        errores.push({ campo: `antiguedadTramos[${i}].desdeAños`, mensaje: `Hay dos tramos que empiezan a los ${desde} años. Dejá uno solo.` });
      }
      desdes.push(desde);
    });
  }

  (form.adicionales || []).forEach((ad, i) => {
    const etiqueta = ad.label ? `Adicional "${ad.label}"` : `Adicional #${i + 1}`;
    if (!String(ad.label || "").trim()) {
      errores.push({ campo: `adicionales[${i}].label`, mensaje: `${etiqueta}: falta el nombre.` });
    }
    if (ad.condicional && !String(ad.pregunta || "").trim()) {
      errores.push({
        campo: `adicionales[${i}].pregunta`,
        mensaje: `${etiqueta}: si sólo corresponde a veces, escribí la pregunta que se le va a hacer a la persona.`,
      });
    }
    const v = revisarNumero(`adicionales[${i}].valorPct`, etiqueta, ad.valorPct);
    if (v === null) return;
    if (v < 0 || v > 100) {
      errores.push({ campo: `adicionales[${i}].valorPct`, mensaje: `${etiqueta}: el porcentaje tiene que estar entre 0 y 100.` });
    }
  });

  if (form.antiguedadBase && !BASES_ANTIGUEDAD.some((b) => b.value === form.antiguedadBase)) {
    errores.push({ campo: "antiguedadBase", mensaje: `Antigüedad: la base "${form.antiguedadBase}" no es una de las conocidas.` });
  }

  (form.porUnidad || []).forEach((u, i) => {
    const etiqueta = u.label ? `Adicional por unidad "${u.label}"` : `Adicional por unidad #${i + 1}`;
    if (!String(u.label || "").trim()) errores.push({ campo: `porUnidad[${i}].label`, mensaje: `${etiqueta}: falta el nombre.` });
    if (!String(u.valor || "").trim()) errores.push({ campo: `porUnidad[${i}].valor`, mensaje: `${etiqueta}: falta la clave del importe en la escala (por ejemplo "comida").` });
    if (!UNIDADES_POR_UNIDAD.some((x) => x.value === u.unidad)) errores.push({ campo: `porUnidad[${i}].unidad`, mensaje: `${etiqueta}: elegí la unidad.` });
    if (!NATURALEZAS.some((x) => x.value === u.naturaleza)) errores.push({ campo: `porUnidad[${i}].naturaleza`, mensaje: `${etiqueta}: elegí si es remunerativo o no.` });
    if (u.unidad !== "mes") {
      if (!String(u.cantidadDe || "").trim()) errores.push({ campo: `porUnidad[${i}].cantidadDe`, mensaje: `${etiqueta}: falta el identificador de la pregunta de la cantidad (por ejemplo "dias_trabajados").` });
      if (!String(u.preguntaCantidad || "").trim()) errores.push({ campo: `porUnidad[${i}].preguntaCantidad`, mensaje: `${etiqueta}: escribí la pregunta que pide la cantidad.` });
      const d = revisarNumero(`porUnidad[${i}].cantidadPorDefecto`, `${etiqueta} (cantidad por defecto)`, u.cantidadPorDefecto);
      if (d !== null && d < 0) errores.push({ campo: `porUnidad[${i}].cantidadPorDefecto`, mensaje: `${etiqueta}: la cantidad por defecto no puede ser negativa.` });
    }
    if (u.condicional) {
      if (!String(u.dependeDe || "").trim()) errores.push({ campo: `porUnidad[${i}].dependeDe`, mensaje: `${etiqueta}: falta el identificador de la pregunta sí/no (por ejemplo "larga_distancia").` });
      if (!String(u.pregunta || "").trim()) errores.push({ campo: `porUnidad[${i}].pregunta`, mensaje: `${etiqueta}: escribí la pregunta sí/no de la que depende.` });
    }
  });

  (form.retenciones || []).forEach((ret, i) => {
    const etiqueta = ret.label ? `Retención "${ret.label}"` : `Retención #${i + 1}`;
    const campo = `retenciones[${i}].valor`;
    if (!String(ret.label || "").trim()) {
      errores.push({ campo: `retenciones[${i}].label`, mensaje: `${etiqueta}: falta el nombre.` });
    }
    const v = revisarNumero(campo, etiqueta, ret.valor);
    if (v === null) return;
    if (v < 0) {
      errores.push({ campo, mensaje: `${etiqueta}: no puede ser negativa.` });
    }
    if (ret.tipoValor !== "fijo" && v > 100) {
      errores.push({ campo, mensaje: `${etiqueta}: un porcentaje no puede ser mayor a 100. Si querés un monto fijo en pesos, cambiá el tipo.` });
    }
  });

  const sinCargarArt = form.artAlicuotaTipicaPct === "" || form.artAlicuotaTipicaPct === null || form.artAlicuotaTipicaPct === undefined;
  if (!sinCargarArt) {
    const art = revisarNumero("artAlicuotaTipicaPct", "ART típica", form.artAlicuotaTipicaPct);
    if (art !== null && (art < 0 || art > 100)) {
      errores.push({ campo: "artAlicuotaTipicaPct", mensaje: "ART típica: el porcentaje tiene que estar entre 0 y 100." });
    }
  }

  (form.contribuciones || []).forEach((c, i) => {
    const etiqueta = c.label ? `Contribución patronal "${c.label}"` : `Contribución patronal #${i + 1}`;
    const campo = `contribuciones[${i}].valor`;
    if (!String(c.label || "").trim()) {
      errores.push({ campo: `contribuciones[${i}].label`, mensaje: `${etiqueta}: falta el nombre.` });
    }
    if (!RUBROS_DEL_COSTO_LABORAL.some((r) => r.id === c.rubro)) {
      errores.push({ campo: `contribuciones[${i}].rubro`, mensaje: `${etiqueta}: elegí a cuál de los siete rubros del decreto pertenece.` });
    }
    if (c.valor === "" || c.valor === null || c.valor === undefined) {
      errores.push({ campo, mensaje: `${etiqueta}: falta el valor.` });
      return;
    }
    const v = revisarNumero(campo, etiqueta, c.valor);
    if (v === null) return;
    if (v < 0) errores.push({ campo, mensaje: `${etiqueta}: no puede ser negativa.` });
    if (c.tipoValor !== "fijo" && v > 100) {
      errores.push({ campo, mensaje: `${etiqueta}: un porcentaje no puede ser mayor a 100. Si querés un monto fijo en pesos, cambiá el tipo.` });
    }
  });

  return errores;
}

/** Error con la lista de problemas del formulario, para mostrar en el panel. */
export class ErrorDeFormulario extends Error {
  constructor(errores) {
    super(errores.map((e) => e.mensaje).join("\n"));
    this.name = "ErrorDeFormulario";
    this.errores = errores;
  }
}

/**
 * Estado del formulario -> documento de Firestore.
 * @param form  estado del formulario
 * @param original  documento original (para preservar campos no manejados: inputs_requeridos, adicionales, etc.)
 */
export function formToConvenio(form, original = null) {
  const errores = validarFormConvenio(form);
  if (errores.length) throw new ErrorDeFormulario(errores);

  // Después de validar, leer() no puede fallar: todo llegó legible hasta acá.
  const leer = (v) => parsearNumero(v).valor ?? 0;

  // Reglas: partimos de las originales y sobreescribimos solo las manejadas.
  const reglas = { ...(original?.reglas_calculo || {}) };
  delete reglas.antiguedad;
  delete reglas.presentismo;
  delete reglas.retenciones_sindicales;
  delete reglas.adicionales_remunerativos;
  delete reglas.art;
  delete reglas.contribuciones_convenio;
  delete reglas.adicionales_por_unidad;

  delete reglas.no_remunerativo_genera_adicionales;
  // Se guarda sólo cuando es "no": el "sí" es el comportamiento por defecto y
  // escribirlo ensuciaría todos los convenios con un campo que no dice nada.
  if (form.nrGeneraAdicionales === false) reglas.no_remunerativo_genera_adicionales = false;

  delete reglas.jornada;
  // Vacio, nulo o ausente significan lo mismo: el convenio no lo declara y se
  // usan los valores por defecto. Distinguirlos hacia que un campo ausente se
  // guardara como CERO, y la proxima vez que se abriera el convenio el panel lo
  // rechazaba por estar fuera de rango.
  const sinCargar = (v) => v === "" || v === null || v === undefined;
  const horasJornada = sinCargar(form.jornadaHoras) ? null : leer(form.jornadaHoras);
  const divisorJornada = sinCargar(form.jornadaDivisor) ? null : leer(form.jornadaDivisor);
  if (horasJornada !== null || divisorJornada !== null) {
    reglas.jornada = {};
    if (horasJornada !== null) reglas.jornada.horas_semanales_completas = horasJornada;
    if (divisorJornada !== null) reglas.jornada.divisor_horas_mensuales = divisorJornada;
  }

  if (form.antiguedadModo === "tramos") {
    const tramos = (form.antiguedadTramos || [])
      .map((t) => ({ desde_años: leer(t.desdeAños), porcentaje: round(leer(t.porcentajePct) / 100) }))
      .sort((a, b) => a.desde_años - b.desde_años);
    if (tramos.length) {
      // Sin `aplica_sobre`: la antigüedad se calcula siempre sobre el básico y
      // el motor no lee ese campo. Guardarlo era exactamente el error que ya
      // costó dos veces -un campo que se escribe y nadie lee-, sólo que esta
      // vez el valor coincidía con lo que el motor hace, así que no molestaba.
      reglas.antiguedad = { modo: "tramos", tramos };
    }
  } else if (form.antiguedadPct !== "" && leer(form.antiguedadPct) !== 0) {
    reglas.antiguedad = { porcentaje_por_año: round(leer(form.antiguedadPct) / 100) };
  }
  // La base se escribe sólo cuando no es la de siempre (el básico).
  if (reglas.antiguedad && form.antiguedadBase === "basico_mas_adicionales") {
    reglas.antiguedad.aplica_sobre = "basico_mas_adicionales";
  }

  if (form.presentismoPct !== "" && leer(form.presentismoPct) !== 0) {
    reglas.presentismo = {
      aplica_sobre: form.presentismoBase || "basico_mas_antiguedad",
      porcentaje: round(leer(form.presentismoPct) / 100),
    };
  }

  // Las preguntas que nacen de un adicional condicional. Se regeneran enteras
  // en cada guardado: si el adicional cambia de nombre, su clave cambia, y una
  // pregunta vieja colgada de la clave anterior quedaría huérfana.
  const preguntasDeAdicionales = [];
  const usadosAdicionales = new Set();
  const adicionales = {};
  (form.adicionales || []).forEach((ad, i) => {
    const pct = round(leer(ad.valorPct) / 100);
    if (!pct) return;
    let key = ad.id || slug(ad.label);
    while (usadosAdicionales.has(key)) key = `${key}_${i}`;
    usadosAdicionales.add(key);
    adicionales[key] = {
      label: ad.label || key,
      porcentaje: pct,
      aplica_sobre: ad.base || "basico",
    };
    if (ad.condicional) {
      adicionales[key].depende_de = key;
      preguntasDeAdicionales.push({
        id: key,
        tipo: "boolean",
        label: ad.pregunta,
        default: ad.preguntaPorDefecto !== false,
        origen: "adicional",
      });
    }
  });
  if (Object.keys(adicionales).length) reglas.adicionales_remunerativos = adicionales;

  // Los adicionales por unidad, con la pregunta que pide la cantidad. Si dos
  // adicionales usan el mismo id (la comida y el viático comparten los días
  // trabajados), la pregunta se declara una sola vez.
  const preguntasPorUnidad = [];
  const porUnidad = {};
  const usadosPorUnidad = new Set();
  (form.porUnidad || []).forEach((u, i) => {
    let key = u.id || slug(u.label);
    while (usadosPorUnidad.has(key)) key = `${key}_${i}`;
    usadosPorUnidad.add(key);
    const item = { label: u.label || key, valor: slugDe(u.valor, key), unidad: u.unidad, naturaleza: u.naturaleza };
    if (u.naturaleza === "no_remunerativo") item.con_incidencia = u.conIncidencia === true;
    if (u.unidad !== "mes") {
      const idCantidad = slugDe(u.cantidadDe, `cantidad_${key}`);
      item.cantidad_de = idCantidad;
      if (!preguntasPorUnidad.some((q) => q.id === idCantidad)) {
        preguntasPorUnidad.push({
          id: idCantidad,
          tipo: "number",
          label: u.preguntaCantidad,
          default: leer(u.cantidadPorDefecto),
          origen: "por_unidad",
        });
      }
    }
    if (u.condicional) {
      const idCondicion = slugDe(u.dependeDe, key);
      item.depende_de = idCondicion;
      if (u.cuando === "no") item.cuando = false;
      if (!preguntasPorUnidad.some((q) => q.id === idCondicion)) {
        preguntasPorUnidad.push({
          id: idCondicion,
          tipo: "boolean",
          label: u.pregunta,
          default: u.preguntaPorDefecto !== false,
          origen: "por_unidad",
        });
      }
    }
    porUnidad[key] = item;
  });
  if (Object.keys(porUnidad).length) reglas.adicionales_por_unidad = porUnidad;

  const usados = new Set();
  const retenciones = {};
  (form.retenciones || []).forEach((ret, i) => {
    let key = ret.id || slug(ret.label);
    while (usados.has(key)) key = `${key}_${i}`;
    usados.add(key);
    const item = { label: ret.label || key };
    if (ret.condicion && ret.condicion !== "siempre") item.condicion = ret.condicion;
    if (ret.reemplazaObraSocial) item.reemplaza_obra_social = true;
    // El rubro se guarda sólo cuando no es el de siempre.
    if (ret.rubro && ret.rubro !== "sindical") item.rubro = ret.rubro;
    if (ret.tipoValor === "fijo") {
      // El monto fijo no usa base (el motor la ignora); no la guardamos.
      item.valor_fijo = leer(ret.valor);
    } else {
      item.base = ret.base || "remunerativo";
      item.porcentaje = round(leer(ret.valor) / 100);
    }
    retenciones[key] = item;
  });
  if (Object.keys(retenciones).length) reglas.retenciones_sindicales = retenciones;

  // Del lado del empleador. La ART típica se guarda en fracción, como todo.
  if (!(form.artAlicuotaTipicaPct === "" || form.artAlicuotaTipicaPct === null || form.artAlicuotaTipicaPct === undefined)) {
    reglas.art = { alicuota_tipica: round(leer(form.artAlicuotaTipicaPct) / 100) };
  }
  const usadosContribuciones = new Set();
  const contribuciones = {};
  (form.contribuciones || []).forEach((c, i) => {
    let key = c.id || slug(c.label);
    while (usadosContribuciones.has(key)) key = `${key}_${i}`;
    usadosContribuciones.add(key);
    const item = { label: c.label || key, rubro: c.rubro };
    if (c.tipoValor === "fijo") {
      item.valor_fijo = leer(c.valor);
    } else {
      item.base = c.base || "remunerativo";
      item.porcentaje = round(leer(c.valor) / 100);
    }
    contribuciones[key] = item;
  });
  if (Object.keys(contribuciones).length) reglas.contribuciones_convenio = contribuciones;

  // Inputs: preservar los del original; si es nuevo, usar los estándar.
  let inputs = original?.inputs_requeridos
    ? original.inputs_requeridos.map((i) => ({ ...i }))
    : INPUTS_ESTANDAR.map((i) => ({ ...i }));

  // Si alguna retención depende de la afiliación, garantizar el input booleano.
  const necesitaAfiliacion = Object.values(retenciones).some(
    (r) => r.condicion === "solo_afiliado" || r.condicion === "solo_no_afiliado"
  );
  if (necesitaAfiliacion && !inputs.some((i) => i.id === "afiliado_sindicato")) {
    inputs.push({ id: "afiliado_sindicato", tipo: "boolean", label: "Afiliado al Sindicato", default: false });
  }

  // Se sacan las preguntas que generó una versión anterior de los adicionales
  // y se ponen las de ahora. Así una pregunta deja de existir en cuanto el
  // adicional deja de ser condicional, sin quedar dando vueltas en la pantalla
  // sin afectar a nada, que es de las cosas más confusas que puede ver alguien.
  inputs = inputs.filter((i) => i.origen !== "adicional" && i.origen !== "por_unidad");
  inputs.push(...preguntasDeAdicionales, ...preguntasPorUnidad);

  return {
    ...(original || {}),
    id: form.id,
    nombre: form.nombre,
    cct: form.cct,
    activo: !!form.activo,
    sector: form.sector || "privado",
    reglas_calculo: reglas,
    inputs_requeridos: inputs,
  };
}
