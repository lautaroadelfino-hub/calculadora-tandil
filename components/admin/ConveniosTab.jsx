"use client";
// Pestaña "Convenios": descargar/subir las reglas madre (JSON) de cada convenio.
import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ConveniosTab({ convenios, onConveniosChanged }) {
  const [convenioSeleccionado, setConvenioSeleccionado] = useState("");

  useEffect(() => {
    if (convenios.length > 0 && !convenioSeleccionado) {
      setConvenioSeleccionado(convenios[0].id);
    }
  }, [convenios]); // eslint-disable-line react-hooks/exhaustive-deps

  const convenioCompleto = convenios.find((c) => c.id === convenioSeleccionado) || null;

  const descargarConvenioJSON = () => {
    if (!convenioCompleto) return alert("Seleccioná un convenio primero.");

    const jsonString = JSON.stringify(convenioCompleto, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `convenio_${convenioCompleto.id}.json`;
    a.click();
  };

  const cargarConvenioJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const contenido = event.target.result;
        const nuevoConvenio = JSON.parse(contenido);

        if (!nuevoConvenio.id || !nuevoConvenio.nombre) {
          throw new Error("El archivo no tiene el formato correcto (falta ID o nombre).");
        }

        const seguro = window.confirm(`¿Estás seguro de subir y actualizar la configuración del convenio "${nuevoConvenio.nombre}"?`);
        if (!seguro) {
          e.target.value = null;
          return;
        }

        const convenioRef = doc(db, "convenios", nuevoConvenio.id);
        await setDoc(convenioRef, nuevoConvenio);

        alert(`¡Convenio "${nuevoConvenio.nombre}" guardado con éxito en la base de datos!`);
        onConveniosChanged?.();
      } catch (error) {
        console.error("Error procesando JSON:", error);
        alert("Error al procesar el archivo: " + error.message);
      }
      e.target.value = null;
    };
    reader.readAsText(file, "windows-1252");
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
        <label className="block text-sm font-bold text-slate-700 mb-2">Reglas madre del convenio</label>
        <p className="text-xs text-gray-500 mb-4">
          Cada convenio tiene un archivo JSON con sus reglas de cálculo (antigüedad, presentismo, retenciones sindicales)
          y los campos que se le piden al usuario. Para crear un gremio nuevo: descargá un JSON existente, cambiale el
          "id" y el "nombre", editá las reglas, y subilo.
        </p>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select
            value={convenioSeleccionado}
            onChange={(e) => setConvenioSeleccionado(e.target.value)}
            className="w-full md:flex-1 border border-slate-300 p-2.5 rounded-lg outline-none bg-white font-medium text-gray-700"
          >
            {convenios.map((conv) => (
              <option key={conv.id} value={conv.id}>
                {conv.nombre} (CCT {conv.cct})
              </option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={descargarConvenioJSON}
              className="bg-white hover:bg-gray-100 text-slate-700 font-bold px-4 py-2.5 rounded-lg border border-slate-300 shadow-sm text-xs w-full sm:w-auto text-center transition-colors"
            >
              ⚙️ Descargar Reglas (JSON)
            </button>
            <label className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer shadow-sm w-full sm:w-auto text-center transition-colors">
              🚀 Subir Convenio (JSON)
              <input type="file" accept=".json" onChange={cargarConvenioJSON} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {convenioCompleto && (
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Resumen del convenio seleccionado</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs uppercase text-gray-400 font-bold">Nombre</dt><dd className="text-gray-800">{convenioCompleto.nombre}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400 font-bold">CCT</dt><dd className="text-gray-800">{convenioCompleto.cct}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400 font-bold">Campos del formulario</dt><dd className="text-gray-800">{convenioCompleto.inputs_requeridos?.length ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400 font-bold">Retenciones sindicales</dt><dd className="text-gray-800">{Object.keys(convenioCompleto.reglas_calculo?.retenciones_sindicales || {}).length}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
