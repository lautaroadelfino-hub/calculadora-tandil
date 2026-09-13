// lib/convenioForm.js
// Conversión entre el documento de convenio (Firestore) y el estado del
// formulario del panel admin. Diseñada para ser LOSSLESS en todo lo que el
// motor de liquidación lee: preserva cualquier regla no manejada por el form
// (p. ej. adicionales_remunerativos) y reconstruye reglas_calculo idéntico.

import { parsearNumero } from "./numeros.js";
import { POR_DEFECTO } from "./vocabularioConvenios.js";

export const BASES = [
  { value: "remunerativo", label: "Remunerativo (bruto)" },
  { value: "remunerativo_mas_no_remunerativo", label: "Remunerativo + No remunerativo" },
  { value: "no_remunerativo", label: "No remunerativo" },
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

// Rango de acentos combinados (tras normalize NFD). Se arma con escapes ASCII
// para no meter caracteres combinados crudos en el código fuente.
const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");
const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "retencion";

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

  const usados = new Set();
  const retenciones = {};
  (form.retenciones || []).forEach((ret, i) => {
    let key = ret.id || slug(ret.label);
    while (usados.has(key)) key = `${key}_${i}`;
    usados.add(key);
    const item = { label: ret.label || key };
    if (ret.condicion && ret.condicion !== "siempre") item.condicion = ret.condicion;
    if (ret.reemplazaObraSocial) item.reemplaza_obra_social = true;
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
  inputs = inputs.filter((i) => i.origen !== "adicional");
  inputs.push(...preguntasDeAdicionales);

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
