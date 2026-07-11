"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { procesarRecibo } from "@/lib/motorLiquidacion";

export const runtime = 'edge';

const money = (n) =>
  "$" + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CalculadoraDinamica() {
  const { convenioId } = useParams();

  // Estados de datos
  const [convenio, setConvenio] = useState(null);
  const [periodosDisponibles, setPeriodosDisponibles] = useState([]);

  // Estados de interfaz
  const [cargando, setCargando] = useState(true);
  const [valoresUsuario, setValoresUsuario] = useState({});
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");
  const [resultadoLiquidacion, setResultadoLiquidacion] = useState(null);

  useEffect(() => {
    async function inicializarCalculadora() {
      if (!convenioId) return;
      try {
        // 1. Traemos las reglas del Convenio
        const docRef = doc(db, "convenios", convenioId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setConvenio(data);

          // Preparamos los inputs por defecto
          const initialValues = {};
          data.inputs_requeridos.forEach(input => {
            initialValues[input.id] = input.default;
          });
          setValoresUsuario(initialValues);

          // 2. Traemos todos los períodos (escalas) cargados para este convenio
          const escalasRef = collection(db, "convenios", convenioId, "escalas");
          const escalasSnap = await getDocs(escalasRef);

          const periodos = [];
          escalasSnap.forEach(escala => {
            periodos.push({
              id: escala.id,
              nombre: escala.data().mes_vigencia
            });
          });

          // Ordenamos los períodos (los más nuevos arriba)
          periodos.sort((a, b) => b.id.localeCompare(a.id));
          setPeriodosDisponibles(periodos);

          // Seleccionamos el último período por defecto
          if (periodos.length > 0) {
            setPeriodoSeleccionado(periodos[0].id);
          }
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setCargando(false);
      }
    }
    inicializarCalculadora();
  }, [convenioId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValoresUsuario(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (type === "number" ? Number(value) : value)
    }));
  };

  const simularLiquidacion = async (e) => {
    e.preventDefault();

    if (!periodoSeleccionado) {
      alert("Por favor, seleccioná un período de liquidación.");
      return;
    }

    try {
      // Buscamos los montos en pesos específicos del mes que eligió el usuario
      const escalaRef = doc(db, "convenios", convenioId, "escalas", periodoSeleccionado);
      const escalaSnap = await getDoc(escalaRef);

      if (!escalaSnap.exists()) {
        alert("No se encontraron los montos para este mes.");
        return;
      }

      // Buscamos los parámetros de Ganancias del período (o el más reciente
      // anterior). Si no hay ninguno cargado, el motor simplemente no calcula
      // el impuesto. Los administra el usuario desde /admin.
      let paramsGanancias = null;
      try {
        const gRef = doc(db, "parametros_ganancias", periodoSeleccionado);
        const gSnap = await getDoc(gRef);
        if (gSnap.exists()) {
          paramsGanancias = gSnap.data();
        } else {
          const allSnap = await getDocs(collection(db, "parametros_ganancias"));
          const candidatos = [];
          allSnap.forEach((d) => candidatos.push({ id: d.id, data: d.data() }));
          const previos = candidatos
            .filter((c) => c.id <= periodoSeleccionado)
            .sort((a, b) => b.id.localeCompare(a.id));
          if (previos.length > 0) paramsGanancias = previos[0].data;
        }
      } catch (err) {
        console.warn("No se pudieron cargar parámetros de Ganancias:", err);
      }

      // Enviamos las reglas, los montos y lo que cargó el usuario a nuestro Motor ciego
      const reciboArmado = procesarRecibo(convenio, escalaSnap.data(), valoresUsuario, paramsGanancias);
      setResultadoLiquidacion(reciboArmado);

    } catch (error) {
      alert(error.message);
    }
  };

  if (cargando) return <div className="p-10 text-center mt-20 text-gray-500 font-medium animate-pulse">Conectando con la base de datos...</div>;
  if (!convenio) return <div className="p-10 text-center mt-20 text-red-500 font-bold">Convenio no encontrado.</div>;

  const inputBase =
    "border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors";

  // Agrupamos las líneas del recibo para mostrarlas como un recibo real
  const lineas = resultadoLiquidacion?.detalle || [];
  const remunerativos = lineas.filter((l) => l.tipo === "remunerativo");
  const noRemunerativos = lineas.filter((l) => l.tipo === "no_remunerativo");
  const retenciones = lineas.filter((l) => l.tipo === "retencion");
  const periodoNombre = periodosDisponibles.find((p) => p.id === periodoSeleccionado)?.nombre || "";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-100 via-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 mb-16">

        {/* ENCABEZADO DEL CONVENIO */}
        <header className="mb-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Calculadora de sueldos
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{convenio.nombre}</h1>
          <p className="text-sm text-slate-500 mt-1">Convenio Colectivo de Trabajo {convenio.cct}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 items-start">

          {/* PANEL IZQUIERDO: Formulario */}
          <form onSubmit={simularLiquidacion} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            <div className="bg-emerald-50/60 border-b border-emerald-100 px-5 py-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-emerald-900 mb-1.5">
                Período a liquidar
              </label>
              <select
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                className={`${inputBase} w-full font-semibold`}
              >
                {periodosDisponibles.map(per => (
                  <option key={per.id} value={per.id}>{per.nombre}</option>
                ))}
              </select>
            </div>

            <div className="p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Datos del puesto</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {convenio.inputs_requeridos.map((input) => (
                  <div key={input.id} className={`flex flex-col ${input.tipo === "select" ? "sm:col-span-2" : ""}`}>
                    <label className="text-sm font-medium text-slate-700 mb-1.5">{input.label}</label>

                    {input.tipo === "select" && (
                      <select name={input.id} value={valoresUsuario[input.id] ?? ""} onChange={handleChange} className={`${inputBase} w-full`}>
                        {[...input.opciones].sort((a, b) => a.localeCompare(b)).map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                    )}
                    {input.tipo === "number" && (
                      <input type="number" name={input.id} min="0" value={valoresUsuario[input.id] ?? ""} onChange={handleChange} className={`${inputBase} w-full`} />
                    )}
                    {input.tipo === "boolean" && (
                      <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 hover:border-emerald-300 transition-colors">
                        <input type="checkbox" name={input.id} checked={valoresUsuario[input.id] ?? false} onChange={handleChange} className="h-4 w-4 accent-emerald-600 cursor-pointer" />
                        <span className="text-sm text-slate-700">Sí, aplicar</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              {/* OPCIONES DE SIMULACIÓN */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Opciones de simulación</h2>

                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="incluir_sac"
                    checked={valoresUsuario.incluir_sac ?? false}
                    onChange={handleChange}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Incluir SAC (medio aguinaldo)
                </label>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-700">Días de vacaciones (plus vacacional)</label>
                  <input
                    type="number"
                    name="dias_vacaciones"
                    min="0"
                    value={valoresUsuario.dias_vacaciones ?? 0}
                    onChange={handleChange}
                    className={`${inputBase} w-24 text-center`}
                  />
                </div>

              </div>

              {/* SITUACIÓN FAMILIAR (afecta el Impuesto a las Ganancias) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Cargas de familia</h2>
                <p className="text-[11px] text-slate-500 -mt-1">
                  Solo influyen si el sueldo llega al Impuesto a las Ganancias. Si corresponde, se calcula solo.
                </p>

                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="conyuge"
                    checked={valoresUsuario.conyuge ?? false}
                    onChange={handleChange}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Cónyuge / conviviente a cargo
                </label>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-700">Hijos a cargo</label>
                  <input
                    type="number"
                    name="hijos"
                    min="0"
                    value={valoresUsuario.hijos ?? 0}
                    onChange={handleChange}
                    className={`${inputBase} w-24 text-center`}
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-base">
                Calcular liquidación
              </button>
            </div>
          </form>

          {/* PANEL DERECHO: El Recibo */}
          {resultadoLiquidacion ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-6">

              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Simulación de recibo</h2>
                  <p className="text-xs text-slate-300 mt-0.5">{convenio.nombre} · {periodoNombre}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 rounded-full px-3 py-1">Estimado</span>
              </div>

              <div className="p-5 space-y-5">

                {/* Remunerativos */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 pb-1.5 mb-2">Haberes remunerativos</h3>
                  <div className="space-y-1.5">
                    {remunerativos.map((l, i) => (
                      <div key={i} className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-700">{l.concepto}</span>
                        <span className="text-slate-900 tabular-nums whitespace-nowrap">{money(l.monto)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* No remunerativos */}
                {noRemunerativos.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-sky-600 border-b border-slate-100 pb-1.5 mb-2">Haberes no remunerativos</h3>
                    <div className="space-y-1.5">
                      {noRemunerativos.map((l, i) => (
                        <div key={i} className="flex justify-between gap-3 text-sm">
                          <span className="text-sky-800">{l.concepto}</span>
                          <span className="text-sky-800 tabular-nums whitespace-nowrap">{money(l.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Retenciones */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-rose-500 border-b border-slate-100 pb-1.5 mb-2">Descuentos y retenciones</h3>
                  <div className="space-y-1.5">
                    {retenciones.map((l, i) => (
                      <div key={i} className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-600">{l.concepto}</span>
                        <span className="text-rose-600 tabular-nums whitespace-nowrap">− {money(l.monto)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Totales */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Total remunerativo</span>
                    <span className="tabular-nums">{money(resultadoLiquidacion.totales.bruto)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-sky-700">
                    <span>Total no remunerativo</span>
                    <span className="tabular-nums">+ {money(resultadoLiquidacion.totales.noRemunerativo)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-rose-600">
                    <span>Total retenciones</span>
                    <span className="tabular-nums">− {money(resultadoLiquidacion.totales.retenciones)}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-600 text-white px-5 py-4 flex items-center justify-between gap-3">
                  <span className="font-bold">Neto a cobrar</span>
                  <span className="text-2xl sm:text-3xl font-black tabular-nums whitespace-nowrap">
                    {money(resultadoLiquidacion.totales.neto)}
                  </span>
                </div>

                {resultadoLiquidacion.ganancias?.aplica && (
                  <p className="text-[11px] text-amber-700">
                    El Impuesto a las Ganancias es una <b>estimación mensual</b>, no reemplaza
                    la liquidación anual acumulada de ARCA.
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Simulación orientativa según escalas vigentes cargadas. No reemplaza el recibo oficial emitido por el empleador.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-10 text-center lg:sticky lg:top-6">
              <div className="text-4xl mb-3">🧾</div>
              <h2 className="font-semibold text-slate-700">Tu recibo va a aparecer acá</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                Completá los datos del puesto y tocá <b>Calcular liquidación</b> para ver el detalle completo.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
