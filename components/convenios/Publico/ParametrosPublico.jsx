/**
 * ParametrosPublico
 * -----------------
 * Panel de parámetros para Municipalidad de Tandil (sector público).
 *
 * Usa el esquema de ConvenioLayout:
 * - values: estado completo
 * - onChange(campo, valor)
 *
 * Espera en `values`:
 * - subRegimen: "administracion" | "sisp" | "obras"
 * - mesesPorSubRegimen: { [sub]: string[] }
 * - categoriasPorSubRegimen: { [sub]: { [mes]: string[] } }
 * - mes, categoria
 * - aniosAntiguedad, regimen, titulo, funcion, horas50, horas100,
 *   descuentosExtras, noRemunerativo
 */

const LABELS_SUBREGIMEN = {
  administracion: "Adm. Central",
  sisp: "SISP",
  obras: "Obras Sanitarias",
};

function formatMes(key) {
  try {
    if (!key) return "";
    const [y, m] = String(key).split("-");
    const norm = `${String(y).padStart(4, "0")}-${String(m || "01").padStart(2, "0")}`;
    const d = new Date(`${norm}-01T00:00:00`);
    return isNaN(d.getTime())
      ? key
      : d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
}

export default function ParametrosPublico({ values, onChange }) {
  const subRegimen = values.subRegimen || "administracion";

  const mesesPorSubRegimen = values.mesesPorSubRegimen || {};
  const categoriasPorSubRegimen = values.categoriasPorSubRegimen || {};

  const mesesDisponibles = mesesPorSubRegimen[subRegimen] || [];
  const categoriasPorMes = categoriasPorSubRegimen[subRegimen] || {};

  const categoriasDisponibles =
    categoriasPorMes[values.mes] || categoriasPorMes[mesesDisponibles[0]] || [];

  const subKeys = Object.keys(mesesPorSubRegimen);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
      <h2 className="text-base font-semibold text-slate-800">
        Parámetros · Municipalidad de Tandil
      </h2>

      {/* SUBRÉGIMEN */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">
          Sub-régimen
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={subRegimen}
          onChange={(e) => onChange("subRegimen", e.target.value)}
        >
          {subKeys.map((key) => (
            <option key={key} value={key}>
              {LABELS_SUBREGIMEN[key] || key}
            </option>
          ))}
        </select>
      </div>

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
          value={values.regimen || "35"}
          onChange={(e) => onChange("regimen", e.target.value)}
        >
          {["35", "40", "48"].map((h) => (
            <option key={h} value={h}>
              {h} hs
            </option>
          ))}
        </select>
      </div>

      {/* TÍTULO Y FUNCIÓN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Adicional por título
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={values.titulo || "ninguno"}
            onChange={(e) => onChange("titulo", e.target.value)}
          >
            <option value="ninguno">Sin título</option>
            <option value="terciario">Terciario (10%)</option>
            <option value="universitario">Universitario (20%)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Adicional por función (% sobre básico)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={values.funcion ?? ""}
            onChange={(e) =>
              onChange("funcion", Number(e.target.value || 0))
            }
          />
        </div>
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
            Otros descuentos ($)
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
          <p className="mt-1 text-[11px] text-slate-500">
            Descuentos adicionales (préstamos, embargos, etc.).
          </p>
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
    </div>
  );
}
