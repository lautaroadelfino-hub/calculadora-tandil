// app/sitemap.js
// El mapa del sitio para los buscadores.
//
// Las páginas de cada convenio (/calcular, /acuerdos y /novedades) se listan
// leyendo los convenios activos por la API REST de Firestore
// (lib/firestoreRest.js), la misma lectura que hace la portada; antes no se
// podían listar porque el sitemap se genera en el servidor y ahí no había forma
// de leer Firestore. Si Firestore no responde, el mapa sale con las páginas
// fijas nada más.
import { listarColeccion } from "@/lib/firestoreRest";

export const runtime = "edge";

export default async function sitemap() {
  const base = "https://liquidar.ar";
  const ahora = new Date();
  const fijas = [
    { url: base, lastModified: ahora, changeFrequency: "weekly", priority: 1 },
    // /empleador ya no se lista: se retiró el 13/9/2026 y sólo redirige.
    { url: `${base}/novedades`, lastModified: ahora, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/acuerdos`, lastModified: ahora, changeFrequency: "weekly", priority: 0.6 },
  ];
  let porConvenio = [];
  try {
    const convenios = await listarColeccion("convenios", { campos: ["activo"] });
    porConvenio = convenios
      .filter((c) => c.activo !== false)
      .sort((a, b) => a.id.localeCompare(b.id))
      .flatMap((c) => {
        const id = encodeURIComponent(c.id);
        return [
          { url: `${base}/calcular/${id}`, lastModified: ahora, changeFrequency: "monthly", priority: 0.8 },
          { url: `${base}/acuerdos/${id}`, lastModified: ahora, changeFrequency: "monthly", priority: 0.6 },
          { url: `${base}/novedades/${id}`, lastModified: ahora, changeFrequency: "monthly", priority: 0.4 },
        ];
      });
  } catch (error) {
    console.error("El sitemap sale sin las páginas de los convenios:", error);
  }
  return [...fijas, ...porConvenio];
}
