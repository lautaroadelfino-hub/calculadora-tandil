// app/novedades/[convenioId]/page.jsx
// Las novedades de un convenio (las que el dueño cargó con ese convenio desde
// /admin). Se arma en el servidor por la API REST de Firestore. Misma
// estructura que /acuerdos/<convenio>: ver los comentarios de esa página sobre
// el 404 y el runtime.
import { notFound } from "next/navigation";
import { convenioCacheado, esIdDeConvenio } from "@/lib/datosCalculadora";
import { listarColeccion } from "@/lib/firestoreRest";
import { metadataDeNovedadesDeConvenio } from "@/lib/metadataConvenio";
import { novedadesPublicadas } from "@/lib/novedadesPublicadas";
import EncabezadoConvenio from "@/components/EncabezadoConvenio";
import ListaNovedades from "@/components/ListaNovedades";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

const CAMPOS_DE_NOVEDAD = ["date", "title", "url", "tag", "published", "convenioId"];

export async function generateMetadata({ params }) {
  const { convenioId } = await params;
  let convenio = null;
  try {
    if (esIdDeConvenio(convenioId)) convenio = await convenioCacheado(convenioId);
  } catch {
    // Sin red: queda "Novedades", que es verdad igual.
  }
  return metadataDeNovedadesDeConvenio(convenio, convenioId);
}

export default async function PaginaNovedadesDeConvenio({ params }) {
  const { convenioId } = await params;
  if (!esIdDeConvenio(convenioId)) notFound();
  let convenio;
  let novedades;
  try {
    [convenio, novedades] = await Promise.all([
      convenioCacheado(convenioId),
      listarColeccion("novedades", { campos: CAMPOS_DE_NOVEDAD }),
    ]);
  } catch (error) {
    console.error("No se pudieron leer las novedades:", error);
    return <SinDatos titulo="No pudimos traer las novedades" destino={`/novedades/${encodeURIComponent(convenioId)}`} />;
  }
  if (!convenio) notFound();

  const lista = novedadesPublicadas(novedades, 50, { convenioId });
  return (
    <div className="max-w-5xl mx-auto py-8 min-h-[calc(100svh-var(--h-header))]">
      <EncabezadoConvenio convenio={convenio} convenioId={convenioId} seccion="Novedades" activa="novedades" />
      {lista.length === 0 ? (
        <p className="text-sm text-slate-600">Todavía no hay novedades de este convenio.</p>
      ) : (
        <ListaNovedades novedades={lista} />
      )}
    </div>
  );
}
