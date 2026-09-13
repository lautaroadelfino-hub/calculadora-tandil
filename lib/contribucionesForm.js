// lib/contribucionesForm.js
// Conversión entre el documento de parámetros de contribuciones (Firestore,
// colección `parametros_contribuciones`, un documento por período) y el estado
// del formulario de la pestaña Contribuciones del panel. Mismo papel que
// convenioForm.js para los convenios: la pantalla queda tonta y esto se testea.
//
// UNIDADES: en el documento las alícuotas son FRACCIONES (0.1077); en el
// formulario son porcentajes (10,77). La conversión pasa por acá y por ningún
// otro lado. El panel viejo del empleador guardaba puntos (12.35) mientras el
// motor usa fracciones (0.11): tener las dos convenciones en el mismo proyecto
// es la forma más rápida de multiplicar o dividir por 100 sin querer.
//
// LA FORMA DEL DOCUMENTO está en data/contribuciones.seed.json, con sus fuentes.

import { parsearNumero } from "./numeros.js";
import { RUBROS_DEL_COSTO_LABORAL } from "./vocabularioConvenios.js";
import { ErrorDeFormulario } from "./convenioForm.js";
import { slug } from "./texto.js";

const round = (n) => Math.round(n * 1e6) / 1e6;
const RUBROS_VALIDOS = RUBROS_DEL_COSTO_LABORAL.map((r) => r.id);

export const UNIDADES = [
  { value: "porcentaje", label: "Porcentaje de la base" },
  { value: "suma_fija", label: "Suma fija por trabajador" },
];

/**
 * Sobre qué se aplica una contribución porcentual. Son las mismas dos palabras
 * que ya usa `retenciones_sindicales.base` en los convenios. Nacional Sistema
 * tiene 21 casilleros por concepto para lo mismo, pero sus fórmulas usan sólo
 * estas dos bases: con dos se reproduce su recibo, con 21 habría que declarar
 * 21 casillas por concepto para un caso que todavía no existe.
 */
export const BASES_DE_CONTRIBUCION = [
  { value: "remunerativo", label: "Remunerativo" },
  { value: "remunerativo_mas_no_remunerativo", label: "Remunerativo + No remunerativo" },
];

/**
 * Los criterios contables que viven en la tabla y no en el código, para que se
 * puedan cambiar desde /admin sin desplegar. Los tres arrancan ENCENDIDOS por
 * decisión del dueño (septiembre de 2026). Si el documento no los trae, valen
 * igual como encendidos.
 */
export const CRITERIOS_CONTABLES = [
  {
    key: "tope_art9_en_aportes",
    label: "Aplicar los topes del art. 9 (Ley 24.241) a los aportes del trabajador",
    ayuda:
      "Jubilación, PAMI y obra social se calculan sobre una base que no baja del mínimo ni " +
      "supera el máximo del mes. Mueve la retención en jornadas muy reducidas (el mínimo la " +
      "sube) y en sueldos altos (el máximo la baja). Los sueldos de convenio de jornada " +
      "completa quedan igual.",
  },
  {
    key: "obra_social_trabajador_prorratea_jornada",
    label: "La obra social del trabajador (3%) se calcula sobre la remuneración de SU jornada",
    ayuda:
      "Prorrateada por las horas, igual que jubilación y PAMI y que Nacional Sistema. Apagado, " +
      "se calcula sobre la remuneración de jornada completa, que es lo que el motor hacía " +
      "hasta septiembre de 2026 sin que estuviera escrito en ningún lado. Sólo cambia las " +
      "jornadas parciales.",
  },
  {
    key: "sac_integra_base_contribuciones",
    label: "Cuando el recibo incluye SAC, el SAC también paga contribuciones patronales",
    ayuda: "Apagado, el SAC se muestra en el recibo pero no entra en la base del empleador.",
  },
];

const conceptoToForm = (c = {}) => ({
  id: c.id || "",
  label: c.label || c.id || "",
  unidad: c.unidad === "suma_fija" ? "suma_fija" : "porcentaje",
  alicuotaPct: c.alicuota != null ? round(c.alicuota * 100) : "",
  monto: c.monto ?? "",
  base: c.base || "remunerativo",
  aplicaDetraccion: c.aplica_detraccion === true,
  rubro: c.rubro || "",
});

