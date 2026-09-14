import type { ReactNode, ButtonHTMLAttributes } from "react";

export interface BotonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** El peso visual: primario (verde, la acción principal de la pantalla), secundario (blanco con borde), enlace (texto subrayado) o peligro (rojo). */
  variante?: "primario" | "secundario" | "enlace" | "peligro";
  /** Tamaño: md es el del botón "Calcular liquidación"; sm, el de acciones secundarias. */
  tamano?: "md" | "sm";
  /** Ocupa todo el ancho (en la calculadora, el botón principal siempre lo hace). */
  ancho?: boolean;
  children: ReactNode;
}

const VARIANTES: Record<NonNullable<BotonProps["variante"]>, string> = {
  primario: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md hover:shadow-lg rounded-xl",
  secundario: "bg-white hover:bg-slate-50 text-slate-800 font-semibold border border-slate-300 shadow-sm rounded-xl",
  enlace: "text-emerald-700 hover:text-emerald-900 font-medium underline underline-offset-2 rounded",
  peligro: "bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl",
};
const TAMANOS: Record<NonNullable<BotonProps["tamano"]>, string> = {
  md: "px-4 py-3.5 text-base",
  sm: "px-3 py-1.5 text-sm",
};

/** Botón de LiquidAR. El primario es verde y ancho; el enlace es sólo texto subrayado. */
export function Boton({ variante = "primario", tamano = "md", ancho = false, children, type = "button", ...resto }: BotonProps) {
  const padding = variante === "enlace" ? "" : TAMANOS[tamano];
  return (
    <button
      type={type}
      className={`${VARIANTES[variante]} ${padding} ${ancho ? "w-full" : ""} transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
      {...resto}
    >
      {children}
    </button>
  );
}
