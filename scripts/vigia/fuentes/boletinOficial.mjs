// scripts/vigia/fuentes/boletinOficial.mjs
// El Boletín Oficial, Primera Sección (Legislación y Avisos Oficiales).
//
// El listado de un día es https://www.boletinoficial.gob.ar/seccion/primera/AAAAMMDD
// (verificado el 21/10/2026; `?fecha=` se ignora). La página trae los primeros
// 100 avisos y el resto se carga al bajar, por /seccion/actualizar/primera
// (ver listarDia). Cada aviso es un <a href="/detalleAviso/primera/<id>/<fecha>">
// con el organismo en `.linea-aviso p.item` y el tipo y número de norma en
// `p.item-detalle small`; los que tienen anexos traen además un link con el
// clip ("?anexos=1"), sin datos. El cuerpo del aviso está en `#cuerpoDetalleAviso`.
// Es la misma lectura que hace La Gaceta Contable, el otro proyecto del dueño.
//
// Un día tiene entre 60 y 250 avisos. Sólo se bajan enteros los de ANSES, la
// SRT y ARCA (lib/vigia/boletin.js, ORGANISMOS_DE_INTERES); el resto se da por
// visto con el listado. El Boletín limita los pedidos seguidos (HTTP 429), por
// eso no se leen los decretos ni las resoluciones de la Secretaría de Trabajo:
// son decenas por día y los acuerdos salen por las páginas de los sindicatos.
//
// La lectura de los textos (bases del art. 9, FFEP) está en lib/vigia/boletin.js;
// el recorrido día por día, en scripts/vigia/correrBoletin.mjs.

import * as cheerio from "cheerio";
import { pedir, errorHttp } from "../http.mjs";
import { clasificarAviso, ORGANISMOS_DE_INTERES } from "../../../lib/vigia/boletin.js";

export const nombre = "boletinOficial";
export const BASE = "https://www.boletinoficial.gob.ar";
/** Rellenar días pasados cuesta un pedido por aviso de interés: un mes por corrida, como mucho. */
export const MAX_DIAS_POR_CORRIDA = 31;
/** No se piden más de estas páginas por día: un día tiene 60 a 250 avisos, de a 100. */
export const MAX_PAGINAS_POR_DIA = 10;

const compacto = (s) => String(s || "").replace(/\s+/g, " ").trim();
const sinGuiones = (fecha) => String(fecha).replace(/-/g, "");
const fechaDe = (aaaammdd) => `${aaaammdd.slice(0, 4)}-${aaaammdd.slice(4, 6)}-${aaaammdd.slice(6, 8)}`;

/** La URL del listado de un día ("AAAA-MM-DD"). */
export function urlDelDia(fecha) {
  return `${BASE}/seccion/primera/${sinGuiones(fecha)}`;
}

/**
 * Los avisos de un listado, como [{id, url, organismo, tipoNorma, detalle, titulo, fecha}].
 * `id` es "primera/<id>/<fecha>", estable entre corridas. Si el HTML no es un
 * listado del Boletín, lanza "cambió el formato".
 */
export function avisosDelListado(html, fecha) {
  const $ = cheerio.load(html || "");
  const anchors = $('a[href*="detalleAviso"]');
  if (!anchors.length) {
    if (!/boletinoficial|Legislaci[óo]n y Avisos|Secci[óo]n Primera/i.test(String(html || ""))) {
      throw new Error("cambió el formato del listado del Boletín Oficial: no se encontró ni un aviso ni la estructura de la página");
    }
    return [];
  }
  const porId = new Map();
  anchors.each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const m = href.replace(/\\/g, "/").match(/detalleAviso\/(primera)\/(\d+)\/(\d{8})/);
    if (!m) return;
    const id = `${m[1]}/${m[2]}/${m[3]}`;
    const linea = $(el).find(".linea-aviso");
    // Un aviso con anexos tiene dos links: el del clip, sin datos, y el de la
    // línea con el organismo y la norma. Vale el que tiene la línea.
    if (porId.has(id) && !linea.length) return;
    const organismo = compacto(linea.find("p.item").first().text());
    const detalles = linea.find("p.item-detalle small").map((__, s) => compacto($(s).text())).get().filter(Boolean);
    const tipoNorma = detalles[0] || "";
    const detalle = detalles.slice(1).join(" — ");
    const titulo = compacto([organismo, tipoNorma, detalle].filter(Boolean).join(" ")) || compacto($(el).text());
    if (!porId.has(id) || organismo) {
      porId.set(id, { id, url: `${BASE}/detalleAviso/${id}`, organismo, tipoNorma, detalle, titulo, fecha: fecha || fechaDe(m[3]) });
    }
  });
  return [...porId.values()];
}

/** El título y el cuerpo de un aviso, en texto plano. Lanza si el cuerpo no está. */
export function cuerpoDelAviso(html) {
  const $ = cheerio.load(html || "");
  const $c = $("#cuerpoDetalleAviso");
  $c.find("style, script").remove();
  const cuerpo = compacto($c.text());
  if (!cuerpo) throw new Error("cambió el formato del aviso del Boletín Oficial: no se encontró el cuerpo (#cuerpoDetalleAviso)");
  // El <title> trae organismo y norma ("… - ADMINISTRACIÓN NACIONAL DE LA
  // SEGURIDAD SOCIAL - Resolución 257/2026"); el <h1> sólo el organismo.
  const titulo = compacto($("title").text()).replace(/^BOLET[IÍ]N OFICIAL REP[UÚ]BLICA ARGENTINA\s*-\s*/i, "") || compacto($("h1").first().text());
  return { titulo, cuerpo };
}

