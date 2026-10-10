// components/EncabezadoConvenio.jsx
// El encabezado de las páginas de un convenio que no son la calculadora
// (/acuerdos/<id> y /novedades/<id>): nombre, CCT y el paso entre las tres
// páginas del convenio. Componente de servidor: no tiene estado ni eventos.
import Link from "next/link";

const PESTANAS = [
  { id: "calcular", texto: "Calcular", href: (id) => `/calcular/${id}` },
  { id: "acuerdos", texto: "Acuerdos", href: (id) => `/acuerdos/${id}` },
  { id: "novedades", texto: "Novedades", href: (id) => `/novedades/${id}` },
];

/**
 * @param convenio   { nombre, cct, activo } leído por REST
 * @param convenioId el id de la URL
 * @param seccion    lo que dice la línea chica arriba del título
 * @param activa     "calcular" | "acuerdos" | "novedades": la página en la que estamos
 * @param titulo     el h1; por defecto, el nombre del convenio. La página de
 *                   un acuerdo pone el título del acuerdo, que es lo que se busca.
 */
export default function EncabezadoConvenio({ convenio, convenioId, seccion, activa, titulo }) {
  const id = encodeURIComponent(convenioId);
  const sinCalculadora = convenio.activo === false;
  return (
    <header className="mb-6 print:hidden">
      {seccion ? <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{seccion}</p> : null}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 [overflow-wrap:anywhere]">{titulo || convenio.nombre}</h1>
        {convenio.cct ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">CCT {convenio.cct}</span>
        ) : null}
      </div>
      <nav aria-label="Páginas del convenio" className="mt-4 flex flex-wrap gap-2 text-sm">
        {PESTANAS.map((p) => {
          if (p.id === activa) {
            return (
              <span key={p.id} aria-current="page" className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-white">
                {p.texto}
              </span>
            );
          }
          // Un convenio inactivo todavía no tiene calculadora: se dice, en vez
          // de llevar a una página que no existe o a un formulario vacío.
          if (p.id === "calcular" && sinCalculadora) {
            return (
              <span key={p.id} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-slate-500">
                Calculadora en preparación
              </span>
            );
          }
          return (
            <Link
              key={p.id}
              href={p.href(id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {p.texto}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
