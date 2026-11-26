"use client";
// components/admin/CalificacionesTab.jsx
// Lo que la gente contestó en la tarjeta "¿Te sirvió este cálculo?" del pie
// del recibo (lib/calificaciones.js), para decidir qué mejorar.
//
// Cómo leerlo (también está en la pantalla): califica sobre todo el que quedó
// muy contento o muy enojado, así que importan más las comparaciones y la
// tendencia que el promedio en sí; y con menos de MINIMO_PARA_COMPARAR
// calificaciones, una diferencia entre grupos no dice nada (se marca).
//
// Las preguntas que responde, en el orden de la pantalla: ¿cómo venimos y
// hacia dónde va? (semana a semana: una caída después de cargar un mes o de
// publicar es la alarma); ¿qué falla? (los motivos de las calificaciones
// bajas); ¿dónde? (convenio, celular o computadora, link o a mano, recibos con
// avisos); ¿para quién? (perfil); y el detalle, en los comentarios.

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  COLECCION,
  MOTIVOS,
  PERFILES,
  MINIMO_PARA_COMPARAR,
  PREGUNTA_MOTIVO_HASTA,
  resumenDeCalificaciones,
  calificacionesACsv,
  aFecha,
} from "@/lib/calificaciones";

const RANGOS = [
  { id: "30", texto: "Últimos 30 días", dias: 30 },
  { id: "90", texto: "Últimos 90 días", dias: 90 },
  { id: "todo", texto: "Desde el principio", dias: null },
];
/** Cuántas se leen como máximo. Si algún día se llega, el panel lo dice. */
const TOPE = 5000;
const DIA_MS = 24 * 60 * 60 * 1000;

const NOMBRE_DE_PERFIL = Object.fromEntries(PERFILES.map((p) => [p.id, p.texto]));
const NOMBRE_DE_MOTIVO = Object.fromEntries(MOTIVOS.map((m) => [m.id, m.texto]));
const NOMBRE_DE_DISPOSITIVO = { movil: "Celular", escritorio: "Computadora" };
const NOMBRE_DE_ORIGEN = { manual: "Calculó a mano", link: "Abrió un link compartido" };

const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const uno = (x) => (x == null ? "—" : x.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const fecha = (v) => {
  const d = aFecha(v);
  return d ? d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
};
const estrellitas = (n) => "★".repeat(n) + "☆".repeat(5 - n);

function Tarjeta({ titulo, valor, nota }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className="text-2xl font-black tabular-nums text-slate-800">{valor}</div>
      {nota && <div className="text-[11px] text-slate-500">{nota}</div>}
    </div>
  );
}

