// app/robots.js
// Le dice a Google qué puede recorrer. /admin y /login ya no se bloquean acá:
// llevan un noindex en su layout, y para que Google lo lea tiene que poder
// entrar. Con el bloqueo, si alguien enlazaba /admin, Google podía mostrar la
// URL pelada en los resultados igual.
import { SITIO } from "@/lib/metadataConvenio";

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITIO.base}/sitemap.xml`,
  };
}
