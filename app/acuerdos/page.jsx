// app/acuerdos/page.jsx
// Todos los acuerdos y escalas, agrupados por convenio: los tres más nuevos de
// cada uno y un link a la página completa del convenio. Se arma en el servidor
// por la API REST de Firestore, como la portada. Un convenio inactivo (sin
// calculadora todavía) aparece igual si tiene acuerdos: la información sirve
// aunque la calculadora no esté.
import Link from "next/link";
import { listarColeccion } from "@/lib/firestoreRest";
import { acuerdosPublicados, CAMPOS_DE_ACUERDO } from "@/lib/acuerdosPublicados";
import { ordenarConvenios } from "@/lib/directorio";
import ListaAcuerdos from "@/components/ListaAcuerdos";
import SinDatos from "@/components/SinDatos";

export const runtime = "edge";

export const metadata = {
  title: "Acuerdos y escalas",
  description:
    "Acuerdos paritarios, escalas salariales y homologaciones por convenio colectivo, con el documento de cada uno para descargar.",
  alternates: { canonical: "/acuerdos" },
};

const POR_CONVENIO = 3;

export default async function PaginaAcuerdos() {
  let convenios;
  let acuerdos;
  try {
    [convenios, acuerdos] = await Promise.all([
      listarColeccion("convenios", { campos: ["nombre", "cct", "activo"] }),
      listarColeccion("acuerdos", { campos: CAMPOS_DE_ACUERDO }),
    ]);
  } catch (error) {
    console.error("No se pudieron leer los acuerdos:", error);
    return <SinDatos titulo="No pudimos traer los acuerdos" destino="/acuerdos" />;
  }

  const bloques = ordenarConvenios(convenios)
    .map((c) => {
      const todos = acuerdosPublicados(acuerdos, { convenioId: c.id });
      return { convenio: c, total: todos.length, ultimos: todos.slice(0, POR_CONVENIO) };
    })
    .filter((b) => b.total > 0);

  return (
    <div className="max-w-5xl mx-auto py-8 min-h-[calc(100svh-var(--h-header))]">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Acuerdos y escalas</h1>
      {bloques.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">Todavía no hay acuerdos cargados.</p>
      ) : (
        <div className="mt-6 space-y-10">
          {bloques.map(({ convenio, total, ultimos }) => {
            const href = `/acuerdos/${encodeURIComponent(convenio.id)}`;
            return (
              <section key={convenio.id} aria-labelledby={`acuerdos-${convenio.id}`}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 pb-2">
                  <h2 id={`acuerdos-${convenio.id}`} className="text-lg font-bold text-slate-900 [overflow-wrap:anywhere]">
                    <Link href={href} className="hover:underline">{convenio.nombre}</Link>
                  </h2>
                  {convenio.cct ? <span className="text-xs text-slate-500">CCT {convenio.cct}</span> : null}
                </div>
                <ListaAcuerdos acuerdos={ultimos} />
                {total > ultimos.length ? (
                  <Link href={href} className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline">
                    Ver los {total} acuerdos →
                  </Link>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
