// app/sitemap.js
// El mapa del sitio para los buscadores. Lee las tres colecciones por la API
// REST de Firestore y deja la lógica en lib/mapaDelSitio.js (puro, con tests).
// Si Firestore no responde, el mapa sale con las páginas fijas nada más; si
// sólo fallan acuerdos o novedades, salen las páginas de convenio sin ellos.
//
// De cada convenio se leen además los meses que tienen escala cargada: la
// página de un acuerdo que muestra una escala cambió cuando empezó a
// mostrarla, y el mapa lo tiene que decir. Si esa lectura falla, el acuerdo
// sale igual, con su fecha de siempre.
import { listarColeccion, listarIds } from "@/lib/firestoreRest";
import { armarMapaDelSitio } from "@/lib/mapaDelSitio";

export const runtime = "edge";

export default async function sitemap() {
  let convenios = [];
  let acuerdos = [];
  let novedades = [];
  let periodosCargados = {};
  try {
    [convenios, acuerdos, novedades] = await Promise.all([
      listarColeccion("convenios", { campos: ["activo", "ultimo_periodo"] }),
      listarColeccion("acuerdos", { campos: ["convenioId", "fecha", "titulo", "tipo", "vigencia", "slug", "published", "creadoEl", "actualizadoEl"] }).catch(() => []),
      listarColeccion("novedades", { campos: ["date", "convenioId", "published"] }).catch(() => []),
    ]);
    const meses = await Promise.all(convenios.map((c) => listarIds(`convenios/${c.id}/escalas`).catch(() => [])));
    periodosCargados = Object.fromEntries(convenios.map((c, i) => [c.id, meses[i]]));
  } catch (error) {
    console.error("El sitemap sale sin las páginas de los convenios:", error);
  }
  return armarMapaDelSitio({ convenios, acuerdos, novedades, periodosCargados });
}
