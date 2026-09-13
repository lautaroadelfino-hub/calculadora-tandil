"use client";
// Pestaña "Contribuciones": la tabla de contribuciones patronales por período,
// en la colección parametros_contribuciones. Es lo que la sección "Costo total
// empleador" del recibo necesita para cumplir el art. 140 inc. j) de la LCT
// (Ley 27.802, reglamentada por el Decreto 407/2026): alícuotas por régimen,
// detracción, sumas fijas universales, bases del art. 9 y los criterios
// contables que el dueño puede cambiar sin desplegar.
//
// Toda la lógica (conversión, validación, unidades) vive en
// lib/contribucionesForm.js, que tiene tests. Acá sólo hay pantalla.
import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import semilla from "@/data/contribuciones.seed.json";
import { aNumero as parseNum, formatearNumero as fmt } from "@/lib/numeros";
import { esPeriodoValido } from "@/lib/periodos";
import {
  tablaToForm, formToTabla, conceptoVacio, universalVacio, regimenVacio,
  UNIDADES, BASES_DE_CONTRIBUCION, CRITERIOS_CONTABLES,
} from "@/lib/contribucionesForm";
import { ErrorDeFormulario } from "@/lib/convenioForm";
import { RUBROS_DEL_COSTO_LABORAL } from "@/lib/vocabularioConvenios";

const COLECCION = "parametros_contribuciones";

