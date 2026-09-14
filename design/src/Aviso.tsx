import type { ReactNode } from "react";

export interface AvisoProps {
  /** Qué clase de aviso: info (gris, un supuesto), atencion (ámbar, algo que revisar), error (rosa, algo que frena), exito (verde). */
  tono?: "info" | "atencion" | "error" | "exito";
  /** Una frase corta en negrita al principio, opcional ("Ojo:", "Cambiaste datos."). */
  titulo?: string;
  children: ReactNode;
  /** Un botón o enlace a la derecha, opcional (por ejemplo "Recalcular"). */
  accion?: ReactNode;
}

const TONOS: Record<NonNullable<AvisoProps["tono"]>, string> = {
  info: "bg-slate-100 border-slate-300 text-slate-700",
  atencion: "bg-amber-50 border-amber-300 text-amber-900",
  error: "bg-rose-50 border-rose-300 text-rose-800",
  exito: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

/** Caja de aviso con borde y fondo suave. Es lo que el recibo usa para decir que faltó una tabla, que se usó la de otro mes, o que los datos cambiaron. */
export function Aviso({ tono = "info", titulo, children, accion }: AvisoProps) {
  return (
    <div role={tono === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2 ${TONOS[tono]}`}>
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {titulo ? <b>{titulo} </b> : null}
        {children}
      </span>
      {accion ? <span className="shrink-0">{accion}</span> : null}
    </div>
  );
}
