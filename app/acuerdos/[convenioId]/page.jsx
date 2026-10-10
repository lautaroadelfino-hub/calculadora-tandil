// app/acuerdos/[convenioId]/page.jsx
// Los acuerdos paritarios y escalas de un convenio, con el archivo de cada uno
// para descargar. Se arma en el servidor (edge de Cloudflare) leyendo el
// convenio y la colección "acuerdos" por la API REST de Firestore; el navegador
// no baja el SDK de Firebase.
//
// El 404 de un convenio inexistente se decide acá, antes de empezar a mandar la
// página: este segmento no tiene loading.js a propósito, porque con una
// frontera de Suspense el código HTTP ya no se puede cambiar. notFound() lanza,
// así que se llama FUERA del try: adentro, el catch se lo tragaría.
//
// `runtime = "edge"` figura como deprecado en Next 16; se mantiene porque el
// despliegue en Cloudflare Pages lo necesita (ver docs/continuidad.md).
import { notFound } from "next/navigation";
import { convenioCacheado, esIdDeConvenio } from "@/lib/datosCalculadora";
import { listarColeccion } from "@/lib/firestoreRest";
import { metadataDeAcuerdos } from "@/lib/metadataConvenio";
import { acuerdosPublicados, CAMPOS_DE_ACUERDO } from "@/lib/acuerdosPublicados";
import EncabezadoConvenio from "@/components/EncabezadoConvenio";
import ListaAcuerdos from "@/components/ListaAcuerdos";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

export async function generateMetadata({ params }) {
  const { convenioId } = await params;
  let convenio = null;
  try {
    if (esIdDeConvenio(convenioId)) convenio = await convenioCacheado(convenioId);
  } catch {
    // Sin red: queda "Acuerdos y escalas", que es verdad igual.
  }
  return metadataDeAcuerdos(convenio, convenioId);
}

export default async function PaginaAcuerdos({ params }) {
  const { convenioId } = await params;
  if (!esIdDeConvenio(convenioId)) notFound();
  let convenio;
  let acuerdos;
  try {
    [convenio, acuerdos] = await Promise.all([
      convenioCacheado(convenioId),
      listarColeccion("acuerdos", { campos: CAMPOS_DE_ACUERDO }),
    ]);
  } catch (error) {
    console.error("No se pudieron leer los acuerdos:", error);
    return <SinDatos titulo="No pudimos traer los acuerdos" destino={`/acuerdos/${encodeURIComponent(convenioId)}`} />;
  }
  if (!convenio) notFound();

  const lista = acuerdosPublicados(acuerdos, { convenioId });
  return (
    <div className="max-w-5xl mx-auto py-8 min-h-[calc(100svh-var(--h-header))]">
      <EncabezadoConvenio convenio={convenio} convenioId={convenioId} seccion="Acuerdos y escalas" activa="acuerdos" />
      {lista.length === 0 ? (
        <p className="text-sm text-slate-600">Todavía no hay acuerdos cargados.</p>
      ) : (
        <ListaAcuerdos acuerdos={lista} />
      )}
    </div>
  );
}
