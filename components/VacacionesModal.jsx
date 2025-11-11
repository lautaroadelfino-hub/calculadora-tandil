// components/VacacionesModal.jsx
"use client";
import { useEffect, useMemo, useState } from "react";

export default function VacacionesModal({
  open,
  onClose,
  onConfirm = () => {},           // <<< NUEVO
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
          {/* ... contenido actual ... */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* ... tarjetas ... */}
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
          <button
            type="button"
            disabled={!diasVacaciones || !brutoMensual}
            onClick={() => {
              onConfirm({ dias: diasVacaciones, brutoRef: Number(brutoMensual) || 0 });
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Aplicar al cálculo
          </button>
        </div>
      </div>
    </div>
  );
}
