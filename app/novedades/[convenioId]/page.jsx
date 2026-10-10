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
import { fechaLarga } from "@/lib/fechas";
import EncabezadoConvenio from "@/components/EncabezadoConvenio";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

const CAMPOS_DE_NOVEDAD = ["date", "title", "url", "tag", "published", "convenioId"];

// En público el tag va en castellano; la auditoría del 5/10/2026 marcó que en
// /novedades se veía el valor crudo ("release").
const ETIQUETA_DE_TAG = { release: "Novedad", acuerdo: "Acuerdo paritario", aviso: "Aviso" };
const CHIP_DE_TAG = {
  release: "bg-emerald-50 text-emerald-800",
  acuerdo: "bg-sky-50 text-sky-800",
  aviso: "bg-amber-50 text-amber-800",
};

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
        <ul className="space-y-3">
          {lista.map((n) => {
            const tag = String(n.tag || "").toLowerCase();
            const externa = n.url ? /^https?:\/\//i.test(n.url) : false;
            const titulo = <h2 className="mt-1 text-base font-semibold text-slate-900 [overflow-wrap:anywhere]">{n.title}</h2>;
            return (
              <li key={n.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{fechaLarga(n.date)}</span>
                  {ETIQUETA_DE_TAG[tag] ? (
                    <span className={`rounded-md px-2 py-0.5 font-medium ${CHIP_DE_TAG[tag]}`}>{ETIQUETA_DE_TAG[tag]}</span>
                  ) : null}
                </div>
                {n.url ? (
                  <a
                    href={n.url}
                    {...(externa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="block hover:underline"
                  >
                    {titulo}
                  </a>
                ) : (
                  titulo
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
