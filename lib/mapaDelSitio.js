// lib/mapaDelSitio.js
// Qué URLs lista el sitemap y con qué fecha de cambio. Es puro: recibe las
// colecciones ya leídas y devuelve lo que Next espera de app/sitemap.js.
//
// POR QUÉ EXISTE: el sitemap ponía como fecha de cambio "ahora" en todas las
// URLs, en cada pedido, con lo que Google no podía saber qué cambió de verdad.
// Ahora cada URL lleva la fecha real: la de la escala más nueva para la
// calculadora, la de cada acuerdo para su página, la del acuerdo más nuevo
// para las listas. Y los acuerdos tienen su propia URL (lib/acuerdosPublicados.js).
//
// Ninguna fecha pasa de hoy, y ninguna cambia de un pedido al siguiente. La
// de la calculadora es la de su escala más nueva; si esa escala es de un mes
// que todavía no llegó (diciembre publicado en octubre), va el primer día del
// mes en curso. Hasta el 27/11/2026 iba "ahora": la calculadora de Comercio
// le decía a Google que había cambiado recién cada vez que leía el mapa, que
// es justo lo que este archivo vino a sacar.
//
// Las páginas de novedades entran sólo si tienen alguna publicada. Vacías
// estuvieron en el mapa desde el 10/10/2026 y Google las visitó y las dejó
// afuera ("Rastreada: actualmente sin indexar").

import { acuerdosPublicados } from "./acuerdosPublicados.js";
import { escalasDeLaPagina } from "./escalasDeAcuerdo.js";
import { novedadesPublicadas } from "./novedadesPublicadas.js";
import { SITIO } from "./metadataConvenio.js";

/**
 * Desde este día la página de un acuerdo muestra la escala de sus meses, o
 * lleva a la página que la muestra (lib/escalasDeAcuerdo.js). Las páginas que
 * cambiaron por eso llevan por lo menos esta fecha: la del acuerdo en la base
 * no se movió, y sin esto Google no tendría por qué volver a leerlas.
 */
export const ESCALAS_EN_LA_PAGINA_DESDE = "2026-11-27";

const fechaDe = (texto) => {
  const d = texto ? new Date(String(texto).length === 10 ? `${texto}T00:00:00Z` : texto) : null;
  return d && !isNaN(d) ? d : undefined;
};
const mayor = (fechas) => fechas.filter(Boolean).sort((a, b) => b - a)[0];
const primerDiaDelMes = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const entrada = (base, ruta, { lastModified, changeFrequency, priority }, hoy) => {
  const e = { url: `${base}${ruta}`, changeFrequency, priority };
  if (lastModified) e.lastModified = hoy && lastModified > hoy ? primerDiaDelMes(hoy) : lastModified;
  return e;
};

/**
 * @param convenios        [{ id, activo, ultimo_periodo }]
 * @param acuerdos         [{ convenioId, fecha, titulo, tipo, vigencia, slug, published, creadoEl, actualizadoEl }]
 * @param novedades        [{ date, convenioId, published }]
 * @param periodosCargados { convenioId: ["2026-10", …] } los meses con escala en la base
 * @param hoy              la fecha de hoy: ninguna fecha de cambio la supera
 */
export function armarMapaDelSitio({ convenios = [], acuerdos = [], novedades = [], periodosCargados = {}, base = SITIO.base, hoy = new Date() } = {}) {
  const publicados = acuerdosPublicados(acuerdos);
  const fechaDeAcuerdo = (a) => fechaDe(a.actualizadoEl) || fechaDe(a.creadoEl) || fechaDe(a.fecha);
  const porConvenio = (id) => publicados.filter((a) => a.convenioId === id);
  const ultimaNovedad = (id) => mayor(novedadesPublicadas(novedades, 1, { convenioId: id }).map((n) => fechaDe(n.date)));
  const hayNovedades = (id) => novedadesPublicadas(novedades, 1, { convenioId: id }).length > 0;
  const fila = (ruta, opciones) => entrada(base, ruta, opciones, hoy);

  const fechaGeneral = mayor([...publicados.map(fechaDeAcuerdo), ultimaNovedad(null)]);
  const salida = [fila("", { lastModified: fechaGeneral, changeFrequency: "weekly", priority: 1 })];
  if (hayNovedades(null)) {
    salida.push(fila("/novedades", { lastModified: ultimaNovedad(null), changeFrequency: "weekly", priority: 0.5 }));
  }
  salida.push(fila("/acuerdos", { lastModified: mayor(publicados.map(fechaDeAcuerdo)), changeFrequency: "weekly", priority: 0.6 }));

  const ordenados = [...convenios].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const c of ordenados) {
    const id = encodeURIComponent(c.id);
    const suyos = porConvenio(c.id);
    const activo = c.activo !== false;
    if (!activo && suyos.length === 0) continue;
    if (activo) {
      const periodo = /^\d{4}-\d{2}$/.test(String(c.ultimo_periodo || "")) ? fechaDe(`${c.ultimo_periodo}-01`) : undefined;
      salida.push(fila(`/calcular/${id}`, { lastModified: periodo, changeFrequency: "monthly", priority: 0.8 }));
    }
    salida.push(fila(`/acuerdos/${id}`, { lastModified: mayor(suyos.map(fechaDeAcuerdo)), changeFrequency: "monthly", priority: 0.6 }));
    for (const a of suyos) {
      const { periodos, enOtraPagina } = escalasDeLaPagina(a, suyos, periodosCargados[c.id]);
      const conEscalas = periodos.length || enOtraPagina.length ? fechaDe(ESCALAS_EN_LA_PAGINA_DESDE) : undefined;
      salida.push(fila(`/acuerdos/${id}/${a.slug}`, { lastModified: mayor([fechaDeAcuerdo(a), conEscalas]), changeFrequency: "yearly", priority: 0.7 }));
    }
    if (activo && hayNovedades(c.id)) {
      salida.push(fila(`/novedades/${id}`, { lastModified: ultimaNovedad(c.id), changeFrequency: "monthly", priority: 0.4 }));
    }
  }
  return salida;
}
