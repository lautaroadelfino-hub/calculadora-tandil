// lib/vigia/boletin.js
// Qué dice un aviso del Boletín Oficial, en números.
//
// Dos cosas cambian todos los meses y se publican ahí: las bases mínima y
// máxima del art. 9 de la Ley 24.241 (Resolución de ANSES, a fin del mes
// anterior) y la suma fija del FFEP (Disposición de la Gerencia de Control
// Prestacional de la SRT). Acá viven las expresiones regulares que las leen
// del texto del aviso, con su cita, y la clasificación de cualquier otro aviso
// que convenga mirar (alícuotas, detracción, Ganancias).
//
// Es puro: recibe texto, devuelve números o null. Nunca adivina: si la frase
// no tiene la forma conocida, devuelve null y el aviso sale como alerta, no
// como dato. Los textos reales están en test/fixtures/vigia/.

import { periodoDeMes } from "../periodos.js";

/** "$144.363,55" o "$ 1.905" -> 144363.55 / 1905. Null si no es un importe. */
export function numeroDePesos(texto) {
  const m = String(texto || "").replace(/\s/g, "").match(/^\$?([\d.]+)(?:,(\d{1,2}))?$/);
  if (!m) return null;
  const entero = m[1].replace(/\./g, "");
  if (!/^\d+$/.test(entero)) return null;
  const n = Number(`${entero}.${(m[2] || "0").padEnd(2, "0")}`);
  return Number.isFinite(n) ? n : null;
}

const IMPORTE = String.raw`\(\$\s?([\d.]+(?:,\d{1,2})?)\)`;
const MES = String.raw`([a-záéíóúñ]+)\s+de\s+(\d{4})`;

const RE_BASES = new RegExp(
  String.raw`bases imponibles m[ií]nima y m[aá]xima[\s\S]{0,400}?${IMPORTE}[\s\S]{0,400}?${IMPORTE}[\s\S]{0,200}?devengado\s+${MES}`,
  "i"
);

/**
 * Las bases del art. 9 que fija una Resolución de ANSES, con el período
 * "AAAA-MM" en que rigen y la frase de donde salieron. Null si no está.
 */
export function extraerBasesArt9(texto) {
  const m = String(texto || "").match(RE_BASES);
  if (!m) return null;
  const minima = numeroDePesos(m[1]);
  const maxima = numeroDePesos(m[2]);
  const periodo = periodoDeMes(m[3], m[4]);
  if (minima == null || maxima == null || !periodo || minima <= 0 || maxima <= minima) return null;
  return { minima, maxima, periodo, cita: m[0].replace(/\s+/g, " ").slice(0, 400) };
}

const RE_FFEP = new RegExp(
  String.raw`suma fija prevista en el art[ií]culo 5[°º]?\s*del Decreto N[°º]?\s*590[\s\S]{0,700}?ser[aá] de PESOS[^()]{0,200}?${IMPORTE}\s*para el devengado del mes de\s+${MES}([^.]{0,120})`,
  "i"
);

/** ¿El aviso habla del Fondo Fiduciario de Enfermedades Profesionales? */
export function mencionaFfep(texto) {
  return /ENFERMEDADES PROFESIONALES/i.test(String(texto || ""));
}

/**
 * La suma fija del FFEP que fija una Disposición de la SRT para el Régimen
 * General, con el mes devengado al que corresponde. Null si no está (por
 * ejemplo, la Disposición del Fondo de Garantía, que es otro fondo).
 */
export function extraerFfep(texto) {
  const t = String(texto || "");
  if (!mencionaFfep(t)) return null;
  const m = t.match(RE_FFEP);
  if (!m) return null;
  const monto = numeroDePesos(m[1]);
  const periodo = periodoDeMes(m[2], m[3]);
  const cola = m[4] || "";
  if (monto == null || monto <= 0 || !periodo) return null;
  // Si la frase nombra un régimen, tiene que ser el general (el de casas
  // particulares tiene otra suma y no es el de la calculadora).
  if (/casas particulares/i.test(cola) && !/r[ée]gimen general/i.test(cola)) return null;
  return { monto, periodo, cita: m[0].replace(/\s+/g, " ").slice(0, 400) };
}

