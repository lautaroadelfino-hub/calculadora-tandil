"use client";
// Pestaña "Acuerdos": alta, edición, publicación y borrado de los acuerdos
// paritarios y escalas de cada convenio, con el archivo en Firebase Storage.
//
// El archivo se sube ANTES de escribir el documento: si Firestore falla
// después, se intenta borrar lo subido para no dejar archivos huérfanos. Al
// eliminar un acuerdo se borra primero el archivo y después el documento.
import { useState, useEffect, useRef } from "react";
import { getAcuerdos, crearAcuerdo, guardarAcuerdo, borrarAcuerdo } from "@/lib/acuerdos";
import { subirArchivo, borrarArchivo, STORAGE_CONFIGURADO } from "@/lib/archivos";
import {
  TIPOS_DE_ACUERDO,
  FORMATOS_PERMITIDOS,
  etiquetaDeTipo,
  etiquetaDeFormato,
  tipoDeArchivo,
  validarArchivo,
  validarAcuerdo,
  nombreDeArchivo,
  slugDeAcuerdo,
} from "@/lib/acuerdosPublicados";
import { slugDeUrl } from "@/lib/texto";

const hoy = () => new Date().toISOString().slice(0, 10);

const FORM_VACIO = () => ({
  convenioId: "",
  fecha: hoy(),
  titulo: "",
  tipo: "escala",
  vigencia: "",
  fuenteUrl: "",
  archivo: null,
});

const campo = "border border-sky-200 p-2.5 rounded-lg outline-none bg-white text-sm w-full";