/**
 * ¿Vale la pena bajar el aviso entero? Sólo las normas de los organismos de
 * interés: los "Avisos Oficiales" (las aduanas de ARCA publican varios por
 * día) no fijan nada.
 */
export function interesa(item) {
  const organismo = String((item && item.organismo) || "");
  const tipo = String((item && item.tipoNorma) || "");
  if (!ORGANISMOS_DE_INTERES.test(organismo)) return false;
  if (/ADUANA/i.test(organismo) || /^Aviso Oficial/i.test(tipo)) return false;
  return true;
}

/**
 * Qué días revisar en esta corrida, del más viejo al más nuevo: desde `desde`
 * (o el día siguiente al último revisado, o hoy) hasta `hasta`, como máximo
 * `max` días. Lo que no entra queda para la corrida siguiente.
 */
export function diasARevisar({ desde = null, hasta, ultimaFechaRevisada = null, max = MAX_DIAS_POR_CORRIDA }) {
  const aFecha = (s) => new Date(`${s}T12:00:00Z`);
  const aTexto = (d) => d.toISOString().slice(0, 10);
  let inicio;
  if (desde) inicio = aFecha(desde);
  else if (ultimaFechaRevisada) {
    inicio = aFecha(ultimaFechaRevisada);
    inicio.setUTCDate(inicio.getUTCDate() + 1);
  } else inicio = aFecha(hasta);
  const fin = aFecha(hasta);
  const dias = [];
  for (let d = inicio; d <= fin && dias.length < max; d.setUTCDate(d.getUTCDate() + 1)) dias.push(aTexto(d));
  return dias;
}

/** El rubro con que termina la primera página, que la siguiente necesita como parámetro. */
export function ultimoRubroDe(html) {
  const m = String(html || "").match(/var ultimoRubro = '([^']*)'/);
  return m ? m[1] : "";
}

/**
 * Los avisos de un día, completos. La página trae los primeros 100 y el
 * resto se carga al bajar: GET /seccion/actualizar/primera?pag=N&ult_rubro=…
 * devuelve JSON {html, hay_mas_datos, sig_pag, ult_rubro}, y sólo responde
 * con la cookie de sesión que dio la primera página (verificado el 21/10/2026:
 * el 1/9/2026 tiene 129 avisos, 100 en la página y 29 en la segunda).
 */
export async function listarDia(fecha, { pedirFn = pedir } = {}) {
  const r = await pedirFn(urlDelDia(fecha));
  if (!r.ok) throw errorHttp(`el Boletín Oficial respondió HTTP ${r.status} para el listado del ${fecha}`, r.status);
  const html = r.texto();
  const items = avisosDelListado(html, fecha);
  const vistos = new Set(items.map((i) => i.id));
  const cookie = (r.cookies || []).join("; ");
  let pagina = 2;
  let rubro = ultimoRubroDe(html);
  for (let n = 0; n < MAX_PAGINAS_POR_DIA && cookie; n++) {
    const url = `${BASE}/seccion/actualizar/primera?pag=${pagina}&ult_rubro=${encodeURIComponent(rubro || "")}`;
    const rp = await pedirFn(url, { cabeceras: { Cookie: cookie, Accept: "application/json, text/javascript, */*", "X-Requested-With": "XMLHttpRequest" } });
    if (!rp.ok) throw errorHttp(`el Boletín Oficial respondió HTTP ${rp.status} para la página ${pagina} del ${fecha}`, rp.status);
    let json;
    try { json = JSON.parse(rp.texto()); } catch { throw new Error(`cambió el formato del listado del Boletín Oficial: la página ${pagina} del ${fecha} no es JSON`); }
    for (const item of avisosDelListado(json.html || "<div>Sección Primera</div>", fecha)) {
      if (!vistos.has(item.id)) { vistos.add(item.id); items.push(item); }
    }
    if (!json.hay_mas_datos) break;
    pagina = Number(json.sig_pag) || pagina + 1;
    rubro = json.ult_rubro || "";
  }
  return items;
}

/** El texto de un aviso. */
export async function bajar(item, { pedirFn = pedir } = {}) {
  const r = await pedirFn(item.url);
  if (!r.ok) throw errorHttp(`el Boletín Oficial respondió HTTP ${r.status} para ${item.url}`, r.status);
  return cuerpoDelAviso(r.texto());
}

/** De una URL pegada a mano (--item), el ítem equivalente al del listado. */
export function itemDesdeUrl(url) {
  const m = String(url || "").match(/detalleAviso\/(primera)\/(\d+)\/(\d{8})/);
  if (!m) throw new Error(`"${url}" no es la URL de un aviso del Boletín Oficial (…/detalleAviso/primera/<id>/<AAAAMMDD>).`);
  const id = `${m[1]}/${m[2]}/${m[3]}`;
  return { id, url: `${BASE}/detalleAviso/${id}`, organismo: "", tipoNorma: "", detalle: "", titulo: "", fecha: fechaDe(m[3]) };
}

export { clasificarAviso };
