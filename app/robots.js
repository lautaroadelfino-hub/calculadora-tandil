// app/robots.js
// Le dice a Google qué puede recorrer. El panel de administración no tiene por
// qué aparecer en los resultados de búsqueda.
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/login"] }],
    sitemap: "https://liquidar.ar/sitemap.xml",
  };
}