export default function AcuerdosTab({ convenios = [] }) {
  const [items, setItems] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  // El acuerdo que se está editando (documento completo), o null si es un alta.
  const [editando, setEditando] = useState(null);
  const inputArchivo = useRef(null);

  const nombreDeConvenio = (id) => {
    const c = convenios.find((x) => x.id === id);
    return c ? c.nombre : id;
  };

  const recargar = async () => {
    try {
      setItems(await getAcuerdos({ incluirNoPublicadas: true }));
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

  const elegirArchivo = (e) => {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return setForm((prev) => ({ ...prev, archivo: null }));
    const error = validarArchivo(archivo);
    if (error) {
      alert(error);
      e.target.value = "";
      return setForm((prev) => ({ ...prev, archivo: null }));
    }
    setForm((prev) => ({ ...prev, archivo }));
  };

  const limpiar = () => {
    setForm(FORM_VACIO());
    setEditando(null);
    if (inputArchivo.current) inputArchivo.current.value = "";
  };

  const empezarEdicion = (a) => {
    setEditando(a);
    setForm({
      convenioId: a.convenioId || "",
      fecha: a.fecha || hoy(),
      titulo: a.titulo || "",
      tipo: a.tipo || "otro",
      vigencia: a.vigencia || "",
      fuenteUrl: a.fuenteUrl || "",
      archivo: null,
    });
    if (inputArchivo.current) inputArchivo.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarAcuerdo({ ...form, archivoUrl: editando ? editando.archivoUrl : null });
    if (errores.length) return alert(errores.join("\n"));

    setGuardando(true);
    let subido = null;
    try {
      const titulo = form.titulo.trim();
      if (form.archivo) {
        const tipo = tipoDeArchivo(form.archivo);
        const ruta = nombreDeArchivo(form.convenioId, form.fecha, titulo, FORMATOS_PERMITIDOS[tipo]);
        subido = await subirArchivo(ruta, form.archivo, tipo);
      }
      const datos = {
        convenioId: form.convenioId,
        fecha: form.fecha,
        titulo,
        tipo: form.tipo,
        vigencia: form.vigencia.trim() || null,
        fuenteUrl: form.fuenteUrl.trim() || null,
        ...(subido
          ? { archivoUrl: subido.url, archivoNombre: subido.nombre, archivoTipo: subido.tipo, archivoRuta: subido.ruta }
          : {}),
      };
      if (editando) {
        await guardarAcuerdo(editando.id, datos);
        // El archivo anterior ya no lo apunta nadie. Si tenía la misma ruta,
        // el nuevo lo pisó y no hay nada que borrar.
        if (subido && editando.archivoRuta && editando.archivoRuta !== subido.ruta) {
          await borrarArchivo(editando.archivoRuta).catch((err) => console.error("No se borró el archivo viejo:", err));
        }
      } else {
        // La URL de la página del acuerdo sale del título. Si otro acuerdo del
        // mismo convenio ya usa ese slug (mismo título, otro mes), va con la
        // fecha atrás para que las dos páginas existan.
        const base = slugDeUrl(titulo, "acuerdo");
        const usados = new Set((items || []).filter((a) => a.convenioId === form.convenioId).map(slugDeAcuerdo));
        await crearAcuerdo({ ...datos, slug: usados.has(base) ? `${base}-${form.fecha}` : base, published: true });
      }
      limpiar();
      await recargar();
    } catch (error) {
      console.error(error);
      // No dejar un archivo subido sin documento que lo apunte (salvo que haya
      // pisado al anterior de este mismo acuerdo: ese sigue referenciado).
      if (subido && !(editando && editando.archivoRuta === subido.ruta)) {
        await borrarArchivo(subido.ruta).catch(() => {});
      }
      alert("No se pudo guardar el acuerdo: " + (error.message || error.code || error));
    } finally {
      setGuardando(false);
    }
  };

  const alternarPublicado = async (a) => {
    try {
      await guardarAcuerdo(a.id, { published: !(a.published !== false && a.published !== 0) });
      await recargar();
    } catch (error) {
      alert("No se pudo actualizar: " + (error.message || error));
    }
  };

  const eliminar = async (a) => {
    const seguro = window.confirm(`¿Eliminar "${a.titulo}" (${nombreDeConvenio(a.convenioId)})? Se borra también el archivo. Esta acción no se puede deshacer.`);
    if (!seguro) return;
    setGuardando(true);
    try {
      if (a.archivoRuta) {
        try {
          await borrarArchivo(a.archivoRuta);
        } catch (error) {
          const seguir = window.confirm(
            `No se pudo borrar el archivo (${error.message || error}). ¿Eliminar el acuerdo igual? El archivo quedaría en Storage.`
          );
          if (!seguir) return;
        }
      }
      await borrarAcuerdo(a.id);
      if (editando && editando.id === a.id) limpiar();
      await recargar();
    } catch (error) {
      alert("No se pudo eliminar: " + (error.message || error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {!STORAGE_CONFIGURADO && (
        <p className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          Los archivos no se pueden subir: falta configurar el almacenamiento (variable
          <code className="mx-1">NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</code>). Se puede cargar el acuerdo sólo con el link a la fuente.
        </p>
      )}

      {/* Alta / edición */}
      <form onSubmit={guardar} className="p-5 bg-sky-50 border border-sky-200 rounded-xl space-y-4">
        <label className="block text-sm font-bold text-sky-900">
          {editando ? `Editar: ${editando.titulo}` : "Cargar un acuerdo o escala"}
        </label>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <select name="convenioId" value={form.convenioId} onChange={handleChange} className={campo} aria-label="Convenio">
            <option value="">Convenio…</option>
            {convenios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.cct ? ` (CCT ${c.cct})` : ""}{c.activo === false ? " · inactivo" : ""}
              </option>
            ))}
          </select>
          <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className={campo} aria-label="Fecha" />
          <select name="tipo" value={form.tipo} onChange={handleChange} className={campo} aria-label="Tipo">
            {TIPOS_DE_ACUERDO.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            type="text"
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            placeholder="Título, ej: Escala salarial agosto 2026"
            className={campo}
          />
          <input
            type="text"
            name="vigencia"
            value={form.vigencia}
            onChange={handleChange}
            placeholder="Vigencia (opcional), ej: agosto 2026"
            className={`${campo} md:w-72`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3">
          <div>
            <input
              ref={inputArchivo}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={elegirArchivo}
              disabled={!STORAGE_CONFIGURADO}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-sky-700 disabled:opacity-60"
              aria-label="Archivo del acuerdo (PDF, JPG, PNG, DOC o DOCX, hasta 10 MB)"
            />
            {editando && editando.archivoNombre && !form.archivo ? (
              <p className="mt-1 text-xs text-slate-500">
                Archivo actual: {editando.archivoNombre}. Elegí otro para reemplazarlo.
              </p>
            ) : null}
          </div>
          <input
            type="url"
            name="fuenteUrl"
            value={form.fuenteUrl}
            onChange={handleChange}
            placeholder="Link a la fuente (opcional), ej: https://www.camioneros-ba.org.ar/…"
            className={campo}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={guardando}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-sm"
          >
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Publicar"}
          </button>
          {editando ? (
            <button
              type="button"
              onClick={limpiar}
              disabled={guardando}
              className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-2.5 rounded-lg text-sm"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      {/* Listado */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Acuerdos cargados</h3>
        {items === null ? (
          <p className="text-sm text-gray-400 animate-pulse">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No hay acuerdos todavía. Cargá el primero arriba.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((a) => {
              const publicado = a.published !== false && a.published !== 0;
              return (
                <li key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-400">{a.fecha}</span>
                      <span className="text-xs font-semibold text-slate-700">{nombreDeConvenio(a.convenioId)}</span>
                      <span className="px-2 py-0.5 text-[11px] rounded-full bg-sky-50 text-sky-700">{etiquetaDeTipo(a.tipo)}</span>
                      {!publicado && (
                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-gray-200 text-gray-600">borrador</span>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 [overflow-wrap:anywhere] ${publicado ? "text-gray-800" : "text-gray-400 line-through"}`}>
                      {a.titulo}
                      {a.vigencia ? <span className="text-gray-500"> · {a.vigencia}</span> : null}
                    </p>
                    <div className="flex gap-3 text-xs mt-0.5">
                      {a.archivoUrl ? (
                        <a href={a.archivoUrl} target="_blank" rel="noopener" className="text-sky-700 hover:underline">
                          {etiquetaDeFormato(a.archivoTipo) || "Archivo"}{a.archivoNombre ? ` · ${a.archivoNombre}` : ""}
                        </a>
                      ) : (
                        <span className="text-gray-400">Sin archivo</span>
                      )}
                      {a.fuenteUrl ? (
                        <a href={a.fuenteUrl} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">
                          Fuente
                        </a>
                      ) : null}
                      {/* La página pública del acuerdo, para copiar y compartir. */}
                      <a
                        href={`/acuerdos/${encodeURIComponent(a.convenioId)}/${slugDeAcuerdo(a)}`}
                        target="_blank"
                        rel="noopener"
                        className="text-slate-500 hover:underline [overflow-wrap:anywhere]"
                      >
                        /acuerdos/{a.convenioId}/{slugDeAcuerdo(a)}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => alternarPublicado(a)}
                      disabled={guardando}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    >
                      {publicado ? "Despublicar" : "Publicar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => empezarEdicion(a)}
                      disabled={guardando}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(a)}
                      disabled={guardando}
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
