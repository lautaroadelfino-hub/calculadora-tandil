// components/Resultados.jsx
"use client";
import React from "react";

export default function Resultados({ r, money }) {
  if (!r) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 text-slate-600">
        Completá los parámetros para ver el resultado.
      </section>
    );
  }

  const moneyNoWrap = (v) => money(v) || "0,00";

  const sizeFor = (v) => {
    const len = moneyNoWrap(v).length;
    if (len > 18) return "text-[clamp(1rem,2.2vw,1.15rem)]";
    if (len > 16) return "text-[clamp(1rem,2.4vw,1.22rem)]";
    if (len > 14) return "text-[clamp(1.05rem,2.6vw,1.3rem)]";
    return "text-[clamp(1.1rem,2.8vw,1.4rem)]";
  };

  const Fila = ({ label, value, strong, negative }) => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5 min-w-0">
      <span
        className={`text-sm ${strong ? "font-semibold text-slate-800" : "text-slate-600"} truncate`}
        title={label}
      >
        {label}
      </span>
      <span
        className={[
          "text-sm tabular-nums leading-tight",
          "text-right whitespace-nowrap overflow-hidden text-ellipsis",
          strong ? "font-semibold" : "",
          negative ? "text-rose-600" : "text-slate-800",
        ].join(" ")}
        title={moneyNoWrap(value)}
      >
        {negative ? "-" : ""}${moneyNoWrap(Math.abs(value || 0))}
      </span>
    </div>
  );

  const Block = ({ title, children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 min-w-0">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
      <div className="min-w-0">{children}</div>
    </div>
  );

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
      <div className={`w-full rounded-xl bg-white/80 backdrop-blur p-3 ${ring} min-w-0`}>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div
          className={[
            "font-semibold text-slate-800 mt-0.5 tabular-nums leading-tight",
            "text-right whitespace-nowrap overflow-hidden text-ellipsis",
            sizeFor(value),
          ].join(" ")}
          title={moneyNoWrap(value)}
        >
          ${moneyNoWrap(value)}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0 md:pb-[140px]">
        <Block title="Remunerativos">
          {remRows.map(([label, val]) => (
            <Fila key={label} label={label} value={val} />
          ))}
          <div className="pt-2 border-t border-slate-100 mt-2">
            <Fila label="Total remunerativo" value={r.totalRemunerativo} strong />
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
            <div className="text-sm text-slate-500">
              No hay conceptos no remunerativos.
            </div>
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

      {/* Totales: no-sticky en mobile, sticky desde md */}
      <div className="min-w-0 md:sticky md:bottom-0 md:z-10">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/80 to-emerald-50/80 p-3 md:p-4 min-w-0">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4 min-w-0">
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
