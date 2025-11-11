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
    money ? money(Number.isFinite(+v) ? +v : 0) : Number(v || 0).toFixed(2);

  // ======== Helpers de lectura robusta ========
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const pick = (obj, keys) => {
    for (const k of keys) if (isNum(obj?.[k])) return obj[k];
    return undefined;
  };

  // Base común de valor hora: preferí claves estandarizadas
  const vhBase = pick(r, [
    "valorHora", "valorHoraPublico", "valor_hora", "horaBase", "valorHoraNormal"
  ]);
  const vh50  = pick(r, ["valorHora50", "vh50", "hora50"]);
  const vh100 = pick(r, ["valorHora100", "vh100", "hora100"]);

  // Detectores de filas (capturan “Hs”, “Horas extra”, etc.)
  const is50 = (label) => /ho?ra/i.test(label) && /(50|50%)/i.test(label);
  const is100 = (label) => /ho?ra/i.test(label) && /(100|100%)/i.test(label);

  // ----------------- Ítems del detalle -----------------
  const remRows = [
    ["Básico", r.basico],
    ["Antigüedad", r.antiguedad],
    ["Presentismo", r.presentismo],
    ["Adicional horario", r.adicionalHorario],
    ["Adicional por título", r.adicionalTitulo],
    ["Bonificación por función", r.adicionalFuncion],
    ["Horas 50%", r.horasExtras50],
    ["Horas 100%", r.horasExtras100],
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

  // ----------------- UI -----------------
  const Fila = ({ label, value, strong, negative, hint }) => {
    const vStr = fmt(Math.abs(value || 0));
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
        {hint ? (
          <p className="mt-1 text-[11px] leading-snug text-emerald-700">{hint}</p>
        ) : null}
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
          {remRows.map(([label, val]) => {
            let hint;

            // Mostrar valor hora en verde para 50% y 100%, usando lo que venga en r
            if (is50(label)) {
              const valor = isNum(vh50) ? vh50 : (isNum(vhBase) ? vhBase * 1.5 : undefined);
              hint = isNum(valor) ? `Valor hora 50%: $ ${fmt(valor)}` : undefined;
            }
            if (is100(label)) {
              const valor = isNum(vh100) ? vh100 : (isNum(vhBase) ? vhBase * 2 : undefined);
              hint = isNum(valor) ? `Valor hora 100%: $ ${fmt(valor)}` : undefined;
            }

            return <Fila key={label} label={label} value={val} hint={hint} />;
          })}

          <div className="pt-2 border-t border-slate-100 mt-2">
            <Fila label="Total remunerativo" value={r.totalRemunerativo} strong />
            {(r.vacacionesPlus ?? 0) > 0 && Number(r.vacacionesDias) > 0 && (
              <div className="mt-1 text-xs text-emerald-700">
                Vacaciones: <strong>{r.vacacionesDias}</strong> día(s).{" "}
                Base/25: ${Number(r.valorDiaBase25 ?? 0).toFixed(2)} ·{" "}
                Base/30: ${Number(r.valorDiaBase30 ?? 0).toFixed(2)} ·{" "}
                Plus/día: ${Number(r.plusPorDia ?? 0).toFixed(2)}
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
          <div className="grid gap-2 md:gap-3 min-w-0 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <Stat label="Remunerativo" value={r.totalRemunerativo} />
            <Stat label="No remunerativo" value={r.totalNoRemunerativo} tone="warn" />
            <Stat label="Deducciones" value={r.totalDeducciones} tone="bad" />
            <Stat label="Líquido" value={r.liquido} tone="good" />
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
