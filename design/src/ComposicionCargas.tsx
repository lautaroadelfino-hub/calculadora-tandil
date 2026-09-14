import { money, num } from "./formato";

export interface RubroCargas {
  id: string;
  /** El rubro del Decreto 407/2026: "Seguridad social", "Obra social", "A.R.T. + FFEP"… */
  label: string;
  total: number;
  /** Porcentaje sobre el total de las cargas (suman 100 entre rubros). */
  porcentaje: number;
  /** Porcentaje sobre el costo laboral total. */
  porcentajeDelCosto?: number | null;
  empleador: number;
  trabajador: number;
}

export interface ComposicionCargasProps {
  /** Sólo los rubros con algo; los vacíos no se dibujan. */
  rubros: RubroCargas[];
  totalCargas: number;
  costoLaboral: number;
}

/** La composición de las cargas sociales: por rubro, cuánto pone el empleador y cuánto el trabajador (barra índigo/rosa), el % de las cargas y el % del costo laboral, y la fila de total. */
export function ComposicionCargas({ rubros, totalCargas, costoLaboral }: ComposicionCargasProps) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-2">
        Lo que pagan el empleador y el trabajador, por rubro del Decreto 407/2026. El primer porcentaje es sobre el total de las cargas; el segundo, sobre el costo laboral total.
      </p>
      <div className="space-y-2">
        {rubros.filter((r) => r.total > 0).map((r) => {
          const parteEmpleador = (r.empleador / r.total) * 100;
          return (
            <div key={r.id} className="text-[12px]">
              <div className="flex justify-between gap-2 text-slate-700">
                <span>{r.label}</span>
                <span className="tabular-nums whitespace-nowrap">
                  {money(r.total)} · {num(r.porcentaje)}% de las cargas
                  {r.porcentajeDelCosto != null ? ` · ${num(r.porcentajeDelCosto)}% del costo` : ""}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-rose-200 overflow-hidden mt-0.5">
                <div className="h-full bg-indigo-500" style={{ width: `${parteEmpleador}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Empleador {money(r.empleador)}</span>
                <span>Trabajador {money(r.trabajador)}</span>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between gap-2 text-[12px] font-semibold text-slate-800 border-t border-slate-200 pt-1.5">
          <span>Total de cargas (empleador + trabajador)</span>
          <span className="tabular-nums whitespace-nowrap">
            {money(totalCargas)} · {num(costoLaboral > 0 ? (totalCargas / costoLaboral) * 100 : 0)}% del costo laboral total
          </span>
        </div>
      </div>
    </div>
  );
}
