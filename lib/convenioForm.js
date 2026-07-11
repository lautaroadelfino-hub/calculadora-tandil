// lib/convenioForm.js
// Conversión entre el documento de convenio (Firestore) y el estado del
// formulario del panel admin. Diseñada para ser LOSSLESS en todo lo que el
// motor de liquidación lee: preserva cualquier regla no manejada por el form
// (p. ej. adicionales_remunerativos) y reconstruye reglas_calculo idéntico.

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
    antiguedadPct: r.antiguedad?.porcentaje_por_año != null ? round(r.antiguedad.porcentaje_por_año * 100) : "",
    presentismoPct: r.presentismo?.porcentaje != null ? round(r.presentismo.porcentaje * 100) : "",
    retenciones: Object.entries(r.retenciones_sindicales || {}).map(([id, ret]) => ({
      id,
      label: ret.label || id,
      tipoValor: ret.valor_fijo != null ? "fijo" : "porcentaje",
      valor: ret.valor_fijo != null ? ret.valor_fijo : round((ret.porcentaje ?? 0) * 100),
      base: ret.base || "remunerativo",
      condicion: ret.condicion || "siempre",
    })),
  };
}

/**
 * Estado del formulario -> documento de Firestore.
 * @param form  estado del formulario
 * @param original  documento original (para preservar campos no manejados: inputs_requeridos, adicionales, etc.)
 */
export function formToConvenio(form, original = null) {
  const num = (v) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  // Reglas: partimos de las originales y sobreescribimos solo las manejadas.
  const reglas = { ...(original?.reglas_calculo || {}) };
  delete reglas.antiguedad;
  delete reglas.presentismo;
  delete reglas.retenciones_sindicales;

  if (form.antiguedadPct !== "" && num(form.antiguedadPct) !== 0) {
    reglas.antiguedad = { aplica_sobre: "basico", porcentaje_por_año: round(num(form.antiguedadPct) / 100) };
  }
  if (form.presentismoPct !== "" && num(form.presentismoPct) !== 0) {
    reglas.presentismo = { aplica_sobre: "basico_mas_antiguedad", porcentaje: round(num(form.presentismoPct) / 100) };
  }

  const usados = new Set();
  const retenciones = {};
  (form.retenciones || []).forEach((ret, i) => {
    let key = ret.id || slug(ret.label);
    while (usados.has(key)) key = `${key}_${i}`;
    usados.add(key);
    const item = { label: ret.label || key };
    if (ret.condicion && ret.condicion !== "siempre") item.condicion = ret.condicion;
    if (ret.tipoValor === "fijo") {
      // El monto fijo no usa base (el motor la ignora); no la guardamos.
      item.valor_fijo = num(ret.valor);
    } else {
      item.base = ret.base || "remunerativo";
      item.porcentaje = round(num(ret.valor) / 100);
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

  return {
    ...(original || {}),
    id: form.id,
    nombre: form.nombre,
    cct: form.cct,
    activo: !!form.activo,
    reglas_calculo: reglas,
    inputs_requeridos: inputs,
  };
}
