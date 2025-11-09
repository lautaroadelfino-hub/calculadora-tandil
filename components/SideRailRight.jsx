// components/SideRailRight.jsx
"use client";
import React from "react";

export default function SideRailRight({ r = {}, money = (n)=>n, onReport = () => {} }) {
  const Stat = ({ label, value, tone = "neutral" }) => {
    const ring =
      tone === "good" ? "ring-1 ring-emerald-200" :
      tone === "bad"  ? "ring-1 ring-rose-200"    :
                        "ring-1 ring-slate-200";

    return (
      <div className={`rounded-xl bg-white/80 backdrop-blur p-3 ${ring}`}>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-0.5 text-right font-semibold tabular-nums text-[clamp(1rem,2.6vw,1.3rem)] text-slate-800 whitespace-nowrap">
          {"$"}{money(value || 0)}
        </div>
      </div>
    );
  };

  const [refValue, setRefValue] = React.useState(0);
  const liquido = Number(r?.liquido || 0);
  const delta = liquido - (Number(refValue) || 0);
  const pct = !refValue ? 0 : (delta / refValue) * 100;

  const MetaRow = ({ k, v }) => (
    <div className="flex items-center justify-between text-[12px] text-slate-600">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-700">{v ?? "—"}</span>
    </div>
  );

  const lastUpdate = r?.meta?.lastUpdate || r?.meta?.updatedAt || null;
  const fuente = r?.meta?.sourceName || r?.meta?.source || "Google Sheets";

  return (
    <aside className="sticky top-24 space-y-4">
      {/* Resumen */}
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

      {/* Comparador express */}
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Comparador express</h3>
        <p className="mt-1 text-[12px] text-slate-600">
          Ingresá un líquido de referencia (p. ej., el mes anterior) y compará.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Ej: 350000"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            onChange={(e) => setRefValue(Number(e.target.value || 0))}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-[11px] text-slate-500">Diferencia</div>
            <div className={`text-sm font-semibold tabular-nums ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {delta >= 0 ? "+" : "-"}{"$"}{money(Math.abs(delta))}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-right">
            <div className="text-[11px] text-slate-500">Variación</div>
            <div className={`text-sm font-semibold tabular-nums ${pct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {refValue ? `${pct.toFixed(2)}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Estado de datos */}
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Estado de datos</h3>
        <div className="mt-2 space-y-1.5">
          <MetaRow k="Fuente" v={fuente} />
          <MetaRow
            k="Última actualización"
            v={
              lastUpdate
                ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" })
                    .format(new Date(lastUpdate))
                : null
            }
          />
        </div>
      </div>

      {/* Compartir */}
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