export default function ContribucionesTab() {
  const [periodoID, setPeriodoID] = useState("");
  const [form, setForm] = useState(() => tablaToForm({}));
  const [periodosCargados, setPeriodosCargados] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargarPeriodos = async () => {
    try {
      const snap = await getDocs(collection(db, COLECCION));
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, vigencia: d.data().vigencia || "" }));
      lista.sort((a, b) => b.id.localeCompare(a.id));
      setPeriodosCargados(lista);
    } catch (e) {
      console.error(e);
      setPeriodosCargados([]);
    }
  };
  useEffect(() => { cargarPeriodos(); }, []);

  const cargarOficiales = () => {
    setForm(tablaToForm(semilla));
    if (!periodoID) setPeriodoID("2026-07");
  };

  const editarExistente = async (id) => {
    if (!id) return;
    try {
      const snap = await getDoc(doc(db, COLECCION, id));
      if (snap.exists()) {
        setPeriodoID(id);
        setForm(tablaToForm(snap.data()));
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar el período.");
    }
  };

  // --- edición del estado, sin lógica: sólo mover valores de lugar ---
  const setDetraccion = (k, v) => setForm((f) => ({ ...f, detraccion: { ...f.detraccion, [k]: v } }));
  const setBase = (k, v) => setForm((f) => ({ ...f, basesArt9: { ...f.basesArt9, [k]: v } }));
  const setCriterio = (k, v) => setForm((f) => ({ ...f, criterios: { ...f.criterios, [k]: v } }));

  const setRegimen = (i, patch) =>
    setForm((f) => ({ ...f, regimenes: f.regimenes.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  const marcarPredeterminado = (i) =>
    setForm((f) => ({ ...f, regimenes: f.regimenes.map((r, idx) => ({ ...r, predeterminado: idx === i })) }));
  const agregarRegimen = () => setForm((f) => ({ ...f, regimenes: [...f.regimenes, regimenVacio()] }));
  const quitarRegimen = (i) => setForm((f) => ({ ...f, regimenes: f.regimenes.filter((_, idx) => idx !== i) }));

  const setConcepto = (ri, ci, patch) =>
    setForm((f) => ({
      ...f,
      regimenes: f.regimenes.map((r, idx) =>
        idx !== ri ? r : { ...r, conceptos: r.conceptos.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }
      ),
    }));
  const agregarConcepto = (ri) =>
    setForm((f) => ({
      ...f,
      regimenes: f.regimenes.map((r, idx) => (idx === ri ? { ...r, conceptos: [...r.conceptos, conceptoVacio()] } : r)),
    }));
  const quitarConcepto = (ri, ci) =>
    setForm((f) => ({
      ...f,
      regimenes: f.regimenes.map((r, idx) =>
        idx === ri ? { ...r, conceptos: r.conceptos.filter((_, j) => j !== ci) } : r
      ),
    }));

  const setUniversal = (i, patch) =>
    setForm((f) => ({ ...f, universales: f.universales.map((u, idx) => (idx === i ? { ...u, ...patch } : u)) }));
  const agregarUniversal = () => setForm((f) => ({ ...f, universales: [...f.universales, universalVacio()] }));
  const quitarUniversal = (i) => setForm((f) => ({ ...f, universales: f.universales.filter((_, idx) => idx !== i) }));

  const hayDatos = form.regimenes.length > 0 || form.universales.length > 0 || form.detraccion.monto !== "";

  const guardar = async () => {
    if (!esPeriodoValido(periodoID)) {
      return alert("Ingresá el período con formato AAAA-MM (ej: 2026-07). El mes va con dos dígitos.");
    }
    let datos;
    try {
      datos = formToTabla(form);
    } catch (e) {
      if (e instanceof ErrorDeFormulario) return alert("Antes de guardar, revisá esto:\n\n" + e.message);
      throw e;
    }
    if (!window.confirm(`¿Guardar la tabla de contribuciones del período "${periodoID}"?`)) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, COLECCION, periodoID), datos);
      alert(`¡Tabla de contribuciones guardada para ${periodoID}!`);
      cargarPeriodos();
    } catch (e) {
      console.error(e);
      const texto = String(e.code || e.message || e);
      alert(
        "No se pudo guardar: " + (e.message || e.code || e) +
        (texto.includes("permission")
          ? "\n\nSi dice 'permissions', falta pegar el bloque de parametros_contribuciones de firestore.rules en la consola de Firebase."
          : "")
      );
    } finally {
      setGuardando(false);
    }
  };

  const inp = "border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 w-full";
  const sel = `${inp} pr-7`;
  const numero = (valor, onChange, extra = "") => (
    <input
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => e.target.value !== "" && onChange(fmt(parseNum(e.target.value)))}
      inputMode="decimal"
      className={`${inp} text-right font-mono ${extra}`}
    />
  );
  const rubroSelect = (valor, onChange) => (
    <select value={valor || ""} onChange={(e) => onChange(e.target.value)} className={sel}>
      <option value="">— rubro —</option>
      {RUBROS_DEL_COSTO_LABORAL.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Barra superior: período + acciones rápidas */}
      <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-4">
        <div>
          <label className="block text-sm font-bold text-indigo-900 mb-2">Contribuciones patronales (nacional)</label>
          <p className="text-xs text-indigo-800">
            Desde el 01/06/2026 el recibo tiene que mostrar lo que paga el empleador por cada trabajador
            (art. 140 inc. j) LCT, Decreto 407/2026). Esta tabla es lo que la calculadora usa para esa
            sección. Cargá los valores oficiales, revisalos y guardá. Como con Ganancias, se usa el período
            exacto o, si no existe, el más reciente anterior, y el recibo avisa cuál usó.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-indigo-900 mb-1">Período (AAAA-MM)</label>
            <input value={periodoID} onChange={(e) => setPeriodoID(e.target.value)} placeholder="2026-07" className={`${inp} font-mono w-36`} />
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={cargarOficiales} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm">
              ✨ Cargar valores oficiales julio 2026
            </button>
            {periodosCargados?.length > 0 && (
              <select onChange={(e) => editarExistente(e.target.value)} value="" className="border border-indigo-300 rounded-lg px-3 py-2 text-xs bg-white text-indigo-800 font-semibold">
                <option value="">✏️ Editar período cargado…</option>
                {periodosCargados.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.vigencia}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {!hayDatos ? (
        <div className="text-center border-2 border-dashed border-slate-200 rounded-xl p-10 bg-white">
          <div className="text-3xl mb-2">🏢</div>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Tocá <b>"Cargar valores oficiales"</b> para empezar con la tabla vigente, o elegí un período ya cargado para editarlo.
          </p>
        </div>
      ) : (
        <>
          {/* Nombre del período */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del período (se muestra en la lista)</label>
            <input value={form.vigencia} onChange={(e) => setForm((f) => ({ ...f, vigencia: e.target.value }))} placeholder="Julio 2026" className={inp} />
          </div>

          {/* Detracción y bases */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Detracción por trabajador (Ley 27.541 art. 22)</h3>
              <p className="text-[11px] text-slate-500">
                Se resta de la base antes de aplicar la alícuota, sólo en los conceptos marcados con "detracción".
                Si no aplica, poné 0: no la dejes vacía.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                {numero(form.detraccion.monto, (v) => setDetraccion("monto", v), "pl-7")}
              </div>
              <input value={form.detraccion.norma} onChange={(e) => setDetraccion("norma", e.target.value)} placeholder="Norma" className={`${inp} text-xs`} />
              <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.detraccion.prorrateaPorJornada} onChange={(e) => setDetraccion("prorrateaPorJornada", e.target.checked)} className="h-4 w-4 accent-indigo-600 mt-0.5" />
                <span>Se prorratea por jornada <span className="block text-[11px] text-slate-400 font-normal">Media jornada, media detracción.</span></span>
              </label>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Bases del art. 9 (Ley 24.241)</h3>
              <p className="text-[11px] text-slate-500">
                Mínimo y máximo para los aportes del trabajador. Las contribuciones patronales no tienen tope.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mínima $</label>
                  {numero(form.basesArt9.minima, (v) => setBase("minima", v))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Máxima $</label>
                  {numero(form.basesArt9.maxima, (v) => setBase("maxima", v))}
                </div>
              </div>
            </div>
          </div>

          {/* Regímenes */}
          {form.regimenes.map((r, ri) => (
            <div key={ri} className={`bg-white border rounded-xl p-5 space-y-4 ${r.predeterminado ? "border-indigo-300" : "border-slate-200"}`}>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Régimen</label>
                  <input value={r.label} onChange={(e) => setRegimen(ri, { label: e.target.value })} placeholder="Resto de actividades y MiPyME" className={inp} />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer whitespace-nowrap pb-2">
                  <input type="radio" name="regimen-predeterminado" checked={r.predeterminado} onChange={() => marcarPredeterminado(ri)} className="h-4 w-4 accent-indigo-600" />
                  Predeterminado
                </label>
                <button type="button" onClick={() => quitarRegimen(ri)} className="text-xs font-bold text-rose-500 hover:text-rose-700 pb-2 text-left sm:text-right">Quitar régimen</button>
              </div>
              {r.id && <p className="text-[11px] text-slate-400 -mt-2 font-mono">id: {r.id}</p>}

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="text-[11px] uppercase text-slate-400 font-bold">
                      <th className="text-left pb-2 pr-2">Concepto</th>
                      <th className="text-left pb-2 pr-2">Unidad</th>
                      <th className="text-left pb-2 pr-2">Alícuota % / Monto $</th>
                      <th className="text-left pb-2 pr-2">Base</th>
                      <th className="text-center pb-2 pr-2" title="Se le resta la detracción antes de aplicar la alícuota">Detracción</th>
                      <th className="text-left pb-2 pr-2">Rubro (decreto)</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.conceptos.map((c, ci) => (
                      <tr key={ci}>
                        <td className="pr-2 py-1"><input value={c.label} onChange={(e) => setConcepto(ri, ci, { label: e.target.value })} className={inp} /></td>
                        <td className="pr-2 py-1">
                          <select value={c.unidad} onChange={(e) => setConcepto(ri, ci, { unidad: e.target.value })} className={sel}>
                            {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                          </select>
                        </td>
                        <td className="pr-2 py-1">
                          {c.unidad === "suma_fija"
                            ? numero(c.monto, (v) => setConcepto(ri, ci, { monto: v }), "w-28")
                            : numero(c.alicuotaPct, (v) => setConcepto(ri, ci, { alicuotaPct: v }), "w-24")}
                        </td>
                        <td className="pr-2 py-1">
                          {c.unidad === "suma_fija" ? (
                            <span className="text-xs text-slate-400">por trabajador</span>
                          ) : (
                            <select value={c.base} onChange={(e) => setConcepto(ri, ci, { base: e.target.value })} className={sel}>
                              {BASES_DE_CONTRIBUCION.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="pr-2 py-1 text-center">
                          {c.unidad !== "suma_fija" && (
                            <input type="checkbox" checked={c.aplicaDetraccion} onChange={(e) => setConcepto(ri, ci, { aplicaDetraccion: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
                          )}
                        </td>
                        <td className="pr-2 py-1">{rubroSelect(c.rubro, (v) => setConcepto(ri, ci, { rubro: v }))}</td>
                        <td className="py-1 text-center">
                          <button type="button" onClick={() => quitarConcepto(ri, ci)} title="Quitar concepto" className="text-rose-500 hover:text-rose-700 font-bold px-2">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => agregarConcepto(ri)} className="text-xs font-bold text-indigo-700 hover:text-indigo-900">+ Agregar concepto</button>
            </div>
          ))}
          <button type="button" onClick={agregarRegimen} className="text-xs font-bold text-indigo-700 hover:text-indigo-900">+ Agregar régimen</button>

          {/* Sumas fijas universales */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">Sumas fijas por trabajador, para todo empleador</h3>
            <p className="text-[11px] text-slate-500">
              Lo que se paga por cabeza y no por porcentaje: FFEP (enfermedades profesionales) y el seguro
              colectivo de vida obligatorio. No dependen del régimen ni del convenio.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 font-bold">
                    <th className="text-left pb-2 pr-2">Concepto</th>
                    <th className="text-left pb-2 pr-2">Monto $</th>
                    <th className="text-left pb-2 pr-2">Rubro (decreto)</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.universales.map((u, i) => (
                    <tr key={i}>
                      <td className="pr-2 py-1"><input value={u.label} onChange={(e) => setUniversal(i, { label: e.target.value })} className={inp} /></td>
                      <td className="pr-2 py-1">{numero(u.monto, (v) => setUniversal(i, { monto: v }), "w-32")}</td>
                      <td className="pr-2 py-1">{rubroSelect(u.rubro, (v) => setUniversal(i, { rubro: v }))}</td>
                      <td className="py-1 text-center">
                        <button type="button" onClick={() => quitarUniversal(i)} title="Quitar" className="text-rose-500 hover:text-rose-700 font-bold px-2">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={agregarUniversal} className="text-xs font-bold text-indigo-700 hover:text-indigo-900">+ Agregar suma fija</button>
          </div>

          {/* Criterios contables */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-700">Criterios contables</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Viven acá y no en el código para que se puedan cambiar sin desplegar. Si el mes no tiene
                tabla cargada, valen como encendidos.
              </p>
            </div>
            {CRITERIOS_CONTABLES.map((c) => (
              <label key={c.key} className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.criterios[c.key] !== false} onChange={(e) => setCriterio(c.key, e.target.checked)} className="h-4 w-4 accent-indigo-600 mt-0.5" />
                <span>
                  {c.label}
                  <span className="block text-[11px] text-slate-400 font-normal">{c.ayuda}</span>
                </span>
              </label>
            ))}
          </div>

          <button type="button" onClick={guardar} disabled={guardando} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-md text-base">
            {guardando ? "Guardando…" : `Guardar tabla de ${periodoID || "contribuciones"}`}
          </button>
        </>
      )}

      {/* Períodos cargados */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Períodos cargados en la base</h3>
        {periodosCargados === null ? (
          <p className="text-sm text-gray-400 animate-pulse">Cargando…</p>
        ) : periodosCargados.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay tablas de contribuciones cargadas. Hasta que cargues un período, el recibo no
            puede mostrar la sección del empleador que exige la ley, y lo avisa.
          </p>
        ) : (
          <ul className="space-y-2">
            {periodosCargados.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm border-b border-gray-100 pb-2">
                <span className="flex items-center gap-3">
                  <span className="font-mono font-bold text-indigo-700">{p.id}</span>
                  <span className="text-gray-600">{p.vigencia}</span>
                </span>
                <button type="button" onClick={() => editarExistente(p.id)} className="text-xs font-bold text-indigo-700 hover:text-indigo-900">Editar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
