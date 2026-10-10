// app/acuerdos/[convenioId]/[slug]/page.jsx
// La página de UN acuerdo o escala: título, fecha, vigencia, descarga, fuente,
// el anterior y el siguiente del mismo convenio y el paso a la calculadora.
//
// POR QUÉ EXISTE: lo que la gente busca en Google es "escala salarial
// camioneros septiembre 2026", y Google sólo puede mostrar una URL que trate
// de eso. Hasta ahora cada acuerdo era una fila dentro de la página del
// convenio. Las URLs se generan solas de lo que el dueño carga en /admin
// (slug en lib/acuerdosPublicados.js).
//
// Mismo patrón que la página del convenio: edge, sin loading.js, notFound()
// fuera del try y SinDatos si Firestore no responde.
import { notFound } from "next/navigation";
import Link from "next/link";
import { convenioCacheado, acuerdosCacheados, esIdDeConvenio } from "@/lib/datosCalculadora";
import { metadataDeAcuerdo, tituloDeConvenio } from "@/lib/metadataConvenio";
import { acuerdosPublicados, acuerdoPorSlug, vecinosDe, etiquetaDeTipo, etiquetaDeFormato, ES_SLUG } from "@/lib/acuerdosPublicados";
import { fechaLarga } from "@/lib/fechas";
import { jsonLdMigas, jsonLdAcuerdo } from "@/lib/jsonLd";
import EncabezadoConvenio from "@/components/EncabezadoConvenio";
import JsonLd from "@/components/JsonLd";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

const esRutaValida = (convenioId, slug) => esIdDeConvenio(convenioId) && ES_SLUG.test(String(slug || ""));

export async function generateMetadata({ params }) {
  const { convenioId, slug } = await params;
  try {
    if (esRutaValida(convenioId, slug)) {
      const [convenio, acuerdos] = await Promise.all([convenioCacheado(convenioId), acuerdosCacheados()]);
      const acuerdo = acuerdoPorSlug(acuerdos, convenioId, slug);
      if (convenio && acuerdo) return metadataDeAcuerdo(acuerdo, convenio, convenioId, { etiquetaDeTipo, fechaLarga });
    }
  } catch {
    // Sin red: queda el título general.
  }
  return { title: "Acuerdos y escalas" };
}

/** "Escala salarial de Camioneros (CCT 40/89) del 1 sept 2026, vigente para septiembre 2026." */
function descripcionDe(acuerdo, convenio) {
  const vigencia = acuerdo.vigencia ? `, vigente para ${acuerdo.vigencia}` : "";
  return `${etiquetaDeTipo(acuerdo.tipo)} de ${tituloDeConvenio(convenio, "")} del ${fechaLarga(acuerdo.fecha)}${vigencia}.`;
}

export default async function PaginaAcuerdo({ params }) {
  const { convenioId, slug } = await params;
  if (!esRutaValida(convenioId, slug)) notFound();
  let convenio;
  let acuerdos;
  try {
    [convenio, acuerdos] = await Promise.all([convenioCacheado(convenioId), acuerdosCacheados()]);
  } catch (error) {
    console.error("No se pudo leer el acuerdo:", error);
    return <SinDatos titulo="No pudimos traer el acuerdo" destino={`/acuerdos/${encodeURIComponent(convenioId)}/${slug}`} />;
  }
  if (!convenio) notFound();
  const acuerdo = acuerdoPorSlug(acuerdos, convenioId, slug);
  if (!acuerdo) notFound();

  const delConvenio = acuerdosPublicados(acuerdos, { convenioId });
  const { anterior, siguiente } = vecinosDe(delConvenio, acuerdo.id);
  const id = encodeURIComponent(convenioId);
  const url = `/acuerdos/${id}/${acuerdo.slug}`;
  const formato = etiquetaDeFormato(acuerdo.archivoTipo);
  const descripcion = descripcionDe(acuerdo, convenio);
  const activo = convenio.activo !== false;
  const linkVecino = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 [overflow-wrap:anywhere]";

  return (
    <div className="max-w-5xl mx-auto py-8 min-h-[calc(100svh-var(--h-header))]">
      <JsonLd
        datos={jsonLdMigas([
          { nombre: "Inicio", url: "/" },
          { nombre: "Acuerdos y escalas", url: "/acuerdos" },
          { nombre: convenio.nombre, url: `/acuerdos/${id}` },
          { nombre: acuerdo.titulo, url },
        ])}
      />
      <JsonLd datos={jsonLdAcuerdo({ acuerdo, convenio, url, descripcion })} />

      <EncabezadoConvenio
        convenio={convenio}
        convenioId={convenioId}
        seccion={`Acuerdos y escalas · ${convenio.nombre}`}
        activa="acuerdos"
        titulo={acuerdo.titulo}
      />

      <article className="rounded-2xl border border-slate-200 bg-white/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{etiquetaDeTipo(acuerdo.tipo)}</span>
          <span>{fechaLarga(acuerdo.fecha)}</span>
          {acuerdo.vigencia ? <span>Vigencia: {acuerdo.vigencia}</span> : null}
        </div>
        <p className="mt-2 text-sm text-slate-600">{descripcion}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {acuerdo.archivoUrl ? (
            <a
              href={acuerdo.archivoUrl}
              target="_blank"
              rel="noopener"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              Descargar{formato ? ` ${formato}` : ""}
            </a>
          ) : null}
          {acuerdo.fuenteUrl ? (
            <a
              href={acuerdo.fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Fuente
            </a>
          ) : null}
          {activo ? (
            <Link href={`/calcular/${id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 font-medium text-emerald-700 hover:bg-emerald-100">
              Calcular el sueldo con esta escala →
            </Link>
          ) : null}
        </div>
      </article>

      {anterior || siguiente ? (
        <nav aria-label="Otros acuerdos del convenio" className="mt-4 flex flex-wrap justify-between gap-2">
          {anterior ? (
            <Link href={`/acuerdos/${id}/${anterior.slug}`} className={linkVecino}>
              ← {anterior.titulo}
            </Link>
          ) : <span />}
          {siguiente ? (
            <Link href={`/acuerdos/${id}/${siguiente.slug}`} className={linkVecino}>
              {siguiente.titulo} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
