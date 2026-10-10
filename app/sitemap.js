// app/sitemap.js
// El mapa del sitio para los buscadores. Lee las tres colecciones por la API
// REST de Firestore y deja la lógica en lib/mapaDelSitio.js (puro, con tests).
// Si Firestore no responde, el mapa sale con las páginas fijas nada más; si
// sólo fallan acuerdos o novedades, salen las páginas de convenio sin ellos.
import { listarColeccion } from "@/lib/firestoreRest";
import { armarMapaDelSitio } from "@/lib/mapaDelSitio";

export const runtime = "edge";

export default async function sitemap() {
  let convenios = [];
  let acuerdos = [];
  let novedades = [];
  try {
    [convenios, acuerdos, novedades] = await Promise.all([
      listarColeccion("convenios", { campos: ["activo", "ultimo_periodo"] }),
      listarColeccion("acuerdos", { campos: ["convenioId", "fecha", "titulo", "slug", "published", "creadoEl", "actualizadoEl"] }).catch(() => []),
      listarColeccion("novedades", { campos: ["date", "convenioId", "published"] }).catch(() => []),
    ]);
  } catch (error) {
    console.error("El sitemap sale sin las páginas de los convenios:", error);
  }
  return armarMapaDelSitio({ convenios, acuerdos, novedades });
}
