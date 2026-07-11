"use client";
// Pestaña "Convenios": editor por FORMULARIO de las reglas de cálculo de cada
// convenio (antigüedad, presentismo, retenciones sindicales). Sin editar JSON.
// La conversión doc<->formulario vive en lib/convenioForm.js (con tests).
import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { convenioToForm, formToConvenio, BASES, CONDICIONES } from "@/lib/convenioForm";

const VACIO = {
  id: "", nombre: "", cct: "", activo: true,
  antiguedadPct: "", presentismoPct: "", retenciones: [],
};

export default function ConveniosTab({ onConveniosChanged }) {
  const [convenios, setConvenios] = useState(null);
  const [original, setOriginal] = useState(null); // doc completo (para preservar campos no manejados)
  const [form, setForm] = useState(null);          // null = nada abierto
  const [esNuevo, setEsNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const snap = await getDocs(collection(db, "convenios"));
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      setConvenios(lista);
    } catch (e) {
      console.error(e);
      setConvenios([]);
    }
  };
  useEffect(() => { cargar(); }, []);

  const editar = (conv) => {
    setOriginal(conv);
    setForm(convenioToForm(conv));
    setEsNuevo(false);
  };
  const crearNuevo = () => {
    setOriginal(null);
    setForm({ ...VACIO });
    setEsNuevo(true);
  };
  const cerrar = () => { setForm(null); setOriginal(null); };

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const setRet = (i, campo, valor) =>
    setForm((f) => ({ ...f, retenciones: f.retenciones.map((r, idx) => (idx === i ? { ...r, [campo]: valor } : r)) }));
  const agregarRet = () =>
    setForm((f) => ({ ...f, retenciones: [...f.retenciones, { label: "", tipoValor: "porcentaje", valor: "", base: "remunerativo", condicion: "siempre" }] }));
  const quitarRet = (i) =>
    setForm((f) => ({ ...f, retenciones: f.retenciones.filter((_, idx) => idx !== i) }));

  const guardar = async () => {
    if (!form.id || !/^[a-z0-9-]+$/.test(form.id)) {
      return alert("El identificador (ID) debe tener solo minúsculas, números y guiones. Ej: uom-metalurgicos");
    }
    if (!form.nombre.trim()) return alert("Poné el nombre del convenio.");

    const docFinal = formToConvenio(form, original);
    const aviso = esNuevo
      ? `¿Crear el convenio nuevo "${form.nombre}"?`
      : `¿Guardar los cambios en "${form.nombre}"?`;
    if (!window.confirm(aviso)) return;

    setGuardando(true);
    try {
      await setDoc(doc(db, "convenios", form.id), docFinal);
      alert(esNuevo ? "¡Convenio creado! Ahora cargá sus escalas en la pestaña Escalas paritarias." : "¡Cambios guardados!");
      await cargar();
      onConveniosChanged?.();
      cerrar();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar: " + (e.message || e.code || e));
    } finally {
      setGuardando(false);
    }
  };

  const descargarRespaldo = () => {
    const docFinal = formToConvenio(form, original);
    const blob = new Blob([JSON.stringify(docFinal, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convenio_${form.id || "nuevo"}.json`;
    a.click();
  };

  const inp = "border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 w-full";

  // ---- Vista lista (nada abierto) ----
  if (!form) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Convenios cargados</h3>
            <p className="text-xs text-slate-500">Editá las reglas de un convenio o creá uno nuevo. Las escalas de sueldos se cargan aparte.</p>
          </div>
          <button type="button" onClick={crearNuevo} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow-sm whitespace-nowrap">
            + Nuevo convenio
          </button>
        </div>

        {convenios === null ? (
          <p className="text-sm text-gray-400 animate-pulse">Cargando…</p>
        ) : convenios.length === 0 ? (
          <p className="text-sm text-gray-500">No hay convenios. Creá el primero con "+ Nuevo convenio".</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-slate-200 rounded-xl overflow-hidden">
            {convenios.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 bg-white hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {c.nombre}
                    {c.activo === false && <span className="ml-2 text-[11px] font-normal text-gray-400">(inactivo)</span>}
                  </p>
                  <p className="text-xs text-slate-400 font-mono truncate">CCT {c.cct} · {c.id}</p>
                </div>
                <button type="button" onClick={() => editar(c)} className="text-xs font-bold text-purple-700 hover:text-purple-900 shrink-0">Editar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ---- Vista formulario ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={cerrar} className="text-sm text-slate-500 hover:text-slate-800">← Volver a la lista</button>
        <span className="text-xs font-bold uppercase tracking-wide text-purple-600">
          {esNuevo ? "Nuevo convenio" : "Editando"}
        </span>
      </div>

      {/* Datos generales */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: UOM (Metalúrgicos)" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CCT</label>
            <input value={form.cct} onChange={(e) => set("cct", e.target.value)} placeholder="Ej: 260/75" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Identificador (ID en la URL)</label>
            <input
              value={form.id}
              onChange={(e) => set("id", e.target.value.toLowerCase())}
              disabled={!esNuevo}
              placeholder="uom-metalurgicos"
              className={`${inp} font-mono ${!esNuevo ? "bg-slate-100 text-slate-400" : ""}`}
            />
            <p className="text-[11px] text-slate-400 mt-1">{esNuevo ? "Solo minúsculas, números y guiones. No se puede cambiar después." : "El ID no se modifica al editar."}</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="h-4 w-4 accent-purple-600" />
              Activo (visible en la web)
            </label>
          </div>
        </div>
      </div>

      {/* Reglas base */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Reglas de cálculo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Antigüedad (% por año)</label>
            <div className="relative">
              <input value={form.antiguedadPct} onChange={(e) => set("antiguedadPct", e.target.value)} inputMode="decimal" placeholder="0 = sin antigüedad" className={`${inp} pr-7`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Presentismo (%)</label>
            <div className="relative">
              <input value={form.presentismoPct} onChange={(e) => set("presentismoPct", e.target.value)} inputMode="decimal" placeholder="Ej: 8,333 — vacío = sin presentismo" className={`${inp} pr-7`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Retenciones sindicales */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">Retenciones sindicales</h3>
          <button type="button" onClick={agregarRet} className="text-xs font-bold text-purple-700 hover:text-purple-900">+ Agregar retención</button>
        </div>
        {form.retenciones.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">Sin retenciones sindicales. Agregá una si el convenio las tiene.</p>
        ) : (
          <div className="space-y-3">
            {form.retenciones.map((r, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 space-y-3">
                <div className="flex gap-2">
                  <input value={r.label} onChange={(e) => setRet(i, "label", e.target.value)} placeholder="Nombre (ej: Aporte Solidario 2%)" className={`${inp} flex-1`} />
                  <button type="button" onClick={() => quitarRet(i)} title="Quitar" className="text-rose-500 hover:text-rose-700 font-bold px-2 shrink-0">×</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <select value={r.tipoValor} onChange={(e) => setRet(i, "tipoValor", e.target.value)} className={inp}>
                    <option value="porcentaje">Porcentaje %</option>
                    <option value="fijo">Monto fijo $</option>
                  </select>
                  <div className="relative">
                    <input value={r.valor} onChange={(e) => setRet(i, "valor", e.target.value)} inputMode="decimal" placeholder="Valor" className={`${inp} ${r.tipoValor === "fijo" ? "pl-6" : "pr-6"}`} />
                    <span className="absolute top-1/2 -translate-y-1/2 text-slate-400 text-sm" style={r.tipoValor === "fijo" ? { left: "0.7rem" } : { right: "0.7rem" }}>{r.tipoValor === "fijo" ? "$" : "%"}</span>
                  </div>
                  <select value={r.base} onChange={(e) => setRet(i, "base", e.target.value)} disabled={r.tipoValor === "fijo"} className={`${inp} ${r.tipoValor === "fijo" ? "opacity-40" : ""}`}>
                    {BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <select value={r.condicion} onChange={(e) => setRet(i, "condicion", e.target.value)} className={inp}>
                    {CONDICIONES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-3">
          Las retenciones nacionales (jubilación 11%, PAMI 3%, obra social 3%) las aplica el sistema automáticamente. Acá van solo las sindicales del gremio.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={guardar} disabled={guardando} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-md text-base">
          {guardando ? "Guardando…" : esNuevo ? "Crear convenio" : "Guardar cambios"}
        </button>
        <button type="button" onClick={descargarRespaldo} className="bg-white hover:bg-slate-50 text-slate-600 font-semibold px-5 py-3.5 rounded-xl border border-slate-300 text-sm">
          Descargar copia de seguridad
        </button>
      </div>
    </div>
  );
}
