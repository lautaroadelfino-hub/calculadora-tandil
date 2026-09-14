import { money, pct } from "./formato";

export interface FilaEmpleador {
  concepto: string;
  /** La base sobre la que se calculó, en pesos. Las sumas fijas no tienen. */
  base?: number | null;
  /** Cómo se llama esa base: "Remunerativo − detracción", "Remunerativo + no remunerativo con incidencia". */
  baseLabel?: string;
  unidad: "porcentaje" | "suma_fija";
  /** La alícuota en fracción (0.1077). */
  alicuota?: number | null;
  importe: number;
  /** Falta el dato (la ART sin alícuota): la fila va en ámbar y con importe cero. */
  pendiente?: boolean;
}

export interface TablaEmpleadorProps {
  filas: FilaEmpleador[];
  subtotal: number;
  brutoMasNoRemunerativo: number;
  costoLaboral: number;
  /** La línea chica al pie: "Detracción Ley 27.541 aplicada: $7.003,68. La ART es estimada…" */
  nota?: string;
}

/** Las contribuciones a cargo del empleador: tabla de cuatro columnas (concepto, base, unidad, importe) en escritorio y lista apilada en el celular, con subtotal, bruto y costo laboral total. Va antes del bruto, como manda el Decreto 407/2026. */
export function TablaEmpleador({ filas, subtotal, brutoMasNoRemunerativo, costoLaboral, nota }: TablaEmpleadorProps) {
  const unidadDe = (l: FilaEmpleador) => (l.unidad === "porcentaje" ? (l.alicuota != null ? pct(l.alicuota) : "sin dato") : "suma fija");
  return (
    <div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase text-slate-500">
              <th scope="col" className="text-left font-semibold pb-1">Concepto</th>
              <th scope="col" className="text-right font-semibold pb-1">Base de cálculo</th>
              <th scope="col" className="text-right font-semibold pb-1">Unidad</th>
              <th scope="col" className="text-right font-semibold pb-1">Importe</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((l, i) => (
              <tr key={i} className={l.pendiente ? "text-amber-700" : "text-slate-700"}>
                <td className="py-0.5 pr-2 align-top">{l.concepto}</td>
                <td className="py-0.5 text-right tabular-nums whitespace-nowrap text-slate-500 align-top">
                  {l.base != null ? money(l.base) : "—"}
                  {l.baseLabel ? <span className="block text-[10px] text-slate-500">{l.baseLabel}</span> : null}
                </td>
                <td className="py-0.5 pl-2 text-right whitespace-nowrap text-slate-500 align-top">{unidadDe(l)}</td>
                <td className="py-0.5 pl-2 text-right tabular-nums whitespace-nowrap align-top">{money(l.importe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="sm:hidden space-y-1.5">
        {filas.map((l, i) => (
          <li key={i} className={`rounded-lg border border-slate-200 px-3 py-2 text-[12px] ${l.pendiente ? "text-amber-700" : "text-slate-700"}`}>
            <div className="flex justify-between gap-2">
              <span className="font-medium">{l.concepto}</span>
              <span className="tabular-nums whitespace-nowrap font-semibold">{money(l.importe)}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {unidadDe(l)}
              {l.base != null ? ` sobre ${money(l.base)}${l.baseLabel ? ` (${l.baseLabel})` : ""}` : ""}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 space-y-1 text-sm">
        <div className="flex justify-between text-indigo-900">
          <span>Subtotal contribuciones</span>
          <span className="tabular-nums">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600 text-[12px]">
          <span>Remuneración bruta + no remunerativo</span>
          <span className="tabular-nums">{money(brutoMasNoRemunerativo)}</span>
        </div>
        <div className="flex justify-between font-bold text-indigo-900 border-t border-indigo-200 pt-1">
          <span>Costo laboral total</span>
          <span className="tabular-nums">{money(costoLaboral)}</span>
        </div>
      </div>
      {nota ? <p className="text-[11px] text-slate-500 mt-1.5">{nota}</p> : null}
    </div>
  );
}
