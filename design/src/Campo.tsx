import type { ReactNode } from "react";

export interface CampoProps {
  /** El texto del label, asociado al control por htmlFor. */
  label: string;
  /** El id del control que envuelve (el label apunta a él). */
  htmlFor: string;
  /** Una ayuda corta debajo del label, en gris: "Si no sabés, dejá el que está". */
  ayuda?: string;
  /** El mensaje de error debajo del control. Con error, el control se pinta en rosa. */
  error?: string;
  /** El control: un input, un select, o lo que sea. */
  children: ReactNode;
}

/** Un campo del formulario: label arriba, control, ayuda y error debajo. */
export function Campo({ label, htmlFor, ayuda, error, children }: CampoProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {ayuda ? <span className="block text-[11px] font-normal text-slate-500">{ayuda}</span> : null}
      </label>
      {children}
      {error ? (
        <span id={`${htmlFor}-error`} className="text-[11px] text-rose-700 mt-1">
          {error}
        </span>
      ) : null}
    </div>
  );
}
