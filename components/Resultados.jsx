// components/Resultados.jsx
"use client";
import React from "react";
import AutoFitText from "./AutoFitText";

export default function Resultados({ r, money }) {
  if (!r) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 text-slate-600">
        Completá los parámetros para ver el resultado.
      </section>
    );
  }

  const fmt = (v) =>
    money ? money(Number.isFinite(+v) ? +v : 0) : (Number(v || 0)).toFixed(2);

  // ---- Fila del detalle (labels fijos, valores con AutoFit y mínimos) ----
  const Fila = ({ label, value, strong, negative }) => {
    const vStr = fmt(Math.abs(value || 0));

    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(8.5rem,0.9fr)] items-center gap-3 py-2 min-w-0">
        {/* Label (fijo, con ellipsis si no entra) */}
        <span
          className={[
            "block min-w-0 truncate",
            strong ? "font-semibold text-slate-800" : "text-slate-600",
            "text-[13px] md:text-[14px] leading-5",
          ].join(" ")}
          title={label}
        >
          {label}
        </span>

        {/* Valor: tabular, una línea, con clamp 14–20px */}
        <div className="min-w-0 text-right">
          <AutoFitText
            min={14}
            max={20}
            className={[
              "inline-block whitespace-nowrap tabular-nums leading-snug tracking-tight",
              strong ? "font-semibold" : "font-medium",
              negative ? "text-rose-600" : "text-slate-900",
            ].join(" ")}
          >
            {negative ? "–" : ""}$ {vStr}
          </AutoFitText>
        </div>
      </div>
    );
  };

  // Tarjeta con container queries locales
  const Block = ({ title, children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white/85 backdrop-blur p-4 min-w-0 [container-type:inline-size]">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
      <div className="min-w-0">{children}</div>
    </div>
  );

  // Totales con jerarquía clara
  const Stat = ({ label, value, tone = "neutral" }) => {
    const ring =
      tone === "good" ? "ring-1 ring-emerald-200" :
      tone === "bad"  ? "ring-1 ring-rose-200"    :
      tone === "warn" ? "ring-1 ring-amber-200"   :
                        "ring-1 ring-slate-200";

    const bg =
      tone === "good" ? "from-emerald-50/90 to-emerald-50/40" :
      tone === "bad"  ? "from-rose-50/90 to-rose-50/40" :
      tone === "warn" ? "from-amber-50/90 to-amber-50/40" :
                        "from-slate-50/90 to-slate-50/40";

    const vStr = fmt(value);

    return (
      <div className={`w-full rounded-xl bg-gradient-to-br ${bg} backdrop-blur p-3 ${ring} min-w-0`}>
        <div className="text-[11px] md:text-xs uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 text-right min-w-0 overflow-hidden">
          <AutoFitText
            min={18}
            max={30}
            className="tabular-nums font-semibold leading-tight inline-block whitespace-nowrap text-slate-900"
          >
            $ {vStr}
          </AutoFitText>
        </div>
      </div>
    );
  };

  const remRows = [
    ["Básico", r.basico],
    ["Antigüedad", r.antiguedad],
    ["Presentismo", r.presentismo],
    ["Adicional horario", r.adicionalHorario],
    ["Adicional por título", r.adicionalTitulo],
    ["Bonificación por función", r.adicionalFuncion],
    ["Horas 50%", r.horasExtras50],
    ["Horas 100%", r.horasExtras100],
    // ✅ ahora se muestra el PLUS (no el monto completo de vacaciones)
    ["Plus vacacional (base 25 vs 30)", r.vacacionesPlus],
  ].filter(([, v]) => (v ?? 0) !== 0);

  const noRemRows = [
    ["Suma no remunerativa fija (acuerdo)", r.noRemuFijo],
    ["Otras no remunerativas", r.noRemunerativoOtros],
  ].filter(([, v]) => (v ?? 0) !== 0);

  const dedRows =
    Array.isArray(r.detalleDeducciones) && r.detalleDeducciones.length > 0
      ? r.detalleDeducciones
      : [{ label: "Deducciones", monto: r.totalDeducciones || 0 }];

  return (
    <section className="space-y-4 min-w-0">
      {/* Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        <Block title="Remunerativos">
          {remRows.map(([label, val]) => (
            <Fila key={label} label={label} value={val} />
          ))}
          <div className="pt-2 border-t border-slate-100 mt-2">
            <Fila label="Total remunerativo" value={r.totalRemunerativo} strong />
            {/* Leyenda de vacaciones (si aplica) */}
            {(r.vacacionesPlus ?? 0) > 0 && Number(r.vacacionesDias) > 0 && (
              <div className="mt-1 text-xs text-emerald-700">
                Vacaciones: <strong>{r.vacacionesDias}</strong> día(s).
                {" "}Base/25: ${Number(r.valorDiaBase25 ?? 0).toFixed(2)}
                {" "}· Base/30: ${Number(r.valorDiaBase30 ?? 0).toFixed(2)}
                {" "}· Plus/día: ${Number(r.plusPorDia ?? 0).toFixed(2)}
              </div>
            )}
          </div>
        </Block>

        <Block title="No remunerativos">
          {noRemRows.length > 0 ? (
            <>
              {noRemRows.map(([label, val]) => (
                <Fila key={label} label={label} value={val} />
              ))}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <Fila label="Total no remunerativo" value={r.totalNoRemunerativo} strong />
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">No hay conceptos no remunerativos.</div>
          )}
        </Block>

        <Block title="Deducciones">
          {dedRows.map((d, i) => (
            <Fila key={i} label={d.label} value={-Math.abs(d.monto)} negative />
          ))}
          <div className="pt-2 border-t border-slate-100 mt-2">
            <Fila label="Total deducciones" value={r.totalDeducciones} strong negative />
          </div>
        </Block>
      </div>

      {/* Totales */}
      <div className="min-w-0">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/80 to-emerald-50/80 p-3 md:p-4 min-w-0">
          <div
            className="
              grid gap-2 md:gap-3 min-w-0
              grid-cols-1 sm:grid-cols-2 md:grid-cols-4
              grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]
            "
          >
            <Stat label="Remunerativo" value={r.totalRemunerativo} />
            <Stat label="No remunerativo" value={r.totalNoRemunerativo} tone="warn" />
            <Stat label="Deducciones" value={r.totalDeducciones} tone="bad" />
            <Stat label="Líquido" value={r.liquido} tone="good" />
          </div>
        </div>
      </div>
    </section>
  );
}
