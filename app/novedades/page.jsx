// app/novedades/page.jsx
// Todas las novedades, del sitio y de cada convenio, armadas en el servidor
// por la API REST de Firestore (antes se pedían desde el navegador con el SDK
// y Google no veía ninguna).
//
// La página es la tapa de un diario: el cabezal, las secciones (una por
// convenio que tenga novedades) y la grilla de recuadros de
// components/ListaNovedades.jsx.
//
// Sin ninguna novedad publicada, la página no se indexa (y lib/mapaDelSitio.js
// no la lista): vacía estuvo en Google desde el 10/10/2026, que la visitó y la
// dejó afuera. El noindex va en el cuerpo, como en SinDatos: React lo sube al
// <head>, y entre este y el "index" general Google toma el más restrictivo.
import Link from "next/link";
import { listarColeccion } from "@/lib/firestoreRest";
import { novedadesPublicadas, CAMPOS_DE_NOVEDAD } from "@/lib/novedadesPublicadas";
import { metadataDePagina } from "@/lib/metadataConvenio";
import { fechaLarga } from "@/lib/fechas";
import ListaNovedades from "@/components/ListaNovedades";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

/** Cuántas entran en la tapa. Las más viejas siguen en la página de su convenio. */
const EN_LA_TAPA = 20;

export const metadata = metadataDePagina({
  title: "Novedades",
  description: "Novedades de liquidar.ar: paritarias, escalas y avisos de cada convenio, y cambios de la calculadora.",
  canonical: "/novedades",
});

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
  const publicadas = novedadesPublicadas(novedades, Infinity);
  const lista = publicadas.slice(0, EN_LA_TAPA);
  const nombresDeConvenio = Object.fromEntries(convenios.map((c) => [c.id, c.nombre]));
  // Las secciones: sólo los convenios que tienen alguna novedad, para que
  // ninguna lleve a una página vacía.
  const secciones = convenios
    .filter((c) => c.nombre && publicadas.some((n) => n.convenioId === c.id))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
  return (
    <div className="max-w-5xl mx-auto py-8 min-h-[calc(100svh-var(--h-header))]">
      <header className="border-t-4 border-slate-900 pt-3.5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5">
          <div>
            <h1 className="text-5xl font-extrabold leading-none tracking-tight text-slate-900 sm:text-6xl">Novedades</h1>
            <p className="mt-3 text-[15px] leading-normal text-slate-600">
              Paritarias, escalas y avisos de cada convenio, y los cambios de la calculadora.
            </p>
          </div>
          {lista.length ? <p className="text-[13px] text-slate-500">Última novedad: {fechaLarga(lista[0].date)}</p> : null}
        </div>
        {secciones.length ? (
          <nav aria-label="Novedades por convenio" className="mt-4 flex flex-wrap gap-x-7 border-y border-slate-200 text-sm font-semibold">
            <span aria-current="page" className="py-3 text-slate-900 shadow-[inset_0_-2px_0_#059669]">
              Todas
            </span>
            {secciones.map((c) => (
              <Link
                key={c.id}
                href={`/novedades/${encodeURIComponent(c.id)}`}
                className="py-3 text-slate-600 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                {c.nombre}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <div className="mt-6">
        {lista.length === 0 ? (
          <>
            <meta name="robots" content="noindex, follow" />
            <p className="text-sm text-slate-600">Todavía no hay novedades publicadas.</p>
          </>
        ) : (
          <ListaNovedades novedades={lista} nombresDeConvenio={nombresDeConvenio} />
        )}
      </div>
    </div>
  );
}
