"use client";
// Pestaña "Ganancias": editor por FORMULARIO de la escala art. 94 y las
// deducciones art. 30, por período, en la colección parametros_ganancias.
// Sin editar JSON a mano: campos, tabla editable y carga de valores oficiales.
import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import plantillaGanancias from "@/data/ganancias.seed.json";

// ---- helpers de números en formato es-AR ----
const parseNum = (v) => {
  if (typeof v === "number") return v;
  if (!v && v !== 0) return 0;
  let s = String(v).trim().replace(/[^0-9,.\-]/g, "");
  if (!s) return 0;
  const c = s.includes(","), d = s.includes(".");
  if (c && d) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (c) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n) =>
  n === "" || n === null || n === undefined
    ? ""
    : Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DEDUCCIONES = [
  { key: "ganancia_no_imponible", label: "Ganancia no imponible" },
  { key: "deduccion_especial_rel_dependencia", label: "Deducción especial (empleados, Ap. 2)" },
  { key: "conyuge", label: "Cónyuge / conviviente" },
  { key: "hijo", label: "Hijo" },
  { key: "hijo_incapacitado", label: "Hijo incapacitado" },
];

// Convierte el JSON del proyecto/Firestore al estado del formulario (alícuota como %).
function docToForm(data) {
  return {
    vigencia: data.vigencia || "",
    deducciones: DEDUCCIONES.reduce((acc, d) => {
      acc[d.key] = data.deducciones_anuales?.[d.key] ?? "";
      return acc;
    }, {}),
    escala: (data.escala_anual || []).map((t) => ({
      desde: t.desde ?? 0,
      hasta: t.hasta ?? "", // vacío = "en adelante"
      fijo: t.fijo ?? 0,
      alicuotaPct: t.alicuota != null ? +(t.alicuota * 100).toFixed(4) : "",
    })),
  };
}

const VACIO = { vigencia: "", deducciones: {}, escala: [] };

