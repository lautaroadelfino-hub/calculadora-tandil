// app/acuerdos/page.jsx
// Todos los acuerdos y escalas, una tarjeta por convenio en grilla (tres por
// fila, como la portada): cada una lista sus tres más nuevos con la descarga
// a un toque y un link a la página completa del convenio. Se arma en el
// servidor por la API REST de Firestore, como la portada.
//
// POR QUÉ UNA GRILLA Y NO UNA LISTA: la primera versión apilaba un bloque por
// convenio hacia abajo, y quien buscaba el suyo tenía que bajar hasta
// encontrarlo (dueño, 10/10/2026). Con las tarjetas lado a lado todos quedan
// a la vista. Un convenio inactivo (sin calculadora todavía) aparece igual si
// tiene acuerdos: la información sirve aunque la calculadora no esté.
import Link from "next/link";
import { listarColeccion } from "@/lib/firestoreRest";
import { acuerdosPublicados, CAMPOS_DE_ACUERDO, etiquetaDeFormato } from "@/lib/acuerdosPublicados";
import { ordenarConvenios } from "@/lib/directorio";
import { estiloDeSector } from "@/lib/herramientas";
import { fechaCorta } from "@/lib/fechas";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

export const metadata = {
  title: "Acuerdos y escalas",
  description:
    "Acuerdos paritarios, escalas salariales y homologaciones por convenio colectivo, con el documento de cada uno para descargar.",
  alternates: { canonical: "/acuerdos" },
};

const POR_CONVENIO = 3;

/** Flecha hacia una bandeja: "bajar el archivo". */
function IconoDescarga() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
    </svg>
  );
}

/** Una fila de la tarjeta: fecha, título y el archivo (o la fuente, si no hay archivo). */
function FilaAcuerdo({ acuerdo }) {
  const href = acuerdo.archivoUrl || acuerdo.fuenteUrl;
  const formato = etiquetaDeFormato(acuerdo.archivoTipo);
  const etiqueta = acuerdo.archivoUrl ? `Descargar ${formato || "archivo"}: ${acuerdo.titulo}` : `Fuente: ${acuerdo.titulo}`;
  const contenido = (
    <>
      <span className="w-[62px] shrink-0 text-xs text-slate-500">{fechaCorta(acuerdo.fecha)}</span>
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{acuerdo.titulo}</span>
      {href ? (
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <IconoDescarga />
        </span>
      ) : null}
    </>
  );
  const clases = "flex items-center gap-3 px-4 py-3";
  if (!href) return <li className={clases}>{contenido}</li>;
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        aria-label={etiqueta}
        className={`${clases} hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500`}
      >
        {contenido}
      </a>
    </li>
  );
}

export default async function PaginaAcuerdos() {
  let convenios;
  let acuerdos;
  try {
    [convenios, acuerdos] = await Promise.all([
      listarColeccion("convenios", { campos: ["nombre", "cct", "sector", "activo"] }),
      listarColeccion("acuerdos", { campos: CAMPOS_DE_ACUERDO }),
    ]);
  } catch (error) {
    console.error("No se pudieron leer los acuerdos:", error);
    return <SinDatos titulo="No pudimos traer los acuerdos" destino="/acuerdos" />;
  }

  const tarjetas = ordenarConvenios(convenios)
    .map((c) => {
      const todos = acuerdosPublicados(acuerdos, { convenioId: c.id });
      return { convenio: c, total: todos.length, ultimos: todos.slice(0, POR_CONVENIO) };
    })
    .filter((t) => t.total > 0);

  return (
    <div className="w-full max-w-[1600px] mx-auto py-6 sm:py-8 min-h-[calc(100svh-var(--h-header))]">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Acuerdos y escalas</h1>
      {tarjetas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">Todavía no hay acuerdos cargados.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {tarjetas.map(({ convenio, total, ultimos }) => {
            const href = `/acuerdos/${encodeURIComponent(convenio.id)}`;
            const estilos = estiloDeSector(convenio.sector);
            return (
              <section
                key={convenio.id}
                aria-labelledby={`acuerdos-${convenio.id}`}
                className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white/80 shadow-sm ${estilos.border}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-slate-100 px-4 pt-4 pb-3">
                  <h2 id={`acuerdos-${convenio.id}`} className="min-w-0 text-lg font-bold text-slate-900 [overflow-wrap:anywhere]">
                    <Link href={href} className="hover:underline">{convenio.nombre}</Link>
                  </h2>
                  {convenio.cct ? <span className="text-xs text-slate-500">CCT {convenio.cct}</span> : null}
                </div>
                <ul className="divide-y divide-slate-100">
                  {ultimos.map((a) => (
                    <FilaAcuerdo key={a.id} acuerdo={a} />
                  ))}
                </ul>
                <Link
                  href={href}
                  className={`mt-auto border-t border-slate-100 px-4 py-3 text-[13px] font-semibold hover:underline ${estilos.texto}`}
                >
                  Ver {total === 1 ? "el acuerdo" : `los ${total} acuerdos`} →
                </Link>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
