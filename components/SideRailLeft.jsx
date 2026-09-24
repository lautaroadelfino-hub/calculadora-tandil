// components/SideRailLeft.jsx
"use client";
import React from "react";
import { herramientasEnCamino } from "@/lib/herramientas";
import { fechaCorta } from "@/lib/fechas";

// Con año: sin él, "13/09" (2026) arriba de "15/11" (2025) se leía desordenado.
const formatDate = (ymd) => fechaCorta(ymd) || ymd || "";

const FALLBACK = [];

/**
 * @param enPreparacion  Convenios cargados pero todavía inactivos. Aparecen
 *   solos en "Próximas actualizaciones": cuando el dueño los activa, pasan a
 *   ser tarjetas de la portada sin que nadie edite una línea de código.
 * @param novedades  Las novedades ya leídas en el servidor (la portada las
 *   pasa). Si no vienen, se piden desde el navegador; el SDK de Firebase se
 *   carga recién en ese caso, para que las páginas que ya traen los datos no
 *   lo descarguen.
 */
export default function SideRailLeft({ enPreparacion = [], novedades = null }) {
  const [news, setNews] = React.useState(novedades || FALLBACK);
  const [loading, setLoading] = React.useState(!novedades);

  React.useEffect(() => {
    if (novedades) { setNews(novedades); setLoading(false); return; }
    let ignore = false;
    import("@/lib/novedades")
      .then(({ getNovedades }) => getNovedades({ limit: 24 }))
      .then((data) => { if (!ignore) setNews(data); })
      .catch(() => { if (!ignore) setNews(FALLBACK); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [novedades]);

  const byDateDesc = news || [];
  const latest = byDateDesc.slice(0, 6);
  const acuerdos = byDateDesc.filter(n => n.tag === "acuerdo").slice(0, 6);

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      {/* Últimas novedades. Si no hay ninguna, la tarjeta no se dibuja: un
          título con "no hay nada" debajo no informa. */}
      {(loading || latest.length > 0) && (
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Últimas novedades</h3>

        {loading ? (
          <ul className="mt-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <li key={i} className="h-6 rounded bg-slate-100 animate-pulse" />
            ))}
          </ul>
        ) : latest.length === 0 ? null : (
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
      )}

      {/* Acuerdos recientes */}
      {(loading || acuerdos.length > 0) && (
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Acuerdos recientes</h3>

        {loading ? (
          <ul className="mt-3 space-y-2">
            {[...Array(3)].map((_, i) => (
              <li key={i} className="h-6 rounded bg-slate-100 animate-pulse" />
            ))}
          </ul>
        ) : acuerdos.length === 0 ? null : (
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
      )}

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
          {c.cct ? <span className="text-slate-500"> · CCT {c.cct}</span> : null}
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