/** Un concepto porcentual nuevo, vacío, para el botón "+ Agregar concepto". */
export const conceptoVacio = () => conceptoToForm({});
/** Una suma fija universal nueva, vacía. */
export const universalVacio = () => conceptoToForm({ unidad: "suma_fija" });
/** Un régimen nuevo, vacío. */
export const regimenVacio = () => ({ id: "", label: "", predeterminado: false, conceptos: [] });

/** Documento de Firestore -> estado del formulario. */
export function tablaToForm(doc = {}) {
  return {
    vigencia: doc.vigencia || "",
    detraccion: {
      monto: doc.detraccion?.monto ?? "",
      norma: doc.detraccion?.norma || "",
      prorrateaPorJornada: doc.detraccion?.prorratea_por_jornada !== false,
    },
    basesArt9: {
      minima: doc.bases_art9?.minima ?? "",
      maxima: doc.bases_art9?.maxima ?? "",
    },
    regimenes: Object.entries(doc.regimenes || {}).map(([id, r]) => ({
      id,
      label: r.label || id,
      predeterminado: r.predeterminado === true,
      conceptos: (r.conceptos || []).map(conceptoToForm),
    })),
    universales: (doc.universales || []).map((u) => conceptoToForm({ ...u, unidad: "suma_fija" })),
    criterios: CRITERIOS_CONTABLES.reduce((acc, c) => {
      acc[c.key] = doc.criterios_contables?.[c.key] !== false;
      return acc;
    }, {}),
  };
}

/**
 * Revisa el formulario ANTES de convertirlo en documento. Un número ilegible
 * frena acá: guardarlo como cero sería cobrar cero de SIPA sin un solo aviso.
 * @returns {Array<{campo: string, mensaje: string}>} vacío si está todo bien.
 */
