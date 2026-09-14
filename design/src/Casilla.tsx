import type { ChangeEventHandler } from "react";

export interface CasillaProps {
  id: string;
  /** La pregunta o el nombre de la opción. */
  label: string;
  checked: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Una línea chica debajo: "También sube las contribuciones del empleador." */
  descripcion?: string;
  /** Con marco: la casilla vive en un recuadro gris, como las preguntas del convenio ("Sí, aplicar"). Sin marco, es una línea suelta. */
  conMarco?: boolean;
}

/** Casilla de verificación con su texto. En la calculadora, las preguntas sí/no del convenio van con marco y dicen "Sí, aplicar". */
export function Casilla({ id, label, checked, onChange, descripcion, conMarco = false }: CasillaProps) {
  const marco = conMarco ? "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 hover:border-emerald-300 transition-colors" : "";
  return (
    <label htmlFor={id} className={`flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer ${marco}`}>
      <input id={id} name={id} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-emerald-600 cursor-pointer" />
      <span>
        {label}
        {descripcion ? <span className="block text-[11px] text-slate-500">{descripcion}</span> : null}
      </span>
    </label>
  );
}
