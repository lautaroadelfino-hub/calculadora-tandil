// app/sitemap.js
// El mapa del sitio para los buscadores.
//
// Las páginas de cada convenio (/calcular/<id>) NO se listan acá: salen de
// Firestore y este archivo se genera del lado del servidor, donde no hay
// sesión de Firebase. Cuando haya muchos convenios conviene leerlos con la API
// REST de Firestore, que la regla de lectura pública ya permite.
export default function sitemap() {
  const base = "https://liquidar.ar";
  const ahora = new Date();
  return [
    { url: base, lastModified: ahora, changeFrequency: "weekly", priority: 1 },
    // /empleador ya no se lista: se retiró el 13/9/2026 y sólo redirige.
    { url: `${base}/novedades`, lastModified: ahora, changeFrequency: "weekly", priority: 0.5 },
  ];
}
