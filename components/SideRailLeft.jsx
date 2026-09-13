// components/SideRailLeft.jsx
"use client";
import React from "react";
import { getNovedades } from "@/lib/novedades";
import { herramientasEnCamino } from "@/lib/herramientas";

function formatDate(ymd) {
  // ymd = "YYYY-MM-DD"
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}`;
}

const FALLBACK = [];

/**
 * @param enPreparacion  Convenios cargados pero todavía inactivos. Aparecen
 *   solos en "Próximas actualizaciones": cuando el dueño los activa, pasan a
 *   ser tarjetas de la portada sin que nadie edite una línea de código.
 */
export default function SideRailLeft({ enPreparacion = [] }) {
  const [news, setNews] = React.useState(FALLBACK);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let ignore = false;
    getNovedades({ limit: 24 })
      .then((data) => { if (!ignore) setNews(data); })
      .catch(() => { if (!ignore) setNews(FALLBACK); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const byDateDesc = news || [];
  const latest = byDateDesc.slice(0, 6);
  const acuerdos = byDateDesc.filter(n => n.tag === "acuerdo").slice(0, 6);

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      {/* Últimas novedades */}
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Últimas novedades</h3>

        {loading ? (
          <ul className="mt-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <li key={i} className="h-6 rounded bg-slate-100 animate-pulse" />
            ))}
          </ul>
        ) : latest.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">No hay novedades por ahora.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {latest.map((n) => (
              <li key={n.id} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                  {formatDate(n.date)}
                </span>
                {n.url ? (
                  <a href={n.url} className="text-sm leading-5 hover:underline">
                    {n.title}
                  </a>
                ) : (
                  <span className="text-sm leading-5">{n.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Acuerdos recientes */}
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Acuerdos recientes</h3>

        {loading ? (
          <ul className="mt-3 space-y-2">
            {[...Array(3)].map((_, i) => (
              <li key={i} className="h-6 rounded bg-slate-100 animate-pulse" />
            ))}
          </ul>
        ) : acuerdos.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">Aún no cargamos acuerdos.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {acuerdos.map((n) => (
              <li key={n.id} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
                  {formatDate(n.date)}
                </span>
                {n.url ? (
                  <a href={n.url} className="text-sm leading-5 hover:underline">
                    {n.title}
                  </a>
                ) : (
                  <span className="text-sm leading-5">{n.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

{/* Próximas actualizaciones.
    Antes era una lista literal en el JSX: cuando el dueño cargaba un convenio
    nuevo, tenía que editar código para sacarlo de acá. Ahora se arma sola con
    los convenios que están cargados pero todavía inactivos, más las
    herramientas que figuran como no disponibles en lib/herramientas.js. */}
{(enPreparacion.length > 0 || herramientasEnCamino().length > 0) && (
  <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
    <h3 className="text-sm font-semibold text-slate-700">Próximas actualizaciones</h3>
    <ul className="mt-3 space-y-2">
      {enPreparacion.map((c) => (
        <li key={c.id} className="text-sm leading-5">
          {c.nombre}
          {c.cct ? <span className="text-slate-400"> · CCT {c.cct}</span> : null}
        </li>
      ))}
      {herramientasEnCamino().map((h) => (
        <li key={h.id} className="text-sm leading-5">{h.nombre}</li>
      ))}
    </ul>
  </div>
)}

    </aside>
  );
}
