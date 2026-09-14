import { money } from "./formato";

export interface LineaReciboProps {
  /** El nombre del concepto: "Antigüedad", "Comida (ítem 4.1.12) (22 días)". */
  concepto: string;
  importe: number;
  /** De dónde sale, en una frase: "1% × 5 años = 5% sobre $636.873,00 (el básico)". Va debajo del concepto, en gris. */
  explicacion?: string;
  /** Qué es: cambia el color y, en las retenciones, el signo menos. */
  tipo?: "remunerativo" | "no_remunerativo" | "retencion";
  /** Para lo no remunerativo que no paga aportes ni contribuciones (comida, viáticos): agrega la marca "sin incidencia". */
  sinIncidencia?: boolean;
}

const COLORES = {
  remunerativo: { concepto: "text-slate-700", importe: "text-slate-900" },
  no_remunerativo: { concepto: "text-sky-800", importe: "text-sky-800" },
  retencion: { concepto: "text-slate-600", importe: "text-rose-600" },
};

/** Una línea del recibo: concepto a la izquierda con su explicación debajo, importe a la derecha con números tabulares. */
export function LineaRecibo({ concepto, importe, explicacion, tipo = "remunerativo", sinIncidencia = false }: LineaReciboProps) {
  const c = COLORES[tipo];
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className={`min-w-0 ${c.concepto}`}>
        {concepto}
        {sinIncidencia ? <span className="ml-1 text-[10px] uppercase tracking-wide text-sky-600">sin incidencia</span> : null}
        {explicacion ? <span className="block text-[11px] text-slate-500 font-normal">{explicacion}</span> : null}
      </span>
      <span className={`tabular-nums whitespace-nowrap ${c.importe}`}>
        {tipo === "retencion" ? "− " : ""}
        {money(importe)}
      </span>
    </div>
  );
}
