// lib/vigia/borradores.js
// La forma de un "borrador": lo que el vigía (scripts/vigia.mjs) deja preparado
// en Firestore, colección `borradores`, para que el dueño lo revise y lo
// publique desde la Bandeja de /admin.
//
// POR QUÉ EXISTE: el vigía nunca publica nada. Prepara documentos con la forma
// EXACTA de lo que el panel va a escribir (una escala, una tabla de
// contribuciones, una tabla de Ganancias, un acuerdo) en el campo `datos`, y
// alrededor de eso anota de dónde salió, qué advertencias tiene y en qué estado
// está. El panel abre el borrador, precarga la pestaña que corresponde y el
// dueño aprieta el botón de publicar de siempre.
//
// Es puro y no sabe nada de Firebase: lo comparten el script y el panel, y lo
// prueban los tests sin red.
//
// Ids deterministas: "<tipo>--<convenioId|nacional>--<periodo|fecha>", más
// "--revision-<fecha>" cuando corrige un mes que ya está publicado. Así una
// segunda corrida del vigía no duplica un borrador: lo encuentra.

export const TIPOS = ["escala", "contribuciones", "ganancias", "acuerdo"];
export const ESTADOS = ["pendiente", "requiere_revision", "publicado", "descartado"];
/** Los estados en los que el vigía todavía puede tocar el borrador. */
export const ESTADOS_ABIERTOS = ["pendiente", "requiere_revision"];
/** De dónde salieron los números. */
export const ORIGENES = ["circular", "tramo", "esqueleto", "boletin", "pdf"];

const PESTAÑA_DE_TIPO = { escala: "escalas", contribuciones: "contribuciones", ganancias: "ganancias", acuerdo: "acuerdos" };
const ES_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
const ES_FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** La pestaña de /admin que publica cada tipo de borrador. */
export function pestañaDe(tipo) {
  const p = PESTAÑA_DE_TIPO[tipo];
  if (!p) throw new Error(`No hay pestaña para un borrador de tipo "${tipo}".`);
  return p;
}

/**
 * El id del documento en `borradores`. Las contribuciones y Ganancias son
 * nacionales (sin convenio); los acuerdos llevan fecha en vez de período.
 */
export function idDeBorrador({ tipo, convenioId = null, periodo = null, fecha = null, revision = null }) {
  if (!TIPOS.includes(tipo)) throw new Error(`Tipo de borrador desconocido: "${tipo}".`);
  const cuando = tipo === "acuerdo" ? fecha : periodo;
  if (!cuando) throw new Error(`Un borrador de ${tipo} necesita ${tipo === "acuerdo" ? "fecha" : "período"}.`);
  let id = [tipo, convenioId || "nacional", cuando].join("--");
  if (revision) id += `--revision-${revision}`;
  if (!/^[a-z0-9][a-z0-9_.-]*$/i.test(id)) throw new Error(`El id de borrador "${id}" tiene caracteres que Firestore no acepta en una URL.`);
  return id;
}

export function estaAbierto(borrador) {
  return Boolean(borrador) && ESTADOS_ABIERTOS.includes(borrador.estado);
}

/** ¿Algún control dio mal? Un control es `true`, o un objeto con `ok`. */
export function controlesEnFalso(controles) {
  return Object.entries(controles || {})
    .filter(([, v]) => (v && typeof v === "object" ? v.ok === false : v === false))
    .map(([k]) => k);
}

/**
 * Arma un borrador nuevo. El estado nace en `pendiente`, o en
 * `requiere_revision` si algún control dio mal o si quien lo arma lo pide.
 */
export function nuevoBorrador({
  tipo, convenioId = null, periodo = null, fecha = null, datos, resumen, fuente, origen,
  advertencias = [], controles = null, archivos = [], partes = null, revisa = null, provisorio = false,
  csv = null, baseComparacion = null, requiereRevision = false, corridaId, ahora = new Date().toISOString(),
}) {
  const id = idDeBorrador({ tipo, convenioId, periodo, fecha, revision: revisa ? ahora.slice(0, 10) : null });
  const estado = requiereRevision || controlesEnFalso(controles).length ? "requiere_revision" : "pendiente";
  return {
    id,
    tipo, convenioId, periodo, fecha: tipo === "acuerdo" ? fecha : null,
    estado,
    revisa, provisorio: Boolean(provisorio),
    resumen, advertencias: [...advertencias],
    fuente, archivos: [...archivos],
    datos, csv, origen, baseComparacion, partes, controles,
    corridaId, creadoEl: ahora, actualizadoEl: ahora,
    publicadoEl: null, publicadoComo: null, descartadoEl: null,
  };
}

const esNumero = (n) => typeof n === "number" && Number.isFinite(n);

