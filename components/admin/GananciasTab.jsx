"use client";
// Pestaña "Ganancias": administrar las tablas del impuesto (escala art. 94 +
// deducciones personales) por período, en la colección parametros_ganancias.
import { useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import plantillaGanancias from "@/data/ganancias.seed.json";

export default function GananciasTab() {
  const [periodoID, setPeriodoID] = useState("");
  const [periodosCargados, setPeriodosCargados] = useState(null);

  const cargarPeriodos = async () => {
    try {
      const snap = await getDocs(collection(db, "parametros_ganancias"));
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, vigencia: d.data().vigencia || "" }));
      lista.sort((a, b) => b.id.localeCompare(a.id));
      setPeriodosCargados(lista);
    } catch (e) {
      console.error(e);
      setPeriodosCargados([]);
    }
  };

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const descargarPlantilla = () => {
    const jsonString = JSON.stringify(plantillaGanancias, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ganancias_plantilla.json";
    a.click();
  };

  const cargarGananciasJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!periodoID || !/^\d{4}-\d{2}$/.test(periodoID)) {
      alert("Primero ingresá el ID del período de Ganancias (ej: 2026-01).");
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const datos = JSON.parse(event.target.result);

        if (!Array.isArray(datos.escala_anual) || !datos.deducciones_anuales) {
          throw new Error("El archivo no tiene el formato correcto (faltan 'escala_anual' o 'deducciones_anuales').");
        }

        const seguro = window.confirm(`¿Guardar las tablas de Ganancias para el período "${periodoID}"?`);
        if (!seguro) {
          e.target.value = null;
          return;
        }

        await setDoc(doc(db, "parametros_ganancias", periodoID), datos);
        alert(`¡Tablas de Ganancias guardadas para ${periodoID}!`);
        cargarPeriodos();
      } catch (error) {
        console.error("Error procesando JSON de Ganancias:", error);
        alert("Error al procesar el archivo: " + error.message);
      }
      e.target.value = null;
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
        <label className="block text-sm font-bold text-amber-900 mb-2">Tablas de Impuesto a las Ganancias (nacional)</label>
        <p className="text-xs text-amber-800 mb-4">
          Cargá la escala del art. 94 y las deducciones cuando ARCA las actualice (enero y julio). Descargá la
          plantilla, reemplazá los montos con los oficiales, poné el ID del período y subila. La calculadora usa
          el período exacto o, si no existe, el más reciente anterior.
        </p>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-amber-900 mb-1">ID del Período (ej: 2026-01)</label>
            <input
              type="text"
              value={periodoID}
              onChange={(e) => setPeriodoID(e.target.value)}
              placeholder="2026-01"
              className="w-full border border-amber-300 p-2.5 rounded-lg outline-none bg-white font-mono text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={descargarPlantilla}
              className="bg-white hover:bg-gray-100 text-amber-800 font-bold px-4 py-2.5 rounded-lg border border-amber-300 shadow-sm text-xs w-full sm:w-auto text-center transition-colors"
            >
              ⚙️ Descargar Plantilla (JSON)
            </button>
            <label className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer shadow-sm w-full sm:w-auto text-center transition-colors">
              💰 Subir Tablas Ganancias
              <input type="file" accept=".json" onChange={cargarGananciasJSON} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="p-5 bg-white border border-slate-200 rounded-xl">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Períodos cargados en la base</h3>
        {periodosCargados === null ? (
          <p className="text-sm text-gray-400 animate-pulse">Cargando…</p>
        ) : periodosCargados.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay tablas de Ganancias cargadas. Hasta que cargues un período, la calculadora no
            estima el impuesto (comportamiento seguro).
          </p>
        ) : (
          <ul className="space-y-2">
            {periodosCargados.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-2">
                <span className="font-mono font-bold text-amber-700">{p.id}</span>
                <span className="text-gray-600">{p.vigencia}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
