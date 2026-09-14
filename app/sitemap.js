// app/sitemap.js
// El mapa del sitio para los buscadores.
//
// Las calculadoras (/calcular/<id>) se listan leyendo los convenios activos por
// la API REST de Firestore (lib/firestoreRest.js), la misma lectura que hace la
// portada; antes no se podían listar porque el sitemap se genera en el servidor
// y ahí no había forma de leer Firestore. Si Firestore no responde, el mapa
// sale con las páginas fijas nada más.
import { listarColeccion } from "@/lib/firestoreRest";

export const runtime = "edge";

export default async function sitemap() {
  const base = "https://liquidar.ar";
  const ahora = new Date();
  const fijas = [
    { url: base, lastModified: ahora, changeFrequency: "weekly", priority: 1 },
    // /empleador ya no se lista: se retiró el 13/9/2026 y sólo redirige.
    { url: `${base}/novedades`, lastModified: ahora, changeFrequency: "weekly", priority: 0.5 },
  ];
  let calculadoras = [];
  try {
    const convenios = await listarColeccion("convenios", { campos: ["activo"] });
    calculadoras = convenios
      .filter((c) => c.activo !== false)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        url: `${base}/calcular/${encodeURIComponent(c.id)}`,
        lastModified: ahora,
        changeFrequency: "monthly",
        priority: 0.8,
      }));
  } catch (error) {
    console.error("El sitemap sale sin las calculadoras:", error);
  }
  return [...fijas, ...calculadoras];
}
