"use client";

import { useState } from "react";
import { calcularCostoEmpleador } from "@/lib/calculoEmpleador";

export default function EmpleadorPage() {
  const [form, setForm] = useState({
    convenio: "comercio",
    provincia: "Buenos Aires",
    regimenId: "resto_mipyme",
    bruto: "",
    noRem: "",
    horasMensuales: 200,
    artPct: 3,
    otrosPct: 0,
    periodo: "2025-10", // devengado
  });

  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setResultado(null);

    const bruto = parseFloat(form.bruto) || 0;
    const horas = parseFloat(form.horasMensuales) || 0;

    if (!bruto || !horas) {
      setError(
        "Completá al menos el sueldo bruto y las horas mensuales para calcular."
      );
      return;
    }

    try {
      const res = calcularCostoEmpleador({
        convenio: form.convenio,
        provincia: form.provincia,
        regimenId: form.regimenId,
        bruto,
        noRem: parseFloat(form.noRem) || 0,
        horasMensuales: horas,
        artPct: parseFloat(form.artPct) || 0,
        otrosPct: parseFloat(form.otrosPct) || 0,
        periodo: form.periodo,
      });
      setResultado(res);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al calcular el costo laboral.");
    }
  };

  const formatMoney = (valor) =>
    valor.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    });

  const formatNumber = (valor, dec = 2) =>
    valor.toLocaleString("es-AR", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-6 py-10 lg:py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-gray-900">
            Panel Empleador
          </h1>
          <p className="mt-3 max-w-3xl text-base text-gray-600">
            Calculá el costo laboral total de un puesto en el sector privado,
            con contribuciones patronales, ART y otros aportes. El cálculo usa
            la base imponible mínima y máxima del art. 9 de la Ley 24.241.
          </p>
        </header>

        {/* Card único: arriba inputs, abajo resultado */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 lg:p-8 shadow-sm space-y-8">
          {/* FORMULARIO */}
          <div>
            <h2 className="text-lg lg:text-xl font-medium text-gray-900 mb-4">
              Datos del puesto
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5 text-base">
              {/* Convenio / Provincia */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Convenio / Actividad
                  </label>
                  <select
                    name="convenio"
                    value={form.convenio}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="comercio">Empleados de Comercio</option>
                    <option value="gastronomicos">
                      Hotelería y Gastronomía (UTHGRA)
                    </option>
                    <option value="construccion">Construcción (UOCRA)</option>
                    <option value="rural">Rural / Campo</option>
                    <option value="servicios">
                      Servicios / Administración privada
                    </option>
                    <option value="otros">Otro convenio</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Provincia
                  </label>
                  <select
                    name="provincia"
                    value={form.provincia}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option>Buenos Aires</option>
                    <option>Ciudad Autónoma de Buenos Aires</option>
                    <option>Córdoba</option>
                    <option>Santa Fe</option>
                    <option>Mendoza</option>
                    <option>Neuquén</option>
                    <option>Río Negro</option>
                    <option>Otra</option>
                  </select>
                </div>
              </div>

              {/* Régimen */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Régimen de contribuciones patronales
                </label>
                <select
                  name="regimenId"
                  value={form.regimenId}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="servicios_comercio_grande">
                    Servicios / Comercio – empresas grandes
                  </option>
                  <option value="resto_mipyme">
                    Resto de actividades / MiPyME
                  </option>
                </select>
              </div>

              {/* Sueldo bruto / No rem */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Sueldo bruto remunerativo mensual
                  </label>
                  <input
                    type="number"
                    name="bruto"
                    value={form.bruto}
                    onChange={handleChange}
                    placeholder="Ej: 850000"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    No remunerativos mensuales (opcional)
                  </label>
                  <input
                    type="number"
                    name="noRem"
                    value={form.noRem}
                    onChange={handleChange}
                    placeholder="Ej: 120000"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Horas / ART / Otros */}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Horas mensuales
                  </label>
                  <input
                    type="number"
                    name="horasMensuales"
                    value={form.horasMensuales}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    min="1"
                    step="1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    ART (%)
                  </label>
                  <input
                    type="number"
                    name="artPct"
                    value={form.artPct}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    min="0"
                    max="20"
                    step="0.1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Otros aportes de convenio (%)
                  </label>
                  <input
                    type="number"
                    name="otrosPct"
                    value={form.otrosPct}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    min="0"
                    max="20"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Período */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Período devengado (YYYY-MM)
                </label>
                <input
                  type="text"
                  name="periodo"
                  value={form.periodo}
                  onChange={handleChange}
                  placeholder="Ej: 2025-10"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-sm text-gray-500">
                  Se usa para elegir la base imponible mínima y máxima del art.
                  9 de la Ley 24.241.
                </p>
              </div>

              {error && (
                <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center rounded-md bg-emerald-500 px-5 py-2.5 text-base font-medium text-white hover:bg-emerald-600 transition"
              >
                Calcular costo laboral
              </button>
            </form>
          </div>

          {/* RESULTADO */}
          <div className="border-t border-gray-200 pt-5">
            <h2 className="text-lg lg:text-xl font-medium text-gray-900 mb-4">
              Resultado
            </h2>

            {!resultado && (
              <p className="text-base text-gray-500">
                Completá los datos y calculá para ver el costo laboral total del
                puesto.
              </p>
            )}

            {resultado && (
              <div className="space-y-5 text-base">
                {/* Resumen principal */}
                <div className="rounded-xl border border-emerald-500 bg-emerald-50 p-4 lg:p-5">
                  <p className="text-xs font-semibold tracking-wide text-emerald-700 mb-1 uppercase">
                    Costo mensual total del puesto
                  </p>
                  <p className="text-2xl lg:text-3xl font-semibold text-emerald-900">
                    {formatMoney(resultado.costoTotal)}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    Provincia: {resultado.provincia} · Régimen:{" "}
                    {resultado.regimenLabel}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Base imponible usada (art. 9):{" "}
                    {formatMoney(resultado.baseImponibleUsada)} · Mín:{" "}
                    {formatMoney(resultado.baseMinima)} · Máx:{" "}
                    {formatMoney(resultado.baseMaxima)}
                  </p>
                </div>

                {/* Chips resumen */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
                    <p className="text-sm text-gray-500 mb-1">
                      Sueldo bruto
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {formatMoney(resultado.bruto)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
                    <p className="text-sm text-gray-500 mb-1">
                      No remunerativos
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {formatMoney(resultado.noRem)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
                    <p className="text-sm text-gray-500 mb-1">
                      Contribuciones totales
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {formatMoney(resultado.totalContribuciones)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatNumber(
                        (resultado.totalContribuciones / resultado.bruto) *
                          100 || 0,
                        1
                      )}
                      % sobre el bruto
                    </p>
                  </div>
                </div>

                {/* Costo por hora / día */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
                    <p className="text-sm text-gray-500 mb-1">
                      Costo por hora
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {formatMoney(resultado.costoHora)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Calculado sobre {resultado.horasMensuales} hs/mes.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
                    <p className="text-sm text-gray-500 mb-1">
                      Costo por día (30 días)
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {formatMoney(resultado.costoDia)}
                    </p>
                  </div>
                </div>

                {/* Tabla de contribuciones */}
                {resultado.detalleContribuciones?.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 space-y-2">
                    <p className="font-semibold text-gray-900 text-sm">
                      Detalle de contribuciones patronales
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-100">
                            <th className="py-2 pr-2 text-left font-medium text-gray-600">
                              Concepto
                            </th>
                            <th className="py-2 px-2 text-right font-medium text-gray-600">
                              %
                            </th>
                            <th className="py-2 pl-2 text-right font-medium text-gray-600">
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.detalleContribuciones.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-gray-100"
                            >
                              <td className="py-1.5 pr-2 text-gray-800">
                                {item.label}
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-700">
                                {formatNumber(item.pct, 2)}%
                              </td>
                              <td className="py-1.5 pl-2 text-right text-gray-800">
                                {formatMoney(item.monto)}
                              </td>
                            </tr>
                          ))}

                          {resultado.art && (
                            <tr className="border-b border-gray-100">
                              <td className="py-1.5 pr-2 text-gray-800">
                                Riesgos del Trabajo (ART)
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-700">
                                {formatNumber(resultado.art.pct || 0, 2)}%
                              </td>
                              <td className="py-1.5 pl-2 text-right text-gray-800">
                                {formatMoney(resultado.art.monto)}
                              </td>
                            </tr>
                          )}

                          {resultado.otros && (
                            <tr className="border-b border-gray-100">
                              <td className="py-1.5 pr-2 text-gray-800">
                                Otros aportes de convenio
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-700">
                                {formatNumber(resultado.otros.pct || 0, 2)}%
                              </td>
                              <td className="py-1.5 pl-2 text-right text-gray-800">
                                {formatMoney(resultado.otros.monto)}
                              </td>
                            </tr>
                          )}

                          <tr>
                            <td className="py-1.5 pr-2 font-semibold text-gray-900">
                              Total contribuciones
                            </td>
                            <td className="py-1.5 px-2 text-right font-semibold text-gray-900">
                              {formatNumber(
                                (resultado.totalContribuciones /
                                  resultado.bruto) *
                                  100 || 0,
                                2
                              )}
                              %
                            </td>
                            <td className="py-1.5 pl-2 text-right font-semibold text-gray-900">
                              {formatMoney(resultado.totalContribuciones)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Explicación */}
                {resultado.textoExplicacion && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 text-sm text-gray-700 space-y-2">
                    <p className="font-semibold text-gray-900">
                      Explicación del cálculo
                    </p>
                    <p>{resultado.textoExplicacion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