/**
 * Los organismos cuyos avisos vale la pena bajar enteros: ANSES (bases del
 * art. 9), la SRT (FFEP) y ARCA (alícuotas, Ganancias). Nada más: el Boletín
 * limita los pedidos seguidos (HTTP 429 después de unos 150, prueba viva del
 * 21/10/2026) y la Secretaría de Trabajo, Capital Humano y el Poder Ejecutivo
 * publican decenas de avisos por día que no cambian la calculadora (los
 * acuerdos de los convenios salen por las páginas de los sindicatos). Ojo:
 * "SEGURIDAD SOCIAL" solo también matchea "SECRETARÍA DE TRABAJO, EMPLEO Y
 * SEGURIDAD SOCIAL"; por eso el nombre entero de ANSES.
 */
export const ORGANISMOS_DE_INTERES =
  /ADMINISTRACI[ÓO]N NACIONAL DE LA SEGURIDAD SOCIAL|SUPERINTENDENCIA DE RIESGOS DEL TRABAJO|AGENCIA DE RECAUDACI[ÓO]N Y CONTROL ADUANERO|ADMINISTRACI[ÓO]N FEDERAL DE INGRESOS P[ÚU]BLICOS/i;

const ES_ANSES = /ADMINISTRACI[ÓO]N NACIONAL DE LA SEGURIDAD SOCIAL/i;
const ES_SRT = /RIESGOS DEL TRABAJO/i;

/** Temas que no se preparan solos pero merecen un aviso con el link. */
export const TEMAS_DE_ALERTA = [
  { tema: "bases imponibles del art. 9", patron: /bases imponibles/i },
  { tema: "FFEP", patron: /ENFERMEDADES PROFESIONALES/i },
  { tema: "contribuciones patronales", patron: /contribuciones patronales/i },
  { tema: "detracción de la Ley 27.541", patron: /27\.541/ },
  { tema: "Ganancias, deducciones personales", patron: /deducciones personales|art[ií]culo 30 de la [Ll]ey de[l]? [Ii]mpuesto a las [Gg]anancias/i },
  { tema: "Ganancias, escala del art. 94", patron: /art[ií]culo 94 de la [Ll]ey de[l]? [Ii]mpuesto a las [Gg]anancias/i },
];

/** "ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL Resolución 257/2026 …" -> "Resolución ANSES 257/2026". */
export function nombreDeNorma({ organismo = "", titulo = "" } = {}) {
  const m = String(titulo).match(/(Resoluci[óo]n(?: General)?(?: Conjunta)?|Disposici[óo]n(?: Conjunta)?|Decreto)\s+(\d+\/\d{4})/i);
  if (!m) return String(titulo).replace(/\s+/g, " ").trim().slice(0, 80);
  const sigla = ES_ANSES.test(organismo) ? " ANSES" : ES_SRT.test(organismo) ? " SRT" : /INGRESOS P[ÚU]BLICOS|RECAUDACI[ÓO]N/i.test(organismo) ? " ARCA" : "";
  return `${m[1]}${sigla} ${m[2]}`;
}

/**
 * Qué es un aviso para el vigía:
 *   { tipo: "bases_art9", datos }   una Resolución de ANSES con las bases
 *   { tipo: "ffep", datos }         una Disposición de la SRT con la suma fija
 *   { tipo: "alerta", temas }       habla de algo que hay que mirar a mano
 *   null                            no interesa
 */
export function clasificarAviso({ organismo = "", titulo = "", texto = "" } = {}) {
  if (ES_ANSES.test(organismo)) {
    const datos = extraerBasesArt9(texto);
    if (datos) return { tipo: "bases_art9", datos, norma: nombreDeNorma({ organismo, titulo }) };
  }
  if (ES_SRT.test(organismo)) {
    const datos = extraerFfep(texto);
    if (datos) return { tipo: "ffep", datos, norma: nombreDeNorma({ organismo, titulo }) };
  }
  const temas = TEMAS_DE_ALERTA.filter((t) => t.patron.test(texto)).map((t) => t.tema);
  // Los temas de ANSES y de la SRT que no se pudieron leer también se avisan:
  // es la señal de que cambió la redacción y hay que mirar.
  if (temas.length) return { tipo: "alerta", temas, norma: nombreDeNorma({ organismo, titulo }) };
  return null;
}