export function validarFormContribuciones(form = {}) {
  const errores = [];
  const vacio = (v) => v === "" || v === null || v === undefined;

  const numero = (campo, etiqueta, valor, { min = 0, max = null } = {}) => {
    if (vacio(valor)) {
      errores.push({ campo, mensaje: `${etiqueta}: falta el número.` });
      return null;
    }
    const r = parsearNumero(valor);
    if (!r.ok) {
      errores.push({ campo, mensaje: `${etiqueta}: no se entiende el número (${r.motivo}).` });
      return null;
    }
    if (r.valor < min || (max !== null && r.valor > max)) {
      const rango = max !== null ? `entre ${min} y ${max}` : `mayor o igual a ${min}`;
      errores.push({ campo, mensaje: `${etiqueta}: tiene que ser ${rango}.` });
      return null;
    }
    return r.valor;
  };

  numero("detraccion.monto", "Detracción", form.detraccion?.monto);

  const minima = numero("basesArt9.minima", "Base mínima del art. 9", form.basesArt9?.minima);
  const maxima = numero("basesArt9.maxima", "Base máxima del art. 9", form.basesArt9?.maxima);
  if (minima !== null && maxima !== null && maxima <= minima) {
    errores.push({ campo: "basesArt9.maxima", mensaje: "Base máxima del art. 9: tiene que ser mayor que la mínima." });
  }

  const revisarConcepto = (c, campo, etiqueta) => {
    if (!String(c.label || "").trim()) errores.push({ campo: `${campo}.label`, mensaje: `${etiqueta}: falta el nombre.` });
    if (c.unidad === "suma_fija") {
      numero(`${campo}.monto`, `${etiqueta} (monto)`, c.monto);
    } else {
      numero(`${campo}.alicuotaPct`, `${etiqueta} (alícuota)`, c.alicuotaPct, { min: 0, max: 100 });
      if (!BASES_DE_CONTRIBUCION.some((b) => b.value === c.base)) {
        errores.push({ campo: `${campo}.base`, mensaje: `${etiqueta}: la base "${c.base}" no es una de las conocidas.` });
      }
    }
    if (!RUBROS_VALIDOS.includes(c.rubro)) {
      errores.push({ campo: `${campo}.rubro`, mensaje: `${etiqueta}: elegí a cuál de los siete rubros del decreto pertenece.` });
    }
  };

  const regimenes = form.regimenes || [];
  if (regimenes.length === 0) {
    errores.push({ campo: "regimenes", mensaje: "Cargá al menos un régimen de contribuciones." });
  }
  const predeterminados = regimenes.filter((r) => r.predeterminado === true).length;
  if (regimenes.length > 0 && predeterminados !== 1) {
    errores.push({
      campo: "regimenes",
      mensaje:
        predeterminados === 0
          ? "Marcá un régimen como predeterminado: es el que se usa cuando la persona no elige."
          : "Hay más de un régimen predeterminado. Dejá uno solo.",
    });
  }
  const idsVistos = new Set();
  regimenes.forEach((r, i) => {
    const etiqueta = r.label ? `Régimen "${r.label}"` : `Régimen #${i + 1}`;
    if (!String(r.label || "").trim()) errores.push({ campo: `regimenes[${i}].label`, mensaje: `${etiqueta}: falta el nombre.` });
    const id = r.id || slug(r.label, "");
    if (id && idsVistos.has(id)) errores.push({ campo: `regimenes[${i}].id`, mensaje: `${etiqueta}: hay dos regímenes con el identificador "${id}".` });
    if (id) idsVistos.add(id);
    if (!(r.conceptos || []).length) {
      errores.push({ campo: `regimenes[${i}].conceptos`, mensaje: `${etiqueta}: no tiene ningún concepto cargado.` });
    }
    (r.conceptos || []).forEach((c, j) =>
      revisarConcepto(c, `regimenes[${i}].conceptos[${j}]`, `${etiqueta}, concepto ${c.label ? `"${c.label}"` : `#${j + 1}`}`)
    );
  });

  (form.universales || []).forEach((u, i) =>
    revisarConcepto({ ...u, unidad: "suma_fija" }, `universales[${i}]`, `Suma fija ${u.label ? `"${u.label}"` : `#${i + 1}`}`)
  );

  return errores;
}

/** Estado del formulario -> documento de Firestore. Frena si hay errores. */
export function formToTabla(form) {
  const errores = validarFormContribuciones(form);
  if (errores.length) throw new ErrorDeFormulario(errores);

  // Después de validar, leer() no puede fallar.
  const leer = (v) => parsearNumero(v).valor ?? 0;

  const idUnico = (propuesto, usados) => {
    let id = propuesto;
    let n = 2;
    while (usados.has(id)) id = `${propuesto}_${n++}`;
    usados.add(id);
    return id;
  };

  const concepto = (c, usados) => {
    const id = idUnico(c.id || slug(c.label, "concepto"), usados);
    const unidad = c.unidad === "suma_fija" ? "suma_fija" : "porcentaje";
    if (unidad === "suma_fija") {
      return { id, label: c.label, unidad, monto: leer(c.monto), rubro: c.rubro };
    }
    return {
      id,
      label: c.label,
      unidad,
      alicuota: round(leer(c.alicuotaPct) / 100),
      base: c.base,
      aplica_detraccion: c.aplicaDetraccion === true,
      rubro: c.rubro,
    };
  };

  const regimenes = {};
  const idsRegimen = new Set();
  for (const r of form.regimenes || []) {
    const id = idUnico(r.id || slug(r.label, "regimen"), idsRegimen);
    const usados = new Set();
    regimenes[id] = {
      label: r.label,
      predeterminado: r.predeterminado === true,
      conceptos: (r.conceptos || []).map((c) => concepto(c, usados)),
    };
  }

  const usadosUniversales = new Set();
  return {
    vigencia: form.vigencia || "",
    detraccion: {
      monto: leer(form.detraccion?.monto),
      norma: form.detraccion?.norma || "",
      prorratea_por_jornada: form.detraccion?.prorrateaPorJornada !== false,
    },
    bases_art9: {
      minima: leer(form.basesArt9?.minima),
      maxima: leer(form.basesArt9?.maxima),
    },
    regimenes,
    universales: (form.universales || []).map((u) => concepto({ ...u, unidad: "suma_fija" }, usadosUniversales)),
    criterios_contables: CRITERIOS_CONTABLES.reduce((acc, c) => {
      acc[c.key] = form.criterios?.[c.key] !== false;
      return acc;
    }, {}),
  };
}

/** El id del régimen que se usa cuando la persona no elige, o null si la tabla no lo marca. */
export function regimenPredeterminado(tabla) {
  const entrada = Object.entries(tabla?.regimenes || {}).find(([, r]) => r.predeterminado === true);
  return entrada ? entrada[0] : null;
}
