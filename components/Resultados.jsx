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

  /**
   * Tamaños adaptativos con container queries (cqw)
   * - "stat": para los totales grandes (cards de abajo)
   * - "row": para filas del detalle
   * Usamos clamp con cqw (ancho del CONTENEDOR) para evitar desborde sin truncar.
   */
  const sizeFor = (str, kind = "row") => {
    const len = String(str || "").length;

    if (kind === "stat") {
      if (len > 20) return "text-[clamp(0.85rem,6.5cqw,1.05rem)]";
      if (len > 18) return "text-[clamp(0.95rem,7.5cqw,1.20rem)]";
      if (len > 16) return "text-[clamp(1.05rem,8.5cqw,1.30rem)]";
      if (len > 14) return "text-[clamp(1.10rem,9.5cqw,1.45rem)]";
      return "text-[clamp(1.20rem,10.5cqw,1.60rem)]";
    } else {
      if (len > 20) return "text-[clamp(0.80rem,6.0cqw,0.95rem)]";
      if (len > 18) return "text-[clamp(0.85rem,6.8cqw,1.05rem)]";
      if (len > 16) return "text-[clamp(0.90rem,7.6cqw,1.15rem)]";
      if (len > 14) return "text-[clamp(0.95rem,8.4cqw,1.20rem)]";
      return "text-[clamp(1.00rem,9.2cqw,1.30rem)]";
    }
  };

  const Fila = ({ label, value, strong, negative }) => {
    const vStr = fmt(Math.abs(value || 0));
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5 min-w-0">
        <span
          className={`text-sm ${strong ? "font-semibold text-slate-800" : "text-slate-600"} truncate`}
          title={label}
        >
          {label}
        </span>
        <span
          className={[
            "tabular-nums leading-snug text-right",
            "whitespace-nowrap max-w-full tracking-tight",
            strong ? "font-semibold" : "text-sm",
            negative ? "text-rose-600" : "text-slate-800",
            sizeFor(vStr, "row"),
          ].join(" ")}
          title={`${negative ? "-" : ""}$ ${vStr}`}
        >
          {negative ? "-" : ""}$ {vStr}
        </span>
      </div>
    );
  };

  // 👇 Agrego container queries por tarjeta (no en todo el section)
  const Block = ({ title, children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 min-w-0 [container-type:inline-size]">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
      <div className="min-w-0">{children}</div>
    </div>
  );

  const Stat = ({ label, value, tone = "neutral" }) => {
  const ring =
    tone === "good" ? "ring-1 ring-emerald-200" :
    tone === "bad"  ? "ring-1 ring-rose-200"    :
    tone === "warn" ? "ring-1 ring-amber-200"   :
                      "ring-1 ring-slate-200";

  const vStr = fmt(value);

  return (
    <div className={`w-full rounded-xl bg-white/80 backdrop-blur p-2.5 ${ring} min-w-0`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-right min-w-0 overflow-hidden">
        <AutoFitText min={14} max={26} className="tabular-nums font-semibold leading-tight inline-block whitespace-nowrap">
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
    /**
     * NOTA: ahora NO activamos container queries a nivel sección,
     * solo por tarjeta (Block/Stat). Así cada número escala según
     * el ancho de SU card y no del panel completo.
     */
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

      {/* Totales: 1 col en xs, 2 en sm, 4 en md */}
      <div className="min-w-0 md:sticky md:bottom-0 md:z-10">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/80 to-emerald-50/80 p-3 md:p-4 min-w-0">
          <div className="grid gap-2 md:gap-3 min-w-0 [grid-template-columns:repeat(auto-fit)]">
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
