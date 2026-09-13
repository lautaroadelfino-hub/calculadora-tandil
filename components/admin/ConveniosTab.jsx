"use client";
// Pestaña "Convenios": editor por FORMULARIO de las reglas de cálculo de cada
// convenio (antigüedad, presentismo, retenciones sindicales). Sin editar JSON.
// La conversión doc<->formulario vive en lib/convenioForm.js (con tests).
import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { convenioToForm, formToConvenio, validarFormConvenio, BASES, CONDICIONES } from "@/lib/convenioForm";
import { SECTORES } from "@/lib/herramientas";

const VACIO = {
  id: "", nombre: "", cct: "", activo: true, sector: "privado",
  jornadaHoras: "", jornadaDivisor: "",
  antiguedadModo: "lineal", antiguedadPct: "", antiguedadTramos: [],
  presentismoPct: "", presentismoBase: "basico_mas_antiguedad",
  adicionales: [], retenciones: [],
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
  const setTramo = (i, campo, valor) =>
    setForm((f) => ({ ...f, antiguedadTramos: f.antiguedadTramos.map((t, idx) => (idx === i ? { ...t, [campo]: valor } : t)) }));
  const agregarTramo = () =>
    setForm((f) => ({ ...f, antiguedadTramos: [...f.antiguedadTramos, { desdeAños: "", porcentajePct: "" }] }));
  const quitarTramo = (i) =>
    setForm((f) => ({ ...f, antiguedadTramos: f.antiguedadTramos.filter((_, idx) => idx !== i) }));

  const setAdic = (i, campo, valor) =>
    setForm((f) => ({ ...f, adicionales: f.adicionales.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)) }));
  const agregarAdic = () =>
    setForm((f) => ({ ...f, adicionales: [...f.adicionales, { label: "", valorPct: "", base: "basico" }] }));
  const quitarAdic = (i) =>
    setForm((f) => ({ ...f, adicionales: f.adicionales.filter((_, idx) => idx !== i) }));

  const quitarRet = (i) =>
    setForm((f) => ({ ...f, retenciones: f.retenciones.filter((_, idx) => idx !== i) }));

  const guardar = async () => {
    if (!form.id || !/^[a-z0-9-]+$/.test(form.id)) {
      return alert("El identificador (ID) debe tener solo minúsculas, números y guiones. Ej: uom-metalurgicos");
    }
    if (!form.nombre.trim()) return alert("Poné el nombre del convenio.");

    // Los números se revisan ANTES de armar el documento. Antes, un valor
    // ilegible se guardaba como 0 y podía borrar una regla entera en silencio:
    // escribir "8,333%" con el signo dejaba al convenio sin presentismo.
    const errores = validarFormConvenio(form);
    if (errores.length) {
      return alert(
        "Revisá estos campos antes de guardar:" + String.fromCharCode(10, 10) +
        errores.map((e) => "• " + e.mensaje).join(String.fromCharCode(10))
      );
    }

    // Crear un convenio con un identificador que ya existe lo sobreescribe
    // entero y le borra las categorías cargadas. Antes no avisaba nada.
    if (esNuevo) {
      const yaExiste = await getDoc(doc(db, "convenios", form.id));
      if (yaExiste.exists()) {
        return alert(
          `Ya existe un convenio con el identificador "${form.id}" (${yaExiste.data()?.nombre || "sin nombre"}).` + String.fromCharCode(10, 10) +
          "Si querés editarlo, abrilo desde la lista. Si es otro convenio, poné un identificador distinto."
        );
      }
    }

    let docFinal;
    try {
      docFinal = formToConvenio(form, original);
    } catch (e) {
      return alert("No se pudo preparar el convenio: " + (e.message || e));
    }

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
    let docFinal;
    try {
      docFinal = formToConvenio(form, original);
    } catch (e) {
      return alert("No se puede descargar la copia porque hay campos con errores:" + String.fromCharCode(10, 10) + (e.message || e));
    }
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
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sector</label>
            <select value={form.sector || "privado"} onChange={(e) => set("sector", e.target.value)} className={inp}>
              {SECTORES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">Define la etiqueta y el color de la tarjeta en la portada.</p>
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
        {/* Jornada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Jornada completa (horas por semana)
            </label>
            <input
              value={form.jornadaHoras}
              onChange={(e) => set("jornadaHoras", e.target.value)}
              inputMode="decimal"
              placeholder="Vacío = 48"
              className={inp}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              La jornada para la que está publicada la escala. Si el convenio es de 44 horas
              y acá dice 48, a quien trabaje 44 se le paga un 8% menos de lo que le toca.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Divisor para el valor de la hora
            </label>
            <input
              value={form.jornadaDivisor}
              onChange={(e) => set("jornadaDivisor", e.target.value)}
              inputMode="decimal"
              placeholder="Vacío = 200"
              className={inp}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Horas mensuales por las que se divide el sueldo para sacar la hora extra.
            </p>
          </div>
        </div>

        {/* Antigüedad */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-medium text-slate-600">Antigüedad</span>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="antiguedadModo" checked={form.antiguedadModo !== "tramos"} onChange={() => set("antiguedadModo", "lineal")} className="accent-purple-600" />
              Un porcentaje por año
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="antiguedadModo" checked={form.antiguedadModo === "tramos"} onChange={() => set("antiguedadModo", "tramos")} className="accent-purple-600" />
              Por tramos de años
            </label>
          </div>

          {form.antiguedadModo !== "tramos" ? (
            <div className="sm:max-w-xs">
              <div className="relative">
                <input value={form.antiguedadPct} onChange={(e) => set("antiguedadPct", e.target.value)} inputMode="decimal" placeholder="0 = sin antigüedad" className={`${inp} pr-7`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Se multiplica por los años. Comercio usa 1% por año.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
              <p className="text-[11px] text-slate-500 mb-2">
                El porcentaje de cada tramo es el <strong>total</strong>, no se multiplica por los años.
                Ejemplo de gastronómicos: desde los 5 años, 4% del básico.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 text-left">
                    <th className="pb-1 font-medium">Desde (años)</th>
                    <th className="pb-1 font-medium">Porcentaje</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.antiguedadTramos.map((t, i) => (
                    <tr key={i}>
                      <td className="pr-2 py-1"><input value={t.desdeAños} onChange={(e) => setTramo(i, "desdeAños", e.target.value)} inputMode="numeric" className={`${inp} text-right font-mono w-24`} /></td>
                      <td className="pr-2 py-1"><input value={t.porcentajePct} onChange={(e) => setTramo(i, "porcentajePct", e.target.value)} inputMode="decimal" className={`${inp} text-right font-mono w-24`} /></td>
                      <td className="py-1"><button type="button" onClick={() => quitarTramo(i)} title="Quitar tramo" className="text-rose-500 hover:text-rose-700 font-bold px-2">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {form.antiguedadTramos.length === 0 && (
                <p className="text-sm text-slate-400 py-2">Todavía no cargaste ningún tramo.</p>
              )}
              <button type="button" onClick={agregarTramo} className="text-xs font-bold text-purple-700 hover:text-purple-900 mt-2">+ Agregar tramo</button>
            </div>
          )}
        </div>

        {/* Presentismo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Presentismo (%)</label>
            <div className="relative">
              <input value={form.presentismoPct} onChange={(e) => set("presentismoPct", e.target.value)} inputMode="decimal" placeholder="Ej: 8,333 — vacío = sin presentismo" className={`${inp} pr-7`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Se calcula sobre</label>
            <select value={form.presentismoBase || "basico_mas_antiguedad"} onChange={(e) => set("presentismoBase", e.target.value)} className={inp}>
              <option value="basico_mas_antiguedad">Básico + antigüedad</option>
              <option value="basico">Sólo el básico</option>
            </select>
          </div>
        </div>
      </div>

      {/* Adicionales remunerativos */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-700">Adicionales remunerativos</h3>
          <button type="button" onClick={agregarAdic} className="text-xs font-bold text-purple-700 hover:text-purple-900">+ Agregar adicional</button>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Conceptos propios del convenio que suman al sueldo. Por ejemplo, en gastronómicos:
          complemento de servicio 12% y asistencia perfecta 10%.
        </p>
        {form.adicionales.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">Sin adicionales. Agregá uno si el convenio los tiene.</p>
        ) : (
          <div className="space-y-3">
            {form.adicionales.map((a, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 space-y-3">
                <div className="flex gap-2">
                  <input value={a.label} onChange={(e) => setAdic(i, "label", e.target.value)} placeholder="Nombre (ej: Complemento de Servicio)" className={`${inp} flex-1`} />
                  <button type="button" onClick={() => quitarAdic(i)} title="Quitar" className="text-rose-500 hover:text-rose-700 font-bold px-2 shrink-0">×</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <input value={a.valorPct} onChange={(e) => setAdic(i, "valorPct", e.target.value)} inputMode="decimal" placeholder="Porcentaje" className={`${inp} pr-7`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                  <select value={a.base || "basico"} onChange={(e) => setAdic(i, "base", e.target.value)} className={inp}>
                    <option value="basico">Sobre el básico</option>
                    <option value="basico_mas_antiguedad">Sobre básico + antigüedad</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
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
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={!!r.reemplazaObraSocial} onChange={(e) => setRet(i, "reemplazaObraSocial", e.target.checked)} className="h-4 w-4 accent-purple-600" />
                  Esta retención reemplaza la obra social del 3% (no se cobran las dos)
                </label>
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
