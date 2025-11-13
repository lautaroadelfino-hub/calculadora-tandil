/**
 * ParametrosComercio
 * ------------------
 * Panel de parámetros específico para Empleados de Comercio.
 *
 * Espera props:
 * - values: objeto con todos los parámetros
 * - onChange: (campo, valor) => void
 *
 * Este componente asume que `values` viene con al menos:
 * - mes: string (ej. "2025-01")
 * - mesesDisponibles: string[]
 * - categoria: string
 * - categoriasPorMes: { [mes]: string[] }
 * - aniosAntiguedad: number
 * - regimen: string (horas semanales reales: "36" | "40" | "44" | "48" | etc.)
 * - horas50: number
 * - horas100: number
 * - descuentosExtras: number
 * - noRemunerativo: number
 * - vacacionesOn: boolean
 * - vacDiasTrabajados: number
 * - vacDiasManual: number
 * - obraSocialBase:
 *      "48" | "48+extras+vac" | "real"
 */

function formatMes(key) {
  try {
    if (!key) return "";
    const [y, m] = String(key).split("-");
    const norm = `${String(y).padStart(4, "0")}-${String(m || "01").padStart(
      2,
      "0"
    )}`;
    const d = new Date(`${norm}-01T00:00:00`);
    return isNaN(d.getTime())
      ? key
      : d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
}

export default function ParametrosComercio({ values, onChange }) {
  const mesesDisponibles = values.mesesDisponibles || [];
  const categoriasPorMes = values.categoriasPorMes || {};
  const categoriasDisponibles =
    categoriasPorMes[values.mes] ||
    categoriasPorMes[mesesDisponibles[0]] ||
    [];

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
      <h2 className="text-base font-semibold text-slate-800">
        Parámetros · Empleados de Comercio
      </h2>

      {/* MES */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">
          Escala – mes
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={values.mes || ""}
          onChange={(e) => onChange("mes", e.target.value)}
        >
          {mesesDisponibles.map((m) => (
            <option key={m} value={m}>
              {formatMes(m)}
            </option>
          ))}
        </select>
      </div>

      {/* CATEGORÍA */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">
          Categoría
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={values.categoria || ""}
          onChange={(e) => onChange("categoria", e.target.value)}
        >
          {categoriasDisponibles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* ANTIGÜEDAD */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">
          Antigüedad (años)
        </label>
        <input
          type="number"
          min={0}
          step={0.5}
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          value={values.aniosAntiguedad ?? ""}
          onChange={(e) =>
            onChange("aniosAntiguedad", Number(e.target.value || 0))
          }
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Podés cargar 0,5 para expresar 6 meses.
        </p>
      </div>

      {/* RÉGIMEN HORARIO */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">
          Régimen horario semanal
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={values.regimen || "48"}
          onChange={(e) => onChange("regimen", e.target.value)}
        >
          {[12, 18, 20, 24, 30, 36, 40, 44, 48].map((h) => (
            <option key={h} value={String(h)}>
              {h} hs
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">
          Se prorratea el básico de la escala (48 hs) a la carga horaria real.
        </p>
      </div>

      {/* HORAS EXTRAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Horas extras al 50%
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={values.horas50 ?? ""}
            onChange={(e) =>
              onChange("horas50", Number(e.target.value || 0))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Horas extras al 100%
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={values.horas100 ?? ""}
            onChange={(e) =>
              onChange("horas100", Number(e.target.value || 0))
            }
          />
        </div>
      </div>

      {/* OTROS CAMPOS MONETARIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Descuentos adicionales ($)
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={values.descuentosExtras ?? ""}
            onChange={(e) =>
              onChange("descuentosExtras", Number(e.target.value || 0))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            No remunerativo / productividad ($)
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={values.noRemunerativo ?? ""}
            onChange={(e) =>
              onChange("noRemunerativo", Number(e.target.value || 0))
            }
          />
        </div>
      </div>

      {/* VACACIONES */}
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={!!values.vacacionesOn}
            onChange={(e) => onChange("vacacionesOn", e.target.checked)}
          />
          <span className="text-sm font-medium text-emerald-900">
            Liquidar vacaciones (base 25)
          </span>
        </label>

        {values.vacacionesOn && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Si antigüedad < 6 meses → días trabajados */}
            {Number(values.aniosAntiguedad || 0) < 0.5 && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Días trabajados (1 cada 20)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={values.vacDiasTrabajados ?? ""}
                  onChange={(e) =>
                    onChange(
                      "vacDiasTrabajados",
                      Number(e.target.value || 0)
                    )
                  }
                />
              </div>
            )}

            {/* Override opcional de días */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Días de vacaciones (opcional)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={values.vacDiasManual ?? ""}
                onChange={(e) =>
                  onChange("vacDiasManual", Number(e.target.value || 0))
                }
              />
              <p className="mt-1 text-[11px] text-emerald-700/90">
                Automático: 14 / 21 / 28 / 35 según antigüedad. Si cargás un
                valor &gt; 0, se usa ese.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BASE OBRA SOCIAL */}
      <div className="space-y-1 pt-1">
        <label className="block text-xs font-medium text-slate-600">
          Base para Obra Social
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={values.obraSocialBase || "48+extras+vac"}
          onChange={(e) => onChange("obraSocialBase", e.target.value)}
        >
          <option value="48">Solo base 48 (rem + NR)</option>
          <option value="48+extras+vac">
            Base 48 + horas extras + vacaciones
          </option>
          <option value="real">Total remunerativo real del mes</option>
        </select>
      </div>
    </div>
  );
}