function Barra({ etiqueta, total, max }) {
  const ancho = max ? Math.round((total / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-56 shrink-0 text-slate-700">{etiqueta}</span>
      <div className="h-3 flex-1 rounded bg-slate-100" aria-hidden="true">
        <div className="h-3 rounded bg-emerald-500" style={{ width: `${ancho}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums text-slate-700">{total}</span>
    </div>
  );
}

function TablaDeGrupos({ titulo, filas, nombre = (k) => k }) {
  if (!filas.length) return null;
  return (
    <div>
      <h4 className="mb-1 text-[13px] font-semibold text-slate-700">{titulo}</h4>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1 font-medium"> </th>
            <th className="py-1 text-right font-medium">Cuántas</th>
            <th className="py-1 text-right font-medium">Promedio</th>
            <th className="py-1 text-right font-medium">4 o 5 estrellas</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.clave} className="border-t border-slate-100">
              <td className="py-1 text-slate-700">
                {nombre(f.clave)}
                {f.total < MINIMO_PARA_COMPARAR && <span className="ml-1 text-[11px] text-amber-700">(pocas para comparar)</span>}
              </td>
              <td className="py-1 text-right tabular-nums">{f.total}</td>
              <td className="py-1 text-right tabular-nums">{uno(f.promedio)}</td>
              <td className="py-1 text-right tabular-nums">{pct(f.satisfaccion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CalificacionesTab({ convenios = [] }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [rango, setRango] = useState("90");
  const [convenioId, setConvenioId] = useState("");
  const [borrando, setBorrando] = useState(null);

  const nombreDeConvenio = useCallback(
    (id) => convenios.find((c) => c.id === id)?.nombre || id,
    [convenios]
  );

  const cargar = useCallback(async () => {
    setError("");
    try {
      const snap = await getDocs(query(collection(db, COLECCION), orderBy("creadoEl", "desc"), limit(TOPE)));
      setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      setLista([]);
      setError(
        String(e?.code || e?.message || e).includes("permission")
          ? "No se pudieron leer las calificaciones: falta pegar en la consola de Firebase el bloque de \"calificaciones\" de firestore.rules (ver README)."
          : "No se pudieron leer las calificaciones: " + (e?.message || e)
      );
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegidas = useMemo(() => (lista || []).filter((c) => !convenioId || c.convenioId === convenioId), [lista, convenioId]);
  const desde = useMemo(() => {
    const dias = RANGOS.find((r) => r.id === rango)?.dias;
    // La fecha de corte se recalcula al cambiar el rango (o al volver a la pestaña).
    return dias ? new Date(Date.now() - dias * DIA_MS) : null;
  }, [rango]);
  const r = useMemo(() => resumenDeCalificaciones(elegidas, { desde }), [elegidas, desde]);
  const maxEstrellas = Math.max(1, ...Object.values(r.porEstrellas));
  const maxMotivo = Math.max(1, ...r.motivos.map((m) => m.total));

  const descargarCsv = () => {
    const filas = elegidas.filter((c) => !desde || (aFecha(c.creadoEl) && aFecha(c.creadoEl) >= desde));
    const blob = new Blob(["﻿" + calificacionesACsv(filas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calificaciones_${convenioId || "todas"}_${rango}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const borrar = async (c) => {
    if (!window.confirm(`¿Borrar esta calificación (${c.estrellas} estrellas, ${fecha(c.creadoEl)})? No se puede deshacer.`)) return;
    setBorrando(c.id);
    try {
      await deleteDoc(doc(db, COLECCION, c.id));
      setLista((xs) => (xs || []).filter((x) => x.id !== c.id));
    } catch (e) {
      console.error(e);
      alert("No se pudo borrar: " + (e?.message || e));
    } finally {
      setBorrando(null);
    }
  };

  if (lista === null) return <p className="text-sm text-slate-500">Cargando calificaciones…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Calificaciones de la gente</h3>
          <p className="text-[12px] text-slate-500">
            Lo que contestaron en &quot;¿Te sirvió este cálculo?&quot;, al pie del recibo. Sin datos del sueldo ni de la persona.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={rango} onChange={(e) => setRango(e.target.value)} aria-label="Período" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {RANGOS.map((x) => (
              <option key={x.id} value={x.id}>{x.texto}</option>
            ))}
          </select>
          <select value={convenioId} onChange={(e) => setConvenioId(e.target.value)} aria-label="Convenio" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos los convenios</option>
            {convenios.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre || c.id}</option>
            ))}
          </select>
          <button type="button" onClick={cargar} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Actualizar</button>
          <button type="button" onClick={descargarCsv} disabled={!r.total} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            Descargar CSV
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      {lista.length >= TOPE && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          Se leyeron las {TOPE} más nuevas: las anteriores no entran en estos números.
        </p>
      )}

      {r.total === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay calificaciones en este período.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Tarjeta titulo="Calificaciones" valor={r.total} />
            <Tarjeta titulo="4 o 5 estrellas" valor={pct(r.satisfaccion)} nota="La medida principal: la tendencia importa más que el número." />
            <Tarjeta titulo="Promedio" valor={uno(r.promedio)} nota="De 1 a 5." />
          </div>

          <p className="text-[11px] text-slate-500">
            Califica sobre todo quien quedó muy conforme o muy disconforme: compará grupos y semanas más que el promedio. Con menos de{" "}
            {MINIMO_PARA_COMPARAR} calificaciones, una diferencia no dice nada.
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-1.5">
              <h4 className="text-[13px] font-semibold text-slate-700">Cuántas de cada una</h4>
              {[5, 4, 3, 2, 1].map((n) => (
                <Barra key={n} etiqueta={estrellitas(n)} total={r.porEstrellas[n]} max={maxEstrellas} />
              ))}
            </div>
            <div className="space-y-1.5">
              <h4 className="text-[13px] font-semibold text-slate-700">
                Qué falló, en las {r.bajas} de {PREGUNTA_MOTIVO_HASTA} estrellas o menos
              </h4>
              {r.motivos.map((m) => (
                <Barra key={m.clave} etiqueta={m.texto} total={m.total} max={maxMotivo} />
              ))}
              <p className="text-[11px] text-slate-500">Se puede marcar más de uno, y no es obligatorio: no suman el total.</p>
            </div>
          </div>

          <TablaDeGrupos titulo="Semana a semana (desde el lunes)" filas={r.porSemana.slice(-12).reverse()} nombre={(k) => `Semana del ${k.split("-").reverse().join("/")}`} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {!convenioId && <TablaDeGrupos titulo="Por convenio" filas={r.porConvenio} nombre={nombreDeConvenio} />}
            <TablaDeGrupos titulo="Quién calcula" filas={r.porPerfil} nombre={(k) => NOMBRE_DE_PERFIL[k] || k} />
            <TablaDeGrupos titulo="Desde dónde" filas={r.porDispositivo} nombre={(k) => NOMBRE_DE_DISPOSITIVO[k] || k} />
            <TablaDeGrupos titulo="Cómo llegó al recibo" filas={r.porOrigen} nombre={(k) => NOMBRE_DE_ORIGEN[k] || k} />
            <TablaDeGrupos
              titulo="Recibos con avisos (falta una tabla, se usó la de otro mes…)"
              filas={r.porAvisos}
              nombre={(k) => (k === "con avisos" ? "Con avisos" : k === "sin avisos" ? "Sin avisos" : k)}
            />
          </div>

          <div>
            <h4 className="mb-2 text-[13px] font-semibold text-slate-700">Comentarios ({r.comentarios.length})</h4>
            {r.comentarios.length === 0 ? (
              <p className="text-[12px] text-slate-500">Nadie dejó comentario en este período.</p>
            ) : (
              <ul className="space-y-2">
                {r.comentarios.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 p-3 text-[12px]">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500">
                      <span className="text-amber-500" aria-label={`${c.estrellas} estrellas`}>{estrellitas(c.estrellas)}</span>
                      <span>{fecha(c.creadoEl)}</span>
                      <span>· {nombreDeConvenio(c.convenioId)} {c.periodo}</span>
                      {c.categoria && <span>· {c.categoria}</span>}
                      {c.perfil && <span>· {NOMBRE_DE_PERFIL[c.perfil] || c.perfil}</span>}
                      {c.dispositivo && <span>· {NOMBRE_DE_DISPOSITIVO[c.dispositivo] || c.dispositivo}</span>}
                      <button
                        type="button"
                        onClick={() => borrar(c)}
                        disabled={borrando === c.id}
                        className="ml-auto text-[11px] font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
                      >
                        Borrar
                      </button>
                    </div>
                    {Array.isArray(c.motivos) && c.motivos.length > 0 && (
                      <div className="mt-1 text-slate-600">Qué falló: {c.motivos.map((m) => NOMBRE_DE_MOTIVO[m] || m).join(", ")}</div>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{c.comentario}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
