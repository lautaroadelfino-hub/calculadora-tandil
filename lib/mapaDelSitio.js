// lib/mapaDelSitio.js
// Qué URLs lista el sitemap y con qué fecha de cambio. Es puro: recibe las
// colecciones ya leídas y devuelve lo que Next espera de app/sitemap.js.
//
// POR QUÉ EXISTE: el sitemap ponía como fecha de cambio "ahora" en todas las
// URLs, en cada pedido, con lo que Google no podía saber qué cambió de verdad.
// Ahora cada URL lleva la fecha real: la de la escala más nueva para la
// calculadora, la de cada acuerdo para su página, la del acuerdo más nuevo
// para las listas. Y los acuerdos tienen su propia URL (lib/acuerdosPublicados.js).
// Ninguna fecha pasa de hoy: la de la calculadora es la de su escala más nueva,
// y una escala publicada por adelantado (noviembre en octubre) no puede decirle
// a Google que la página cambió en el futuro.

import { acuerdosPublicados } from "./acuerdosPublicados.js";
import { novedadesPublicadas } from "./novedadesPublicadas.js";
import { SITIO } from "./metadataConvenio.js";

const fechaDe = (texto) => {
  const d = texto ? new Date(String(texto).length === 10 ? `${texto}T00:00:00Z` : texto) : null;
  return d && !isNaN(d) ? d : undefined;
};
const mayor = (fechas) => fechas.filter(Boolean).sort((a, b) => b - a)[0];
const entrada = (base, ruta, { lastModified, changeFrequency, priority }, hoy) => {
  const e = { url: `${base}${ruta}`, changeFrequency, priority };
  if (lastModified) e.lastModified = hoy && lastModified > hoy ? hoy : lastModified;
  return e;
};

/**
 * @param convenios  [{ id, activo, ultimo_periodo }]
 * @param acuerdos   [{ convenioId, fecha, titulo, slug, published, creadoEl, actualizadoEl }]
 * @param novedades  [{ date, convenioId, published }]
 * @param hoy        la fecha de hoy: ninguna fecha de cambio la supera
 */
export function armarMapaDelSitio({ convenios = [], acuerdos = [], novedades = [], base = SITIO.base, hoy = new Date() } = {}) {
  const publicados = acuerdosPublicados(acuerdos);
  const fechaDeAcuerdo = (a) => fechaDe(a.actualizadoEl) || fechaDe(a.creadoEl) || fechaDe(a.fecha);
  const porConvenio = (id) => publicados.filter((a) => a.convenioId === id);
  const ultimaNovedad = (id) => mayor(novedadesPublicadas(novedades, 1, { convenioId: id }).map((n) => fechaDe(n.date)));
  const fila = (ruta, opciones) => entrada(base, ruta, opciones, hoy);

  const fechaGeneral = mayor([...publicados.map(fechaDeAcuerdo), ultimaNovedad(null)]);
  const salida = [
    fila("", { lastModified: fechaGeneral, changeFrequency: "weekly", priority: 1 }),
    fila("/novedades", { lastModified: ultimaNovedad(null), changeFrequency: "weekly", priority: 0.5 }),
    fila("/acuerdos", { lastModified: mayor(publicados.map(fechaDeAcuerdo)), changeFrequency: "weekly", priority: 0.6 }),
  ];

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
      salida.push(fila(`/acuerdos/${id}/${a.slug}`, { lastModified: fechaDeAcuerdo(a), changeFrequency: "yearly", priority: 0.7 }));
    }
    if (activo) {
      salida.push(fila(`/novedades/${id}`, { lastModified: ultimaNovedad(c.id), changeFrequency: "monthly", priority: 0.4 }));
    }
  }
  return salida;
}
