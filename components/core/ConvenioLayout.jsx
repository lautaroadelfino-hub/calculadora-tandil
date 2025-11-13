"use client";

import { useState } from "react";

/**
 * ConvenioLayout
 * --------------
 * Layout genérico para cualquier convenio:
 * - Maneja el estado del formulario (`values`)
 * - Llama a `calcular(values)` para obtener `resultados`
 * - Renderiza:
 *    - Parámetros (formulario)
 *    - Resultado (panel de resultados)
 * - Incluye botón "Limpiar formulario" que resetea a `estadoInicial`
 * - ✅ Resultados van DEBAJO de los parámetros (no al costado).
 */

export default function ConvenioLayout({
  titulo,
  Parametros,
  Resultado,
  estadoInicial,
  calcular,
}) {
  const [values, setValues] = useState(estadoInicial);

  const handleChange = (campo, valor) => {
    setValues((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const handleReset = () => {
    setValues(estadoInicial);
  };

  const resultados = calcular(values);

  return (
    <div className="space-y-6">
      {titulo && (
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-slate-900">
            {titulo}
          </h1>
        </header>
      )}

      {/* Ahora todo en columna: primero parámetros, abajo resultados */}
      <div className="space-y-5">
        {/* Formulario */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Parámetros de liquidación
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-600 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900"
            >
              Limpiar formulario
            </button>
          </div>

          <Parametros values={values} onChange={handleChange} />
        </div>

        {/* Resultados debajo */}
        <div className="min-w-0">
          <Resultado resultados={resultados} />
        </div>
      </div>
    </div>
  );
}
