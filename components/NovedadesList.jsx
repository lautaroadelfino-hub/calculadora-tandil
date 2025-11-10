"use client";
import { useEffect, useState } from "react";

// formateo fecha es-AR
const DATE_FMT = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtDate = (v) => {
  const d = new Date(v);
  return isNaN(d) ? "" : DATE_FMT.format(d);
};

// colores por tag (según ejemplos: release, acuerdo, aviso)
const TAG_STYLE = {
  release: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  acuerdo: "bg-blue-50 text-blue-700 ring-blue-200",
  aviso: "bg-amber-50 text-amber-800 ring-amber-200",
};

export default function NovedadesList({
  limit = 20,              // ajustá cuántas querés traer
  endpoint = "/api/news",  // tu API pública de Cloudflare Pages Functions
}) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const url = `${endpoint}?limit=${encodeURIComponent(limit)}`;

    fetch(url, { signal: ctrl.signal, credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((arr) => {
        // la API ya devuelve array [{id,date,title,url,tag}, ...] y sólo published=1
        // por las dudas, ordenamos por fecha desc (aunque ya viene así)
        const sorted = [...arr].sort(
          (a, b) => new Date(b?.date || 0) - new Date(a?.date || 0)
        );
        setItems(sorted);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e);
          setItems([]);
        }
      });

    return () => ctrl.abort();
  }, [endpoint, limit]);

  // Skeleton
  if (!items && !error) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600">No se pudieron cargar las novedades. Probá de nuevo.</p>;
  }

  if (items.length === 0) {
    return <p className="text-gray-600">Todavía no hay novedades publicadas.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((n) => {
        const dateStr = fmtDate(n.date);
        const tag = (n.tag || "").toLowerCase();
        const style = TAG_STYLE[tag] || "bg-gray-50 text-gray-700 ring-gray-200";

        // url puede ser interna (/novedades#...) o externa (http…)
        const isExternal = n.url ? /^https?:\/\//i.test(n.url) : false;
        const href = n.url || null;

        const Card = ({ children }) => (
          <div className="p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow">
            {children}
          </div>
        );

        const Inner = (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-lg">{n.title || "Novedad"}</h2>
              {tag && (
                <span className={`px-2 py-0.5 text-xs rounded-full ring-1 ${style}`}>
                  {tag}
                </span>
              )}
            </div>
            {dateStr && <p className="text-sm text-gray-500 mt-1">{dateStr}</p>}
            {/* si querés un resumen, habría que agregarlo en la API; por ahora solo título+fecha */}
          </>
        );

        return (
          <li key={n.id}>
            {href ? (
              <a
                href={href}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="block"
              >
                <Card>{Inner}</Card>
              </a>
            ) : (
              <Card>{Inner}</Card>
            )}
          </li>
        );
      })}
    </ul>
  );
}
