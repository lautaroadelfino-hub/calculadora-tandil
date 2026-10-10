// lib/metadataConvenio.js
// El título, la descripción y los datos para compartir de cada página.
//
// POR QUÉ EXISTE: las tres calculadoras compartían el mismo título que la
// portada ("LiquidAR — Calculadora de sueldos por convenio colectivo"). Un
// lector de pantalla anuncia el título al cargar cada página, así que al pasar
// de la portada a Comercio y de ahí a Camioneros se oía siempre lo mismo; y
// con varias pestañas abiertas no se distinguían. Para Google tampoco ayudaba.
// Es puro: recibe lo que devuelve Firestore y arma el título.
//
// Desde el 10/10/2026 cada convenio tiene cuatro clases de página: la
// calculadora (/calcular), sus acuerdos y escalas (/acuerdos), cada acuerdo
// (/acuerdos/<convenio>/<slug>) y sus novedades (/novedades). Y toda página
// declara su canonical y su openGraph.url PROPIOS: antes heredaban los de la
// portada desde app/layout.js, con lo que Google tomaba /novedades como una
// copia de la portada y al compartir cualquier página salía el título general.

export const SITIO = { nombre: "LiquidAR", base: "https://liquidar.ar", locale: "es_AR" };

/**
 * La imagen que sale al compartir cualquier página. Vive en public/brand/ y no
 * en app/opengraph-image.png: el adaptador de Cloudflare toma ese archivo
 * como una ruta sin runtime edge y el despliegue falla (10/10/2026).
 */
export const IMAGEN_PARA_COMPARTIR = {
  url: "/brand/compartir.png",
  width: 1200,
  height: 630,
  alt: "LiquidAR: calculadora de sueldo por convenio colectivo, con las escalas y acuerdos de cada sindicato",
};

/**
 * La metadata completa de una página. `title` y `description` los completa
 * Next en openGraph/twitter a partir de los de la página (no se repiten acá a
 * propósito); lo que hay que dar por página es el canonical y la url. La
 * imagen va explícita en cada página.
 */
export function metadataDePagina({ title, description, canonical, tipo = "website" }) {
  const meta = {
    alternates: { canonical },
    openGraph: { type: tipo, locale: SITIO.locale, siteName: SITIO.nombre, url: canonical, images: [IMAGEN_PARA_COMPARTIR] },
  };
  if (title) meta.title = title;
  if (description) meta.description = description;
  return meta;
}

/** Los campos de un documento de Firestore (formato REST) a un objeto plano con nombre y cct. */
export function convenioDesdeRest(json) {
  const f = json && json.fields;
  if (!f) return null;
  return {
    nombre: f.nombre && f.nombre.stringValue ? f.nombre.stringValue : null,
    cct: f.cct && f.cct.stringValue ? f.cct.stringValue : null,
  };
}

/** "Camioneros (CCT 40/89)" o, si no hay nombre, "Calculadora". */
export function tituloDeConvenio(convenio, siNoHay = "Calculadora") {
  if (!convenio || !convenio.nombre) return siNoHay;
  return convenio.cct ? `${convenio.nombre} (CCT ${convenio.cct})` : convenio.nombre;
}

/** La calculadora: "Calculadora de sueldo de Camioneros (CCT 40/89)". */
export function metadataDeConvenio(convenio, convenioId) {
  const hay = convenio && convenio.nombre;
  let description;
  if (hay) {
    const escala = convenio.ultimo_periodo_nombre ? ` con la escala de ${convenio.ultimo_periodo_nombre}` : " con las escalas vigentes";
    description = `Simulá el recibo de sueldo de ${convenio.nombre}${escala}: básico por categoría, antigüedad, horas extras, aguinaldo, aportes y el costo laboral del empleador. Gratis y sin registro.`;
  }
  return metadataDePagina({
    title: hay ? `Calculadora de sueldo de ${tituloDeConvenio(convenio)}` : "Calculadora",
    description,
    canonical: `/calcular/${convenioId}`,
  });
}

/** "Acuerdos y escalas · Camioneros (CCT 40/89)"; sin convenio, "Acuerdos y escalas". */
export function metadataDeAcuerdos(convenio, convenioId) {
  const hay = convenio && convenio.nombre;
  return metadataDePagina({
    title: hay ? `Acuerdos y escalas · ${tituloDeConvenio(convenio)}` : "Acuerdos y escalas",
    description: hay
      ? `Acuerdos paritarios, escalas salariales y homologaciones de ${convenio.nombre}, con el documento de cada uno para descargar.`
      : undefined,
    canonical: `/acuerdos/${convenioId}`,
  });
}

/** Un acuerdo: "Escala salarial septiembre 2026 · Camioneros (CCT 40/89)". */
export function metadataDeAcuerdo(acuerdo, convenio, convenioId, { etiquetaDeTipo = (t) => t, fechaLarga = (f) => f } = {}) {
  const nombre = (convenio && convenio.nombre) || "";
  const tipo = etiquetaDeTipo(acuerdo.tipo);
  const vigencia = acuerdo.vigencia ? `, vigencia ${acuerdo.vigencia}` : "";
  const archivo = acuerdo.archivoUrl ? "Descargá el documento" : "Mirá la fuente";
  return metadataDePagina({
    title: `${acuerdo.titulo} · ${tituloDeConvenio(convenio, nombre)}`.trim(),
    description: `${tipo} de ${nombre}${convenio && convenio.cct ? ` (CCT ${convenio.cct})` : ""} del ${fechaLarga(acuerdo.fecha)}${vigencia}. ${archivo} y calculá el sueldo con la escala vigente.`,
    canonical: `/acuerdos/${convenioId}/${acuerdo.slug}`,
    tipo: "article",
  });
}

/** "Novedades · Camioneros (CCT 40/89)"; sin convenio, "Novedades". */
export function metadataDeNovedadesDeConvenio(convenio, convenioId) {
  const hay = convenio && convenio.nombre;
  return metadataDePagina({
    title: hay ? `Novedades · ${tituloDeConvenio(convenio)}` : "Novedades",
    description: hay ? `Novedades de ${convenio.nombre}: paritarias, escalas y avisos del convenio.` : undefined,
    canonical: `/novedades/${convenioId}`,
  });
}
