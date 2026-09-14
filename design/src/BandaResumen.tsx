import { money } from "./formato";

export interface BandaResumenProps {
  /** Lo que recibe el trabajador. Es el número grande y verde. */
  neto: number;
  /** Remuneración bruta más lo no remunerativo, antes de los descuentos. */
  brutoMasNoRemunerativo: number;
  /** Lo que paga el empleador por mes. Si no hay tabla de contribuciones, se omite y la caja lo dice. */
  costoLaboral?: number | null;
  /** La línea chica debajo del costo: "Al año, unos $23.541.382,91 (12 meses más el aguinaldo)." */
  notaCosto?: string;
}

/** Los dos números que cada uno vino a buscar, arriba del recibo: el neto para el empleado, el costo total para el empleador. Tres cajas que se apilan en el celular. */
export function BandaResumen({ neto, brutoMasNoRemunerativo, costoLaboral, notaCosto }: BandaResumenProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="rounded-xl bg-emerald-600 text-white px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">Neto a cobrar</div>
        <div className="text-2xl font-black tabular-nums leading-tight">{money(neto)}</div>
        <div className="text-[11px] text-emerald-100">Lo que recibe el trabajador</div>
      </div>
      <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bruto + no remunerativo</div>
        <div className="text-lg font-bold tabular-nums text-slate-800 leading-tight">{money(brutoMasNoRemunerativo)}</div>
        <div className="text-[11px] text-slate-500">Antes de los descuentos</div>
      </div>
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Costo laboral total</div>
        <div className="text-lg font-bold tabular-nums text-indigo-900 leading-tight">{costoLaboral != null ? money(costoLaboral) : "—"}</div>
        <div className="text-[11px] text-indigo-700">
          {costoLaboral != null ? notaCosto || "Lo que paga el empleador por mes." : "Sin tabla de contribuciones para este período."}
        </div>
      </div>
    </div>
  );
}
