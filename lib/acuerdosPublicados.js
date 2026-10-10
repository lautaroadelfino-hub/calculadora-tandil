// lib/acuerdosPublicados.js
// Los acuerdos paritarios y escalas que cierra cada sindicato, con su archivo.
//
// POR QUÉ EXISTE: hasta octubre de 2026 el sitio sólo simulaba recibos. Los
// acuerdos se anunciaban como una novedad de texto ("Cargado acuerdo octubre
// Empleados de Comercio") sin el documento. Acá vive la regla de qué acuerdos
// se muestran y en qué orden, la validación de lo que carga el dueño desde
// /admin y el nombre con el que se guarda cada archivo en Storage. Es puro
// (sin Firebase) para que corra en el servidor, en el navegador y en los tests.
//
// Documento de la colección "acuerdos":
//   { convenioId, fecha: "AAAA-MM-DD", titulo, tipo, vigencia|null,
//     archivoUrl|null, archivoNombre|null, archivoTipo|null, archivoRuta|null,
//     fuenteUrl|null, published, creadoEl }
// `archivoRuta` es la ruta dentro de Storage: hace falta para borrar el archivo
// cuando se borra el acuerdo (sacarla de la URL de descarga es frágil).

import { slug } from "./texto.js";

/** Lo que las páginas públicas piden de cada acuerdo a la API REST (sin archivoRuta ni creadoEl). */
export const CAMPOS_DE_ACUERDO = [
  "convenioId", "fecha", "titulo", "tipo", "vigencia",
  "archivoUrl", "archivoNombre", "archivoTipo", "fuenteUrl", "published",
];

export const TIPOS_DE_ACUERDO = [
  { value: "escala", label: "Escala salarial" },
  { value: "acuerdo", label: "Acuerdo paritario" },
  { value: "homologacion", label: "Homologación" },
  { value: "otro", label: "Otro" },
];

export function etiquetaDeTipo(tipo) {
  const encontrado = TIPOS_DE_ACUERDO.find((t) => t.value === tipo);
  return (encontrado || TIPOS_DE_ACUERDO[TIPOS_DE_ACUERDO.length - 1]).label;
}

// Los sindicatos publican en lo que tienen a mano: Camioneros sube las escalas
// como JPG y una cartilla en Word, no en PDF. Se aceptan esos formatos para
// que el dueño pueda cargar el documento tal como salió, aunque la descarga
// ideal sea el PDF.
export const FORMATOS_PERMITIDOS = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const EXTENSION_A_TIPO = Object.fromEntries(
  Object.entries(FORMATOS_PERMITIDOS).map(([tipo, ext]) => [ext, tipo])
);
EXTENSION_A_TIPO.jpeg = "image/jpeg";

export const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

/** "PDF", "JPG", … para mostrar al lado de "Descargar". Vacío si no se conoce. */
export function etiquetaDeFormato(contentType) {
  const ext = FORMATOS_PERMITIDOS[contentType];
  return ext ? ext.toUpperCase() : "";
}

/**
 * El tipo MIME de un archivo elegido en el navegador. Windows a veces entrega
 * `type` vacío para .doc; en ese caso se deduce por la extensión del nombre.
 */
export function tipoDeArchivo({ type, name } = {}) {
  if (type && FORMATOS_PERMITIDOS[type]) return type;
  const ext = String(name || "").toLowerCase().split(".").pop();
  return EXTENSION_A_TIPO[ext] || type || "";
}

/** Un mensaje de error en castellano, o null si el archivo se puede subir. */
export function validarArchivo(archivo) {
  if (!archivo) return "Elegí un archivo.";
  const tipo = tipoDeArchivo(archivo);
  if (!FORMATOS_PERMITIDOS[tipo]) return "El archivo tiene que ser PDF, JPG, PNG, DOC o DOCX.";
  if (Number(archivo.size) > TAMANO_MAXIMO_BYTES) return "El archivo pesa más de 10 MB.";
  return null;
}

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function esFechaValida(ymd) {
  const m = FECHA.exec(String(ymd || ""));
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(anio, mes - 1, dia);
  return d.getFullYear() === anio && d.getMonth() === mes - 1 && d.getDate() === dia;
}

/**
 * Qué le falta a un acuerdo para poder publicarse. Devuelve una lista de
 * errores (vacía si está completo). Hace falta el archivo o, por lo menos, el
 * link a la fuente: un acuerdo sin ninguno de los dos no le sirve a nadie.
 */
export function validarAcuerdo(form) {
  const f = form || {};
  const errores = [];
  if (!String(f.convenioId || "").trim()) errores.push("Elegí el convenio.");
  if (!esFechaValida(f.fecha)) errores.push("La fecha tiene que tener la forma AAAA-MM-DD.");
  if (!String(f.titulo || "").trim()) errores.push("Escribí el título del acuerdo.");
  const tieneArchivo = Boolean(f.archivo || f.archivoUrl);
  const tieneFuente = Boolean(String(f.fuenteUrl || "").trim());
  if (!tieneArchivo && !tieneFuente) errores.push("Subí el archivo o pegá el link a la fuente.");
  if (tieneFuente && !/^https?:\/\//i.test(String(f.fuenteUrl).trim())) {
    errores.push("El link a la fuente tiene que empezar con http:// o https://.");
  }
  return errores;
}

/** La ruta del archivo dentro de Storage: acuerdos/<convenio>/<fecha>-<titulo>.<ext>. */
export function nombreDeArchivo(convenioId, fecha, titulo, ext) {
  return `acuerdos/${convenioId}/${fecha}-${slug(titulo, "acuerdo")}.${ext}`;
}

const estaPublicado = (a) => a.published !== false && a.published !== 0;

/**
 * Los acuerdos que se muestran: publicados, del más nuevo al más viejo. Con
 * `convenioId` quedan sólo los de ese convenio. Misma regla que
 * novedadesPublicadas() en lib/novedadesPublicadas.js.
 */
export function acuerdosPublicados(items, { convenioId = null, limite = Infinity, incluirNoPublicadas = false } = {}) {
  let visibles = [...(items || [])];
  if (!incluirNoPublicadas) visibles = visibles.filter(estaPublicado);
  if (convenioId) visibles = visibles.filter((a) => a.convenioId === convenioId);
  visibles.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  return visibles.slice(0, limite);
}

/** { convenioId: "AAAA-MM-DD" } con la fecha del acuerdo publicado más nuevo de cada convenio. */
export function ultimoAcuerdoPorConvenio(items) {
  const ultimo = {};
  for (const a of items || []) {
    if (!a || !a.convenioId || !estaPublicado(a)) continue;
    const fecha = String(a.fecha || "");
    if (!ultimo[a.convenioId] || fecha.localeCompare(ultimo[a.convenioId]) > 0) ultimo[a.convenioId] = fecha;
  }
  return ultimo;
}
