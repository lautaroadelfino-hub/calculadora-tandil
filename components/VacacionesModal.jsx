// components/VacacionesModal.jsx
"use client";
import { useEffect, useMemo, useState } from "react";

export default function VacacionesModal({
  open,
  onClose,
  aniosAntiguedad = 0,
  brutoMensual = 0,
  money = (n) => n.toFixed(2),
}) {
  const [diasTrabajados, setDiasTrabajados] = useState("");

  useEffect(() => {
    if (open) setDiasTrabajados("");
  }, [open]);

  const diasVacaciones = useMemo(() => {
    const a = Number(aniosAntiguedad) || 0;

    if (a < 0.5) {
      const d = Math.max(0, Math.floor((Number(diasTrabajados) || 0) / 20));
      return d;
    }
    if (a < 5) return 14;
    if (a < 10) return 21;
    if (a < 20) return 28;
    return 35;
  }, [aniosAntiguedad, diasTrabajados]);

  const base25 = useMemo(() => (Number(brutoMensual) || 0) / 25, [brutoMensual]);
  const montoVacaciones = useMemo(() => base25 * (diasVacaciones || 0), [base25, diasVacaciones]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Liquidar vacaciones (Comercio)</h2>
          <p className="text-slate-500 text-sm mt-1">
            Método <strong>base 25</strong>: (Bruto mensual ÷ 25) × Días de vacaciones.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Antigüedad</div>
              <div className="font-medium text-slate-900">{aniosAntiguedad} años</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Bruto considerado</div>
              <div className="font-medium text-slate-900">$ {money(brutoMensual)}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                (remunerativos + no remunerativos del período)
              </div>
            </div>
          </div>

          {Number(aniosAntiguedad) < 0.5 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-medium text-amber-800">Antigüedad menor a 6 meses</div>
              <div className="text-xs text-amber-800/90 mt-1">
                Corresponde 1 día de descanso cada 20 días trabajados.
              </div>
              <label className="block mt-2 text-sm text-amber-900">
                Días trabajados:
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={diasTrabajados}
                  onChange={(e) => setDiasTrabajados(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Ej.: 80"
                />
              </label>
              <div className="mt-2 text-sm text-amber-900">
                Días de vacaciones calculados: <strong>{diasVacaciones}</strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Días de vacaciones</div>
              <div className="font-semibold text-slate-900">{diasVacaciones}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Base 25</div>
              <div className="font-semibold text-slate-900">$ {money(base25)}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-xs text-emerald-700">Monto de vacaciones</div>
              <div className="font-bold text-emerald-800">$ {money(montoVacaciones)}</div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Nota: si se liquida junto al sueldo del mes, se practican aportes y contribuciones
            sobre el total que corresponda. Ver particularidades de sumas no remunerativas del CCT.
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
