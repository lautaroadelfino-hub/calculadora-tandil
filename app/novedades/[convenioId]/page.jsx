// app/novedades/[convenioId]/page.jsx
// Las novedades de un convenio (las que el dueño cargó con ese convenio desde
// /admin). Se arma en el servidor por la API REST de Firestore. Misma
// estructura que /acuerdos/<convenio>: ver los comentarios de esa página sobre
// el 404 y el runtime. Las novedades van en la misma grilla de recuadros que
// la tapa general (components/ListaNovedades.jsx), sin repetir la sección.
import { notFound } from "next/navigation";
import Link from "next/link";
import { convenioCacheado, esIdDeConvenio } from "@/lib/datosCalculadora";
import { listarColeccion } from "@/lib/firestoreRest";
import { metadataDeNovedadesDeConvenio } from "@/lib/metadataConvenio";
import { novedadesPublicadas, CAMPOS_DE_NOVEDAD } from "@/lib/novedadesPublicadas";
import EncabezadoConvenio from "@/components/EncabezadoConvenio";
import ListaNovedades from "@/components/ListaNovedades";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

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
        <>
          {/* Vacía no se indexa ni va al mapa del sitio: ver app/novedades/page.jsx. */}
          <meta name="robots" content="noindex, follow" />
          <p className="text-sm text-slate-600">Todavía no hay novedades de este convenio.</p>
        </>
      ) : (
        <ListaNovedades novedades={lista} />
      )}
      <p className="mt-5 text-sm">
        <Link
          href="/novedades"
          className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Las novedades de todos los convenios
        </Link>
      </p>
    </div>
  );
}
