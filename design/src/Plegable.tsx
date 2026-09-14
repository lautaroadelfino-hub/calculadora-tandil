import type { ReactNode } from "react";

export interface PlegableProps {
  /** El título de la sección, en mayúsculas chicas. */
  titulo: string;
  /** Lo que dice el costado derecho cuando está plegado ("Ver · ya tiene valores por defecto"). */
  textoPlegado?: string;
  /** Lo que dice cuando está abierto ("Ocultar"). */
  textoAbierto?: string;
  /** Si arranca abierto. En la calculadora: abierto en escritorio, plegado en el celular. */
  abierto?: boolean;
  /** Color del marco: indigo para lo que paga el empleador, neutro para lo demás. */
  tono?: "indigo" | "neutro";
  children: ReactNode;
}

const TONOS = {
  indigo: { caja: "border-indigo-200 bg-indigo-50/50", titulo: "text-indigo-700", pista: "text-indigo-700" },
  neutro: { caja: "border-slate-200 bg-slate-50/70", titulo: "text-slate-500", pista: "text-slate-500" },
};

/** Sección plegable del formulario (details/summary nativo). Guarda los campos con valores por defecto razonables para que no estorben entre la persona y el botón de calcular. */
export function Plegable({ titulo, textoPlegado = "Ver", textoAbierto = "Ocultar", abierto = true, tono = "neutro", children }: PlegableProps) {
  const t = TONOS[tono];
  return (
    <details open={abierto} className={`group rounded-xl border p-4 space-y-3 ${t.caja}`}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
        <h2 className={`text-xs font-bold uppercase tracking-wide ${t.titulo}`}>{titulo}</h2>
        <span className={`text-[11px] ${t.pista}`}>
          <span className="group-open:hidden">{textoPlegado}</span>
          <span className="hidden group-open:inline">{textoAbierto}</span>
        </span>
      </summary>
      {children}
    </details>
  );
}
