import type { ChangeEventHandler } from "react";
import { Campo } from "./Campo";

export interface CampoNumeroProps {
  id: string;
  label: string;
  /** Lo escrito, tal cual (acepta coma o punto). Se convierte a número al calcular, no al tipear. */
  value: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  ayuda?: string;
  error?: string;
  /** Ancho: completo (los datos del puesto) o corto (un número al lado de su texto, como la alícuota de ART). */
  ancho?: "completo" | "corto";
  placeholder?: string;
}

/** Campo numérico de la calculadora: un input de texto con teclado decimal, borde verde al foco y rosa con error. Nunca deja que el navegador frene el envío en silencio. */
export function CampoNumero({ id, label, value, onChange, ayuda, error, ancho = "completo", placeholder }: CampoNumeroProps) {
  const base = "border rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white outline-none transition-colors focus:ring-2";
  const estado = error
    ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
    : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-400";
  return (
    <Campo label={label} htmlFor={id} ayuda={ayuda} error={error}>
      <input
        id={id}
        name={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${base} ${estado} ${ancho === "corto" ? "w-24 text-center" : "w-full"}`}
      />
    </Campo>
  );
}