/** Los errores de forma de un borrador; vacío si está bien. */
export function validarBorrador(b) {
  const errores = [];
  if (!b || typeof b !== "object") return ["El borrador no es un objeto."];
  if (!TIPOS.includes(b.tipo)) errores.push(`Tipo desconocido: "${b.tipo}".`);
  if (!ESTADOS.includes(b.estado)) errores.push(`Estado desconocido: "${b.estado}".`);
  if ((b.tipo === "escala" || b.tipo === "acuerdo") && !b.convenioId) errores.push("Falta el convenio.");
  if (b.tipo === "acuerdo") {
    if (!ES_FECHA.test(String(b.fecha || ""))) errores.push("La fecha del acuerdo tiene que ser AAAA-MM-DD.");
  } else if (!ES_PERIODO.test(String(b.periodo || ""))) {
    errores.push("El período tiene que ser AAAA-MM.");
  }
  if (!b.datos || typeof b.datos !== "object" || !Object.keys(b.datos).length) errores.push("Faltan los datos (la forma del documento final).");
  if (typeof b.resumen !== "string" || !b.resumen.trim()) errores.push("Falta el resumen.");
  if (!b.fuente || typeof b.fuente.url !== "string" || !b.fuente.url) errores.push("Falta la fuente (url).");
  if (!b.corridaId) errores.push("Falta la corrida que lo creó.");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(String(b.creadoEl || ""))) errores.push("creadoEl tiene que ser una fecha ISO.");
  if (!Array.isArray(b.advertencias)) errores.push("advertencias tiene que ser una lista.");
  if (b.origen != null && !ORIGENES.includes(b.origen)) errores.push(`Origen desconocido: "${b.origen}".`);
  if (errores.length) return errores;

  const d = b.datos;
  if (b.tipo === "escala") {
    const cats = d.categorias && typeof d.categorias === "object" ? Object.entries(d.categorias) : [];
    if (!cats.length) errores.push("La escala no tiene categorías.");
    for (const [nombre, v] of cats) {
      if (!v || !esNumero(v.basico)) errores.push(`"${nombre}": el básico no es un número.`);
      else if (v.no_remunerativo != null && !esNumero(v.no_remunerativo)) errores.push(`"${nombre}": el no remunerativo no es un número.`);
      else if (v.no_remunerativo_sin_incidencia != null && !esNumero(v.no_remunerativo_sin_incidencia)) errores.push(`"${nombre}": la suma sin incidencia no es un número.`);
    }
    if (typeof d.mes_vigencia !== "string" || !d.mes_vigencia.trim()) errores.push("La escala no tiene mes_vigencia.");
    for (const [k, v] of Object.entries(d.valores_del_periodo || {})) {
      if (!esNumero(v)) errores.push(`Valor del período "${k}": no es un número.`);
    }
  } else if (b.tipo === "contribuciones") {
    const bases = d.bases_art9 || {};
    if (!esNumero(bases.minima) || !esNumero(bases.maxima)) errores.push("Faltan las bases del art. 9.");
    else if (bases.minima >= bases.maxima) errores.push("La base mínima tiene que ser menor que la máxima.");
    if (!Array.isArray(d.universales)) errores.push("Faltan las sumas fijas universales (FFEP, SCVO).");
    if (!d.regimenes || typeof d.regimenes !== "object" || !Object.keys(d.regimenes).length) errores.push("Faltan los regímenes.");
    if (typeof d.vigencia !== "string" || !d.vigencia.trim()) errores.push("Falta la vigencia.");
  } else if (b.tipo === "ganancias") {
    if (!d.deducciones_anuales || typeof d.deducciones_anuales !== "object") errores.push("Faltan las deducciones anuales.");
    if (!Array.isArray(d.escala_anual) || !d.escala_anual.length) errores.push("Falta la escala anual.");
  } else if (b.tipo === "acuerdo") {
    if (!d.convenioId) errores.push("El acuerdo no tiene convenio.");
    if (!ES_FECHA.test(String(d.fecha || ""))) errores.push("El acuerdo no tiene fecha AAAA-MM-DD.");
    if (typeof d.titulo !== "string" || !d.titulo.trim()) errores.push("El acuerdo no tiene título.");
    if (!d.archivoUrl && !d.fuenteUrl) errores.push("El acuerdo no tiene archivo ni link a la fuente.");
  }
  return errores;
}

const NOMBRE_TIPO = { escala: "Escala", contribuciones: "Contribuciones", ganancias: "Ganancias", acuerdo: "Acuerdo" };

/** Una línea para Telegram o para la lista de la Bandeja. */
export function lineaDe(b, nombreConvenio = null) {
  const partes = [NOMBRE_TIPO[b.tipo] || b.tipo];
  if (nombreConvenio || b.convenioId) partes.push(nombreConvenio || b.convenioId);
  if (b.periodo) partes.push(b.periodo);
  if (b.fecha && b.tipo === "acuerdo") partes.push(b.fecha);
  let texto = `${partes.join(" · ")}: ${b.resumen || ""}`.trim();
  const malos = controlesEnFalso(b.controles);
  if (b.revisa) texto += " [REVISIÓN de un mes ya publicado]";
  if (b.estado === "requiere_revision") texto += ` [requiere revisión${malos.length ? `: ${malos.join(", ")}` : ""}]`;
  if (b.advertencias && b.advertencias.length) texto += ` (${b.advertencias.length} advertencia${b.advertencias.length === 1 ? "" : "s"})`;
  return texto;
}
