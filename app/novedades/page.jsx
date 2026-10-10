// app/novedades/page.jsx
// Todas las novedades, del sitio y de cada convenio, armadas en el servidor
// por la API REST de Firestore (antes se pedían desde el navegador con el SDK
// y Google no veía ninguna). Misma estructura que /acuerdos.
import { listarColeccion } from "@/lib/firestoreRest";
import { novedadesPublicadas } from "@/lib/novedadesPublicadas";
import { metadataDePagina } from "@/lib/metadataConvenio";
import ListaNovedades from "@/components/ListaNovedades";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

export const metadata = metadataDePagina({
  title: "Novedades",
  description: "Novedades de liquidar.ar: paritarias, escalas y avisos de cada convenio, y cambios de la calculadora.",
  canonical: "/novedades",
});

const CAMPOS_DE_NOVEDAD = ["date", "title", "url", "tag", "published", "convenioId"];

export default async function PaginaNovedades() {
  let novedades;
  let convenios;
  try {
    [novedades, convenios] = await Promise.all([
      listarColeccion("novedades", { campos: CAMPOS_DE_NOVEDAD }),
      listarColeccion("convenios", { campos: ["nombre"] }).catch(() => []),
    ]);
  } catch (error) {
    console.error("No se pudieron leer las novedades:", error);
    return <SinDatos titulo="No pudimos traer las novedades" destino="/novedades" />;
  }
  const lista = novedadesPublicadas(novedades, 20);
  const nombresDeConvenio = Object.fromEntries(convenios.map((c) => [c.id, c.nombre]));
  return (
    <div className="max-w-5xl mx-auto py-8 min-h-[calc(100svh-var(--h-header))]">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Novedades</h1>
      {lista.length === 0 ? (
        <p className="text-sm text-slate-600">Todavía no hay novedades publicadas.</p>
      ) : (
        <ListaNovedades novedades={lista} nombresDeConvenio={nombresDeConvenio} />
      )}
    </div>
  );
}