export default function GananciasTab() {
  const [periodoID, setPeriodoID] = useState("");
  const [form, setForm] = useState(VACIO);
  const [periodosCargados, setPeriodosCargados] = useState(null);
  const [guardando, setGuardando] = useState(false);

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
  useEffect(() => { cargarPeriodos(); }, []);

  const cargarOficiales = () => {
    setForm(docToForm(plantillaGanancias));
    if (!periodoID) setPeriodoID("2026-01");
  };

  const editarExistente = async (id) => {
    if (!id) return;
    try {
      const snap = await getDoc(doc(db, "parametros_ganancias", id));
      if (snap.exists()) {
        setPeriodoID(id);
        setForm(docToForm(snap.data()));
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar el período.");
    }
  };

  const setDeduccion = (key, valor) =>
    setForm((f) => ({ ...f, deducciones: { ...f.deducciones, [key]: valor } }));

  const setTramo = (i, campo, valor) =>
    setForm((f) => {
      const escala = f.escala.map((t, idx) => (idx === i ? { ...t, [campo]: valor } : t));
      return { ...f, escala };
    });

  const agregarTramo = () =>
    setForm((f) => ({ ...f, escala: [...f.escala, { desde: "", hasta: "", fijo: "", alicuotaPct: "" }] }));
  const quitarTramo = (i) =>
    setForm((f) => ({ ...f, escala: f.escala.filter((_, idx) => idx !== i) }));

  const hayDatos = form.escala.length > 0 || Object.values(form.deducciones).some((v) => v !== "" && v != null);

  const guardar = async () => {
    if (!periodoID || !/^\d{4}-\d{2}$/.test(periodoID)) {
      return alert("Ingresá el período con formato AAAA-MM (ej: 2026-01).");
    }
    if (form.escala.length === 0) return alert("Cargá al menos un tramo de la escala.");

    const datos = {
      vigencia: form.vigencia || periodoID,
      deducciones_anuales: DEDUCCIONES.reduce((acc, d) => {
        acc[d.key] = parseNum(form.deducciones[d.key]);
        return acc;
      }, {}),
      escala_anual: form.escala.map((t) => ({
        desde: parseNum(t.desde),
        hasta: t.hasta === "" || t.hasta === null ? null : parseNum(t.hasta),
        fijo: parseNum(t.fijo),
        alicuota: parseNum(t.alicuotaPct) / 100,
      })),
    };

    if (!window.confirm(`¿Guardar las tablas de Ganancias del período "${periodoID}"?`)) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, "parametros_ganancias", periodoID), datos);
      alert(`¡Tablas de Ganancias guardadas para ${periodoID}!`);
      cargarPeriodos();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar: " + (e.message || e.code || e));
    } finally {
      setGuardando(false);
    }
  };

  const inp = "border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 w-full";

  return (
    <div className="space-y-6">
      {/* Barra superior: período + acciones rápidas */}
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
        <div>
          <label className="block text-sm font-bold text-amber-900 mb-2">Tablas de Impuesto a las Ganancias (nacional)</label>
          <p className="text-xs text-amber-800">
            ARCA actualiza estos valores cada semestre (enero y julio). Cargá el botón de valores oficiales,
            revisá los números y guardá. La calculadora usa el período exacto o, si no existe, el más reciente anterior.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-amber-900 mb-1">Período (AAAA-MM)</label>
            <input value={periodoID} onChange={(e) => setPeriodoID(e.target.value)} placeholder="2026-01" className={`${inp} font-mono w-36`} />
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={cargarOficiales} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm">
              ✨ Cargar valores oficiales ene–jun 2026
            </button>
            {periodosCargados?.length > 0 && (
              <select
                onChange={(e) => editarExistente(e.target.value)}
                value=""
                className="border border-amber-300 rounded-lg px-3 py-2 text-xs bg-white text-amber-800 font-semibold"
              >
                <option value="">✏️ Editar período cargado…</option>
                {periodosCargados.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} — {p.vigencia}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {!hayDatos ? (
        <div className="text-center border-2 border-dashed border-slate-200 rounded-xl p-10 bg-white">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Tocá <b>"Cargar valores oficiales"</b> para empezar con la tabla vigente, o elegí un período ya cargado para editarlo.
          </p>
        </div>
      ) : (
        <>
          {/* Nombre del período */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del período (se muestra en la lista)</label>
            <input value={form.vigencia} onChange={(e) => setForm((f) => ({ ...f, vigencia: e.target.value }))} placeholder="Enero–Junio 2026" className={inp} />
          </div>

          {/* Deducciones */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Deducciones anuales (art. 30)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEDUCCIONES.map((d) => (
                <div key={d.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{d.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      value={form.deducciones[d.key] ?? ""}
                      onChange={(e) => setDeduccion(d.key, e.target.value)}
                      onBlur={(e) => setDeduccion(d.key, fmt(parseNum(e.target.value)))}
                      inputMode="decimal"
                      className={`${inp} pl-7 text-right font-mono`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Escala */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700">Escala del art. 94 (tramos anuales)</h3>
              <button type="button" onClick={agregarTramo} className="text-xs font-bold text-amber-700 hover:text-amber-900">+ Agregar tramo</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 font-bold">
                    <th className="text-left pb-2 pr-2">Desde $</th>
                    <th className="text-left pb-2 pr-2">Hasta $ <span className="normal-case font-normal">(vacío = en adelante)</span></th>
                    <th className="text-left pb-2 pr-2">Monto fijo $</th>
                    <th className="text-left pb-2 pr-2">Alícuota %</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.escala.map((t, i) => (
                    <tr key={i}>
                      <td className="pr-2 py-1"><input value={t.desde} onChange={(e) => setTramo(i, "desde", e.target.value)} onBlur={(e) => setTramo(i, "desde", fmt(parseNum(e.target.value)))} className={`${inp} text-right font-mono`} /></td>
                      <td className="pr-2 py-1"><input value={t.hasta} onChange={(e) => setTramo(i, "hasta", e.target.value)} onBlur={(e) => t.hasta !== "" && setTramo(i, "hasta", fmt(parseNum(e.target.value)))} placeholder="en adelante" className={`${inp} text-right font-mono`} /></td>
                      <td className="pr-2 py-1"><input value={t.fijo} onChange={(e) => setTramo(i, "fijo", e.target.value)} onBlur={(e) => setTramo(i, "fijo", fmt(parseNum(e.target.value)))} className={`${inp} text-right font-mono`} /></td>
                      <td className="pr-2 py-1"><input value={t.alicuotaPct} onChange={(e) => setTramo(i, "alicuotaPct", e.target.value)} className={`${inp} text-right font-mono w-20`} /></td>
                      <td className="py-1 text-center">
                        <button type="button" onClick={() => quitarTramo(i)} title="Quitar tramo" className="text-rose-500 hover:text-rose-700 font-bold px-2">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button type="button" onClick={guardar} disabled={guardando} className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-md text-base">
            {guardando ? "Guardando…" : `Guardar tablas de ${periodoID || "Ganancias"}`}
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
            Todavía no hay tablas de Ganancias cargadas. Hasta que cargues un período, la calculadora no estima el impuesto (comportamiento seguro).
          </p>
        ) : (
          <ul className="space-y-2">
            {periodosCargados.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm border-b border-gray-100 pb-2">
                <span className="flex items-center gap-3">
                  <span className="font-mono font-bold text-amber-700">{p.id}</span>
                  <span className="text-gray-600">{p.vigencia}</span>
                </span>
                <button type="button" onClick={() => editarExistente(p.id)} className="text-xs font-bold text-amber-700 hover:text-amber-900">Editar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
