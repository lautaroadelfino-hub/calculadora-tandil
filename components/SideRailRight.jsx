"use client";
import React from "react";

export default function SideRailRight({ r, money, onReport }) {
  const Stat = ({ label, value, tone = "neutral" }) => {
    const ring =
      tone === "good"
        ? "ring-1 ring-emerald-200"
        : tone === "bad"
        ? "ring-1 ring-rose-200"
        : tone === "warn"
        ? "ring-1 ring-amber-200"
        : "ring-1 ring-slate-200";

    return (
      <div className={`rounded-xl bg-white/80 backdrop-blur p-3 ${ring}`}>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-0.5 text-right font-semibold tabular-nums text-[clamp(1rem,2.6vw,1.3rem)] text-slate-800 whitespace-nowrap">
          ${money(value || 0)}
        </div>
      </div>
    );
  };

  return (
    <aside className="sticky top-24 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Resumen rápido</h3>
        <div className="space-y-2">
          <Stat label="Líquido" value={r?.liquido} tone="good" />
          <Stat label="Remunerativo" value={r?.totalRemunerativo} />
          <Stat label="Deducciones" value={r?.totalDeducciones} tone="bad" />
        </div>
        <button
          type="button"
          onClick={onReport}
          className="w-full mt-2 rounded-lg bg-slate-800 text-white px-3 py-2 hover:bg-slate-900"
        >
          Reportar error / sugerencia
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Compartir</h3>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-slate-300"
        >
          Copiar enlace de esta página
        </button>
      </div>
    </aside>
  );
}
