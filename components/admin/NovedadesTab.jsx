"use client";
// Pestaña "Novedades": alta, publicación y borrado de novedades en Firestore.
// Reemplaza al viejo panel sobre Cloudflare D1 (roto desde el paso a next-on-pages).
import { useState, useEffect } from "react";
import {
  getNovedades,
  crearNovedad,
  guardarNovedad,
  borrarNovedad,
  importarHistorialD1,
  HISTORIAL_D1,
} from "@/lib/novedades";

const TAGS = [
  { value: "release", label: "Novedad / lanzamiento" },
  { value: "acuerdo", label: "Acuerdo paritario" },
  { value: "aviso", label: "Aviso" },
];

const TAG_BADGE = {
  release: "bg-emerald-50 text-emerald-700",
  acuerdo: "bg-blue-50 text-blue-700",
  aviso: "bg-amber-50 text-amber-800",
};

const hoy = () => new Date().toISOString().slice(0, 10);

export default function NovedadesTab() {
  const [items, setItems] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ date: hoy(), title: "", url: "", tag: "release" });

  const recargar = async () => {
    try {
      const lista = await getNovedades({ limit: 100, incluirNoPublicadas: true });
      setItems(lista);
    } catch (e) {
      console.error(e);
      setItems([]);
    }
  };

  useEffect(() => {
    recargar();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const publicarNueva = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("Escribí el título de la novedad.");
    setGuardando(true);
    try {
      await crearNovedad({
        date: form.date,
        title: form.title.trim(),
        url: form.url.trim() || null,
        tag: form.tag,
        published: true,
      });
      setForm({ date: hoy(), title: "", url: "", tag: "release" });
      await recargar();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la novedad: " + (error.message || error.code || error));
    } finally {
      setGuardando(false);
    }
  };

  const alternarPublicada = async (n) => {
    try {
      await guardarNovedad(n.id, { published: !(n.published !== false && n.published !== 0) });
      await recargar();
    } catch (error) {
      alert("No se pudo actualizar: " + (error.message || error));
    }
  };

  const eliminar = async (n) => {
    const seguro = window.confirm(`¿Eliminar la novedad "${n.title}"? Esta acción no se puede deshacer.`);
    if (!seguro) return;
    try {
      await borrarNovedad(n.id);
      await recargar();
    } catch (error) {
      alert("No se pudo eliminar: " + (error.message || error));
    }
  };

  const importar = async () => {
    const seguro = window.confirm(
      `Se van a importar ${HISTORIAL_D1.length} novedades del historial viejo (Cloudflare D1). Se puede repetir sin duplicar. ¿Continuar?`
    );
    if (!seguro) return;
    setGuardando(true);
    try {
      const cant = await importarHistorialD1();
      alert(`¡Historial importado! (${cant} novedades)`);
      await recargar();
    } catch (error) {
      console.error(error);
      alert("No se pudo importar: " + (error.message || error.code || error));
    } finally {
      setGuardando(false);
    }
  };

  const yaImportado = items?.some((n) => String(n.id).startsWith("d1-"));

  return (
    <div className="space-y-6">
      {/* Alta */}
      <form onSubmit={publicarNueva} className="p-5 bg-sky-50 border border-sky-200 rounded-xl space-y-4">
        <label className="block text-sm font-bold text-sky-900">Publicar una novedad</label>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3">
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="border border-sky-200 p-2.5 rounded-lg outline-none bg-white text-sm"
          />
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Título, ej: Cargado acuerdo agosto Empleados de Comercio"
            className="border border-sky-200 p-2.5 rounded-lg outline-none bg-white text-sm w-full"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-3 items-center">
          <select name="tag" value={form.tag} onChange={handleChange} className="border border-sky-200 p-2.5 rounded-lg outline-none bg-white text-sm">
            {TAGS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            name="url"
            value={form.url}
            onChange={handleChange}
            placeholder="Enlace (opcional)"
            className="border border-sky-200 p-2.5 rounded-lg outline-none bg-white text-sm w-full"
          />
          <button
            type="submit"
            disabled={guardando}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-sm"
          >
            {guardando ? "Guardando…" : "Publicar"}
          </button>
        </div>
      </form>

      {/* Importación del historial viejo */}
      {items !== null && !yaImportado && (
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl flex flex-col sm:flex-row items-center gap-3 justify-between">
          <p className="text-sm text-violet-900">
            Hay <b>{HISTORIAL_D1.length} novedades del sistema anterior</b> (Cloudflare) listas para importar.
          </p>
          <button
            type="button"
            onClick={importar}
            disabled={guardando}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-sm whitespace-nowrap"
          >
            📦 Importar historial
          </button>
        </div>
      )}

      {/* Listado */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Novedades cargadas</h3>
        {items === null ? (
          <p className="text-sm text-gray-400 animate-pulse">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No hay novedades todavía. Publicá la primera arriba.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => {
              const publicada = n.published !== false && n.published !== 0;
              return (
                <li key={n.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-400">{n.date}</span>
                      <span className={`px-2 py-0.5 text-[11px] rounded-full ${TAG_BADGE[n.tag] || "bg-gray-100 text-gray-600"}`}>{n.tag}</span>
                      {!publicada && (
                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-gray-200 text-gray-600">borrador</span>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${publicada ? "text-gray-800" : "text-gray-400 line-through"}`}>{n.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => alternarPublicada(n)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    >
                      {publicada ? "Despublicar" : "Publicar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(n)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
