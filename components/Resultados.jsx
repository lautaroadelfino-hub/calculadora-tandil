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

  // Convierte strings en formato AR/US a número sin romper decimales
  const numify = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      let s = v.trim();
      if (!s) return 0;
      s = s.replace(/[^0-9,.\-]/g, "");
      const hasComma = s.includes(",");
      const hasDot = s.includes(".");
      if (hasComma && hasDot) {
        const lastComma = s.lastIndexOf(",");
        const lastDot = s.lastIndexOf(".");
        s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
      } else if (hasComma) {
        s = s.replace(/,/g, ".");
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (v) => {
    const n = numify(v);
    return money ? money(n) : n.toFixed(2);
  };

  // ======== Helpers =========
  const isNum = (x) => Number.isFinite(numify(x));

  // ----------------- Ítems -----------------
  const remRowsRaw = [
    ["Básico", r.basico],
    ["Antigüedad", r.antiguedad],
    ["Presentismo", r.presentismo],
    ["Adicional horario", r.adicionalHorario],
    ["Adicional por título", r.adicionalTitulo],
    ["Bonificación por función", r.adicionalFuncion],
    ["Horas 50%", r.horasExtras50],
    ["Horas 100%", r.horasExtras100],
    ["Plus vacacional (base 25 vs 30)", r.vacacionesPlus],
  ];
  const remRows = remRowsRaw.filter(([, v]) => numify(v) !== 0);

  const noRemRowsRaw = [
    ["Suma no remunerativa fija (acuerdo)", r.noRemuFijo],
    ["Otras no remunerativas", r.noRemunerativoOtros],
    ["Antigüedad (no remunerativa)", r.antiguedadNoRemu],
    ["Presentismo (no remunerativo)", r.presentismoNoRemu],
  ];
  const noRemRows = noRemRowsRaw.filter(([, v]) => numify(v) !== 0);

  const dedRows =
    Array.isArray(r.detalleDeducciones) && r.detalleDeducciones.length > 0
      ? r.detalleDeducciones
      : [{ label: "Deducciones", monto: r.totalDeducciones || 0 }];

  // ------------ Totales seguros ------------
  const totalRemCalc =
    numify(r.basico) +
    numify(r.antiguedad) +
    numify(r.presentismo) +
    numify(r.adicionalHorario) +
    numify(r.adicionalTitulo) +
    numify(r.adicionalFuncion) +
    numify(r.horasExtras50) +
    numify(r.horasExtras100) +
    numify(r.vacacionesPlus);

  const totalRemSafe = isNum(r.totalRemunerativo) ? numify(r.totalRemunerativo) : totalRemCalc;

  const totalNoRemCalc =
    numify(r.noRemuFijo) + numify(r.noRemunerativoOtros) + numify(r.antiguedadNoRemu) + numify(r.presentismoNoRemu);

  const totalNoRemSafe = isNum(r.totalNoRemunerativo) ? numify(r.totalNoRemunerativo) : totalNoRemCalc;

  const totalDedCalc = Array.isArray(dedRows) ? dedRows.reduce((acc, d) => acc + numify(d.monto), 0) : 0;
  const totalDedSafe = isNum(r.totalDeducciones) ? numify(r.totalDeducciones) : totalDedCalc;

  const liquidoSafe = totalRemSafe + totalNoRemSafe - totalDedSafe;

  // ----------------- UI helpers -----------------
  const Fila = ({ label, value, strong, negative }) => {
    const valNum = numify(value);
    const vStr = fmt(Math.abs(valNum));
    return (
      <div className="py-2 min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(8.5rem,0.9fr)] items-center gap-3 min-w-0">
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
      </div>
    );
  };

  const Block = ({ title, children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white/85 backdrop-blur p-4 min-w-0 [container-type:inline-size]">
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

    const bg =
      tone === "good" ? "from-emerald-50/90 to-emerald-50/40" :
      tone === "bad"  ? "from-rose-50/90 to-rose-50/40"       :
      tone === "warn" ? "from-amber-50/90 to-amber-50/40"     :
                        "from-slate-50/90 to-slate-50/40";

    const vStr = fmt(value);

    return (
      <div className={`w-full rounded-xl bg-gradient-to-br ${bg} backdrop-blur p-3 ${ring} min-w-0`}>
        <div className="text-[11px] md:text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-0.5 text-right min-w-0 overflow-hidden">
          <AutoFitText min={18} max={30} className="tabular-nums font-semibold leading-tight inline-block whitespace-nowrap text-slate-900">
            $ {vStr}
          </AutoFitText>
        </div>
      </div>
    );
  };

  // ----------------- Render -----------------
  return (
    <section className="space-y-4 min-w-0">
      {/* Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        <Block title="Remunerativos">
          {remRows.map(([label, val]) => (
            <Fila key={label} label={label} value={val} />
          ))}

          <div className="pt-2 border-t border-slate-100 mt-2">
            <Fila label="Total remunerativo" value={totalRemSafe} strong />
            {(numify(r.vacacionesPlus) > 0) && Number(r.vacacionesDias) > 0 && (
              <div className="mt-1 text-xs text-emerald-700">
                Vacaciones: <strong>{r.vacacionesDias}</strong> día(s).{" "}
                Base/25: ${Number(numify(r.valorDiaBase25)).toFixed(2)} ·{" "}
                Base/30: ${Number(numify(r.valorDiaBase30)).toFixed(2)} ·{" "}
                Plus/día: ${Number(numify(r.plusPorDia)).toFixed(2)}
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
                <Fila label="Total no remunerativo" value={totalNoRemSafe} strong />
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">No hay conceptos no remunerativos.</div>
          )}
        </Block>

        <Block title="Deducciones">
          {dedRows.map((d, i) => {
            const isOS = (d.label || "").toLowerCase().includes("obra social");
            const osModo = r?.obraSocialBaseUsada; // "48", "48+extras+vac", "real"
            const showOSBreakdown = isOS && osModo === "48+extras+vac";
            const baseVal = numify(d.base);

            return (
              <div key={i} className="py-2 min-w-0">
                {/* Fila principal (monto) */}
                <Fila label={d.label} value={-Math.abs(numify(d.monto))} negative />

                {/* Línea base genérica */}
                {Number.isFinite(baseVal) && (
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    Base: $ {fmt(baseVal)}
                    {isOS && osModo === "48" && " — (Base 48)"}
                    {isOS && osModo === "real" && " — (Remunerativo real)"}
                  </p>
                )}

                {/* Desglose SOLO para OS en modo "48+extras+vac" */}
                {showOSBreakdown && (
                  <p className="mt-0.5 text-[11px] leading-snug text-emerald-700">
                    Base 48 (REM + NR) $ {fmt(r?.bases?.OS_48)} + Extras $ {fmt(r?.montoHorasExtras)} + Vacaciones $ {fmt(r?.vacacionesPlus)}
                    {" → "}Base OS $ {fmt(r?.baseOS)}
                  </p>
                )}
              </div>
            );
          })}
          <div className="pt-2 border-t border-slate-100 mt-2">
            <Fila label="Total deducciones" value={totalDedSafe} strong negative />
          </div>
        </Block>
      </div>

      {/* Totales */}
      <div className="min-w-0">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/80 to-emerald-50/80 p-3 md:p-4 min-w-0">
          <div className="grid gap-2 md:gap-3 min-w-0 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <Stat label="Remunerativo" value={totalRemSafe} />
            <Stat label="No remunerativo" value={totalNoRemSafe} tone="warn" />
            <Stat label="Deducciones" value={totalDedSafe} tone="bad" />
            <Stat label="Líquido" value={liquidoSafe} tone="good" />
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-[11px] md:text-xs leading-snug text-slate-500 italic">
        * Los valores se calculan con datos publicados y reglas vigentes. Verificá siempre con la liquidación oficial.
      </p>
    </section>
  );
}
