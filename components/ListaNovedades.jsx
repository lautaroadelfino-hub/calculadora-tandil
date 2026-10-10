// components/ListaNovedades.jsx
// La lista de novedades, en el servidor: fecha, etiqueta en castellano, título
// (con link si lo tiene) y, cuando la novedad es de un convenio, un chip que
// lleva a las novedades de ese convenio. La usan /novedades y
// /novedades/<convenio>.
//
// POR QUÉ EXISTE: /novedades se armaba en el navegador con el SDK de Firebase
// (150 KB) y el HTML del servidor traía sólo tres bloques grises: Google no
// veía ninguna novedad. Y el tag se mostraba crudo ("release"), cosa que marcó
// la auditoría del 5/10/2026.
import Link from "next/link";
import { fechaLarga } from "@/lib/fechas";

export const ETIQUETA_DE_TAG = { release: "Novedad", acuerdo: "Acuerdo paritario", aviso: "Aviso" };
const CHIP_DE_TAG = {
  release: "bg-emerald-50 text-emerald-800",
  acuerdo: "bg-sky-50 text-sky-800",
  aviso: "bg-amber-50 text-amber-800",
};

/**
 * @param novedades        ya filtradas y ordenadas (lib/novedadesPublicadas.js)
 * @param nombresDeConvenio { convenioId: nombre } para el chip; vacío en la página de un convenio
 */
export default function ListaNovedades({ novedades, nombresDeConvenio = {} }) {
  return (
    <ul className="space-y-3">
      {novedades.map((n) => {
        const tag = String(n.tag || "").toLowerCase();
        const externa = n.url ? /^https?:\/\//i.test(n.url) : false;
        const nombre = n.convenioId ? nombresDeConvenio[n.convenioId] : null;
        const titulo = <h2 className="mt-1 text-base font-semibold text-slate-900 [overflow-wrap:anywhere]">{n.title}</h2>;
        return (
          <li key={n.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{fechaLarga(n.date)}</span>
              {ETIQUETA_DE_TAG[tag] ? (
                <span className={`rounded-md px-2 py-0.5 font-medium ${CHIP_DE_TAG[tag]}`}>{ETIQUETA_DE_TAG[tag]}</span>
              ) : null}
              {nombre ? (
                <Link href={`/novedades/${encodeURIComponent(n.convenioId)}`} className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:underline">
                  {nombre}
                </Link>
              ) : null}
            </div>
            {n.url ? (
              <a href={n.url} {...(externa ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="block hover:underline">
                {titulo}
              </a>
            ) : (
              titulo
            )}
          </li>
        );
      })}
    </ul>
  );
}
