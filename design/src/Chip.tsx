import type { ReactNode } from "react";

export interface ChipProps {
  /** El color del chip según qué cuenta: neutro (CCT), verde (escalas vigentes), índigo (empleador), celeste (no remunerativo), ámbar (atención), rosa (descuento). */
  tono?: "neutro" | "verde" | "indigo" | "celeste" | "ambar" | "rosa";
  children: ReactNode;
}

const TONOS: Record<NonNullable<ChipProps["tono"]>, string> = {
  neutro: "bg-slate-100 text-slate-700",
  verde: "bg-emerald-50 text-emerald-800",
  indigo: "bg-indigo-50 text-indigo-800",
  celeste: "bg-sky-50 text-sky-800",
  ambar: "bg-amber-50 text-amber-900",
  rosa: "bg-rose-50 text-rose-700",
};

/** Etiqueta chica y redondeada: "CCT 40/89", "Escalas hasta Agosto 2026", "sin incidencia". Envuelve si no entra; nunca se corta con puntos suspensivos. */
export function Chip({ tono = "neutro", children }: ChipProps) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium [overflow-wrap:anywhere] ${TONOS[tono]}`}>
      {children}
    </span>
  );
}
