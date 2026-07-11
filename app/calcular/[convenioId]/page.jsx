"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { procesarRecibo } from "@/lib/motorLiquidacion";

export const runtime = 'edge';

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

  return (
    <div className="max-w-5xl mx-auto p-4 mt-8 flex flex-col md:flex-row gap-8 mb-20">
      
      {/* PANEL IZQUIERDO: Formulario de Carga */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{convenio.nombre}</h1>
        <p className="text-gray-500 text-sm mb-6 border-b pb-4">CCT: {convenio.cct}</p>

        <form onSubmit={simularLiquidacion} className="space-y-5">
          
          <div className="flex flex-col bg-blue-50 p-3 rounded-lg border border-blue-100">
            <label className="font-bold text-blue-800 mb-1 text-sm">Período a Liquidar</label>
            <select 
              value={periodoSeleccionado} 
              onChange={(e) => setPeriodoSeleccionado(e.target.value)} 
              className="border border-blue-200 p-2 rounded outline-none bg-white font-medium text-gray-700 focus:ring-2 focus:ring-blue-400"
            >
              {periodosDisponibles.map(per => (
                <option key={per.id} value={per.id}>{per.nombre}</option>
              ))}
            </select>
          </div>

          {convenio.inputs_requeridos.map((input) => (
            <div key={input.id} className="flex flex-col">
              <label className="font-semibold text-gray-700 mb-1 text-sm">{input.label}</label>
              
              {input.tipo === "select" && (
                <select name={input.id} value={valoresUsuario[input.id] ?? ""} onChange={handleChange} className="border border-gray-300 p-2 rounded outline-none focus:ring-2 focus:ring-gray-200 text-gray-700">
                  {[...input.opciones].sort((a, b) => a.localeCompare(b)).map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              )}
              {input.tipo === "number" && (
                <input type="number" name={input.id} min="0" value={valoresUsuario[input.id] ?? ""} onChange={handleChange} className="border border-gray-300 p-2 rounded w-32 outline-none focus:ring-2 focus:ring-gray-200" />
              )}
              {input.tipo === "boolean" && (
                <label className="flex items-center space-x-2 mt-1 cursor-pointer">
                  <input type="checkbox" name={input.id} checked={valoresUsuario[input.id] ?? false} onChange={handleChange} className="h-5 w-5 text-blue-600 rounded cursor-pointer" />
                  <span className="text-gray-700 text-sm">Aplicar</span>
                </label>
              )}
            </div>
          ))}

          {/* OPCIONES DE SIMULACIÓN (SAC, vacaciones, Ganancias) */}
          <div className="border-t pt-4 mt-4 space-y-3">
            <p className="font-bold text-gray-700 text-sm">Opciones de simulación</p>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="incluir_sac"
                checked={valoresUsuario.incluir_sac ?? false}
                onChange={handleChange}
                className="h-4 w-4 rounded"
              />
              Incluir SAC (medio aguinaldo)
            </label>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Días de vacaciones (plus vacacional)
              </label>
              <input
                type="number"
                name="dias_vacaciones"
                min="0"
                value={valoresUsuario.dias_vacaciones ?? 0}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded w-32 outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="calcula_ganancias"
                checked={valoresUsuario.calcula_ganancias ?? false}
                onChange={handleChange}
                className="h-4 w-4 rounded"
              />
              Estimar Impuesto a las Ganancias
            </label>

            {valoresUsuario.calcula_ganancias && (
              <div className="pl-6 space-y-2 border-l-2 border-gray-100">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="conyuge"
                    checked={valoresUsuario.conyuge ?? false}
                    onChange={handleChange}
                    className="h-4 w-4 rounded"
                  />
                  Cónyuge / conviviente a cargo
                </label>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1">Hijos a cargo</label>
                  <input
                    type="number"
                    name="hijos"
                    min="0"
                    value={valoresUsuario.hijos ?? 0}
                    onChange={handleChange}
                    className="border border-gray-300 p-2 rounded w-24 outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <p className="text-[11px] text-amber-700">
                  Requiere que un administrador haya cargado las tablas de Ganancias del período.
                </p>
              </div>
            )}
          </div>

          <button type="submit" className="w-full mt-6 bg-gray-900 hover:bg-black text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all text-lg">
            Procesar Recibo
          </button>
        </form>
      </div>

      {/* PANEL DERECHO: El Recibo Resultante */}
      {resultadoLiquidacion && (
        <div className="flex-1 bg-gray-50 p-6 rounded-xl shadow-inner border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Resumen de Liquidación</h2>
            
            <div className="space-y-2 text-sm font-mono tracking-tight">
              {resultadoLiquidacion.detalle.map((linea, index) => (
                <div key={index} className={`flex justify-between p-1.5 border-b border-gray-100 ${
                  linea.tipo === 'retencion' ? 'text-red-600' : 
                  linea.tipo === 'no_remunerativo' ? 'text-blue-700 font-semibold' : 'text-gray-800'
                }`}>
                  <span>{linea.concepto}</span>
                  <span>
                    {linea.tipo === 'retencion' ? '- ' : '+ '}
                    ${linea.monto.toLocaleString("es-AR", {maximumFractionDigits: 2, minimumFractionDigits: 2})}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* NUEVO BLOQUE DE TOTALES MÁS TRANSPARENTE */}
          <div className="mt-8 pt-4 border-t-2 border-gray-800 bg-white p-4 rounded-lg shadow-sm">
            <div className="space-y-1 border-b border-gray-100 pb-3 mb-3">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Total Remunerativo:</span>
                <span className="font-mono">${resultadoLiquidacion.totales.bruto.toLocaleString("es-AR", {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-blue-600 font-medium">
                <span>Total No Remunerativo:</span>
                <span className="font-mono">+ ${resultadoLiquidacion.totales.noRemunerativo.toLocaleString("es-AR", {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-red-500 font-medium">
                <span>Total Retenciones:</span>
                <span className="font-mono">- ${resultadoLiquidacion.totales.retenciones.toLocaleString("es-AR", {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-800">Neto a Cobrar</span>
              <span className="text-3xl font-black text-green-600">
                ${resultadoLiquidacion.totales.neto.toLocaleString("es-AR", {maximumFractionDigits: 2, minimumFractionDigits: 2})}
              </span>
            </div>

            {resultadoLiquidacion.ganancias?.aplica && (
              <p className="text-[11px] text-amber-700 mt-3 border-t pt-2">
                El Impuesto a las Ganancias es una <b>estimación mensual</b>, no reemplaza
                la liquidación anual acumulada de ARCA.
              </p>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
}