// lib/jsonLd.js
// Los datos estructurados (schema.org) que se le dan a Google en cada página,
// como objetos puros. Lo que Google muestra de verdad en los resultados es el
// BreadcrumbList (las migas debajo del título); el resto describe el sitio y
// cada documento sin prometer nada que no esté en la página.
//
// Ningún campo sale con `undefined`: JSON.stringify lo omitiría igual, pero
// así los tests pueden comparar objetos enteros.

import { SITIO } from "./metadataConvenio.js";

const absoluta = (url) => (/^https?:\/\//.test(url) ? url : `${SITIO.base}${url}`);

const sinVacios = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

/** El sitio y quién lo publica, para la portada. */
export function jsonLdSitio() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITIO.base}/#sitio`,
        name: SITIO.nombre,
        url: `${SITIO.base}/`,
        inLanguage: "es-AR",
        publisher: { "@id": `${SITIO.base}/#organizacion` },
      },
      {
        "@type": "Organization",
        "@id": `${SITIO.base}/#organizacion`,
        name: SITIO.nombre,
        url: `${SITIO.base}/`,
        logo: `${SITIO.base}/brand/logo-liquidar.svg`,
      },
    ],
  };
}

/** Las migas: [{ nombre, url }] en orden, de la portada a la página actual. */
export function jsonLdMigas(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (items || []).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nombre,
      item: absoluta(it.url),
    })),
  };
}

/** Un acuerdo o escala: el documento que se descarga, con su fecha y su fuente. */
export function jsonLdAcuerdo({ acuerdo, convenio, url, descripcion }) {
  return sinVacios({
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: acuerdo.titulo,
    description: descripcion,
    url: absoluta(url),
    datePublished: acuerdo.fecha,
    inLanguage: "es-AR",
    encodingFormat: acuerdo.archivoTipo || undefined,
    about: convenio && convenio.cct ? { "@type": "Thing", name: `CCT ${convenio.cct}` } : undefined,
    isBasedOn: acuerdo.fuenteUrl || undefined,
    publisher: { "@type": "Organization", name: SITIO.nombre, url: `${SITIO.base}/` },
  });
}

/** Preguntas frecuentes: [{ pregunta, respuesta }] con texto plano. */
export function jsonLdFaq(preguntas) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (preguntas || []).map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta },
    })),
  };
}

/** A texto para un <script type="application/ld+json">: "<" escapado para que nadie cierre el script. */
export function serializarJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
