import type { ReactNode } from "react";

export interface SeccionReciboProps {
  /** El título en mayúsculas chicas: "Haberes remunerativos", "Descuentos y retenciones". */
  titulo: string;
  /** El color del título según la sección: neutro (haberes), indigo (empleador), celeste (no remunerativo), rosa (descuentos). */
  tono?: "neutro" | "indigo" | "celeste" | "rosa";
  /** Una aclaración chica debajo del título. */
  nota?: string;
  children: ReactNode;
}

const TONOS: Record<NonNullable<SeccionReciboProps["tono"]>, string> = {
  neutro: "text-slate-500",
  indigo: "text-indigo-700",
  celeste: "text-sky-600",
  rosa: "text-rose-500",
};

/** Una sección del recibo: título con línea debajo y sus líneas apiladas. */
export function SeccionRecibo({ titulo, tono = "neutro", nota, children }: SeccionReciboProps) {
  return (
    <section>
      <h3 className={`text-xs font-bold uppercase tracking-wide border-b border-slate-100 pb-1.5 mb-2 ${TONOS[tono]}`}>{titulo}</h3>
      {nota ? <p className="text-[11px] text-slate-500 mb-2">{nota}</p> : null}
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}
