"use client";
// components/admin/CalificacionesTab.jsx
// Lo que la gente contestó en la tarjeta "¿Te sirvió este cálculo?" del
// recibo (lib/calificaciones.js), para decidir qué mejorar.
//
// Cómo leerlo (también está en la pantalla): califica sobre todo el que quedó
// muy contento o muy enojado, así que importan más las comparaciones y la
// tendencia que el promedio en sí; y con menos de MINIMO_PARA_COMPARAR
// calificaciones, una diferencia entre grupos no dice nada (se marca).
//
// Las preguntas que responde, en el orden de la pantalla: ¿cómo venimos y
// hacia dónde va? (semana a semana, incluidas las semanas en cero: una semana
// sin ninguna después de semanas con datos es la alarma de que la tarjeta dejó
// de guardar; una caída después de cargar un mes o de publicar, la de que algo
// quedó mal); ¿qué falla? (los motivos de las bajas); ¿cuántos siguen después
// de la estrella? (si la tarjeta lleva a contestar lo opcional: para comparar
// antes y después de cambiarla, en celular y en computadora); ¿dónde? (convenio,
// celular o computadora, link o a mano, recibos a los que les faltaban datos);
// ¿para quién? (perfil); y el detalle, en los comentarios.
//
// Las calificaciones de prueba (hechas desde la PC o una preview, con
// `entorno: "prueba"`) no entran en los números salvo que se pida. Y como
// cualquiera puede crear calificaciones sin sesión (lib/calificaciones.js),
// el panel tiene con qué limpiar: Borrar en cada una, y borrar de una todas
// las que muestra el filtro.

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  COLECCION,
  MOTIVOS,
  PERFILES,
  MINIMO_PARA_COMPARAR,
  PREGUNTA_MOTIVO_HASTA,
  resumenDeCalificaciones,
  calificacionesACsv,
  fechaArgentina,
  esPrueba,
} from "@/lib/calificaciones";

const RANGOS = [
  { id: "30", texto: "Últimos 30 días", dias: 30 },
  { id: "90", texto: "Últimos 90 días", dias: 90 },
  { id: "todo", texto: "Desde el principio", dias: null },
];
/** Cuántas se leen como máximo. Si algún día se llega, el panel lo dice. */
const TOPE = 5000;
/** Cuántas se listan de entrada en "Todas las calificaciones". */
const LISTADAS = 50;
/** Firestore acepta hasta 500 escrituras por lote. */
const POR_LOTE = 450;
const DIA_MS = 24 * 60 * 60 * 1000;

const NOMBRE_DE_PERFIL = Object.fromEntries(PERFILES.map((p) => [p.id, p.texto]));
const NOMBRE_DE_MOTIVO = Object.fromEntries(MOTIVOS.map((m) => [m.id, m.texto]));
const NOMBRE_DE_DISPOSITIVO = { movil: "Celular", escritorio: "Computadora" };
const NOMBRE_DE_ORIGEN = { manual: "Calculó a mano", link: "Abrió un link compartido" };
const NOMBRE_DE_DATOS = { faltaban: "Le faltaban datos", completos: "Con todos los datos" };
const NOMBRE_DE_SEGUIMIENTO = { total: "Total", ...NOMBRE_DE_DISPOSITIVO };

const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);
/** Qué parte de `de` es `n`; sin ninguna, no hay parte (se muestra "—"). */
const parte = (n, de) => (de ? n / de : null);
const uno = (x) => (x == null ? "—" : x.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const estrellitas = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const fechaCorta = (v) => {
  const f = fechaArgentina(v);
  return f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(2, 4)} ${f.slice(11)}` : "—";
};

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

/** `conSiguieron`: una columna más con qué parte siguió después de la estrella (semana a semana). */
function TablaDeGrupos({ titulo, filas, nombre = (k) => k, marca = () => null, conSiguieron = false }) {
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
            {conSiguieron && <th className="py-1 text-right font-medium">Siguieron</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.clave} className={`border-t border-slate-100 ${marca(f) === "alarma" ? "bg-rose-50" : ""}`}>
              <td className="py-1 text-slate-700">
                {nombre(f.clave)}
                {marca(f) === "alarma" && <span className="ml-1 text-[11px] font-semibold text-rose-700">ninguna: ¿la tarjeta guarda?</span>}
                {marca(f) === "en curso" && <span className="ml-1 text-[11px] text-slate-500">(en curso)</span>}
                {f.total > 0 && f.total < MINIMO_PARA_COMPARAR && <span className="ml-1 text-[11px] text-amber-700">(pocas para comparar)</span>}
              </td>
              <td className="py-1 text-right tabular-nums">{f.total}</td>
              <td className="py-1 text-right tabular-nums">{uno(f.promedio)}</td>
              <td className="py-1 text-right tabular-nums">{pct(f.satisfaccion)}</td>
              {conSiguieron && <td className="py-1 text-right tabular-nums">{pct(parte(f.siguieron, f.total))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Cuántos siguen después de la estrella (lib/calificaciones.js, seguimientoDe): total, celular y computadora. */
function TablaDeSeguimiento({ filas }) {
  return (
    <div>
      <h4 className="mb-1 text-[13px] font-semibold text-slate-700">Cuántos siguen después de la estrella</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium"> </th>
              <th className="py-1 text-right font-medium">Cuántas</th>
              <th className="py-1 text-right font-medium">Siguieron</th>
              <th className="py-1 text-right font-medium">Para qué la usaron</th>
              <th className="py-1 text-right font-medium">Qué falló (de las de 1 a {PREGUNTA_MOTIVO_HASTA})</th>
              <th className="py-1 text-right font-medium">Dejaron comentario</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} className="border-t border-slate-100">
                <td className="py-1 text-slate-700">
                  {NOMBRE_DE_SEGUIMIENTO[f.clave] || f.clave}
                  {f.total > 0 && f.total < MINIMO_PARA_COMPARAR && <span className="ml-1 text-[11px] text-amber-700">(pocas para comparar)</span>}
                </td>
                <td className="py-1 text-right tabular-nums">{f.total}</td>
                <td className="py-1 text-right tabular-nums">{pct(parte(f.siguieron, f.total))}</td>
                <td className="py-1 text-right tabular-nums">{pct(parte(f.conPerfil, f.total))}</td>
                <td className="py-1 text-right tabular-nums">
                  {pct(parte(f.bajasConMotivo, f.bajas))}
                  {/* Se cuenta sobre las bajas, que suelen ser pocas: con menos de MINIMO_PARA_COMPARAR, la base a la vista. */}
                  {f.bajas > 0 && f.bajas < MINIMO_PARA_COMPARAR && (
                    <span className="ml-1 text-[11px] text-amber-700">
                      ({f.bajasConMotivo} de {f.bajas})
                    </span>
                  )}
                </td>
                <td className="py-1 text-right tabular-nums">{pct(parte(f.conComentario, f.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Siguieron: después de la estrella tocaron algo más o apretaron &quot;Enviar&quot;. Qué falló se cuenta sobre las de 1 a{" "}
        {PREGUNTA_MOTIVO_HASTA} estrellas, que son las que lo ven; con pocas, al lado va de cuántas sale. Para saber si un
        cambio en la tarjeta funcionó, compará la columna Siguieron de semana a semana, antes y después del cambio.
      </p>
    </div>
  );
}

function Calificacion({ c, nombreDeConvenio, onBorrar, borrando }) {
  return (
    <li className="rounded-lg border border-slate-200 p-3 text-[12px]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500">
        <span className="text-amber-500" aria-label={`${c.estrellas} estrellas`}>{estrellitas(c.estrellas)}</span>
        <span>{fechaCorta(c.creadoEl)}</span>
        <span>· {nombreDeConvenio(c.convenioId)} {c.periodo}</span>
        {c.categoria && <span>· {c.categoria}</span>}
        {c.perfil && <span>· {NOMBRE_DE_PERFIL[c.perfil] || c.perfil}</span>}
        {c.dispositivo && <span>· {NOMBRE_DE_DISPOSITIVO[c.dispositivo] || c.dispositivo}</span>}
        {c.faltanDatos && <span>· le faltaban datos</span>}
        {esPrueba(c) && <span className="rounded bg-slate-200 px-1.5 text-[10px] font-semibold uppercase text-slate-600">prueba</span>}
        <button
          type="button"
          onClick={() => onBorrar(c)}
          disabled={borrando}
          className="ml-auto text-[11px] font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
      {Array.isArray(c.motivos) && c.motivos.length > 0 && (
        <div className="mt-1 text-slate-600">Qué falló: {c.motivos.map((m) => NOMBRE_DE_MOTIVO[m] || m).join(", ")}</div>
      )}
      {c.comentario && <p className="mt-1 whitespace-pre-wrap text-slate-800">{c.comentario}</p>}
    </li>
  );
}

export default function CalificacionesTab({ convenios = [] }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [rango, setRango] = useState("90");
  const [convenioId, setConvenioId] = useState("");
  const [incluirPruebas, setIncluirPruebas] = useState(false);
  const [listadas, setListadas] = useState(LISTADAS);
  const [borrando, setBorrando] = useState(false);
  // La hora de la última lectura: el corte de "últimos N días" y la semana en
  // curso se cuentan desde ahí (se actualiza con "Actualizar").
  const [leidoEl, setLeidoEl] = useState(null);

  const nombreDeConvenio = useCallback((id) => convenios.find((c) => c.id === id)?.nombre || id, [convenios]);

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
    setLeidoEl(new Date());
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const desde = useMemo(() => {
    const dias = RANGOS.find((r) => r.id === rango)?.dias;
    return dias && leidoEl ? new Date(leidoEl.getTime() - dias * DIA_MS) : null;
  }, [rango, leidoEl]);

  const delConvenio = useMemo(() => (lista || []).filter((c) => !convenioId || c.convenioId === convenioId), [lista, convenioId]);
  const r = useMemo(
    () => resumenDeCalificaciones(delConvenio, { desde, hasta: leidoEl || undefined, incluirPruebas }),
    [delConvenio, desde, leidoEl, incluirPruebas]
  );
  const maxEstrellas = Math.max(1, ...Object.values(r.porEstrellas));
  const maxMotivo = Math.max(1, ...r.motivos.map((m) => m.total));
  // Una semana en cero después de semanas con datos (y que no sea la que está en curso) es la alarma.
  const primeraConDatos = r.porSemana.findIndex((s) => s.total > 0);
  const marcaDeSemana = (s) => {
    if (s.enCurso) return "en curso";
    const i = r.porSemana.indexOf(s);
    return s.total === 0 && primeraConDatos !== -1 && i > primeraConDatos ? "alarma" : null;
  };

  const descargarCsv = () => {
    const blob = new Blob(["﻿" + calificacionesACsv(r.calificaciones)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calificaciones_${convenioId || "todas"}_${rango}${incluirPruebas ? "_con-pruebas" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sacarDeLaLista = (ids) => {
    const fuera = new Set(ids);
    setLista((xs) => (xs || []).filter((x) => !fuera.has(x.id)));
  };

  const borrarUna = async (c) => {
    if (!window.confirm(`¿Borrar esta calificación (${c.estrellas} estrellas, ${fechaCorta(c.creadoEl)})? No se puede deshacer.`)) return;
    setBorrando(true);
    try {
      await deleteDoc(doc(db, COLECCION, c.id));
      sacarDeLaLista([c.id]);
    } catch (e) {
      console.error(e);
      alert("No se pudo borrar: " + (e?.message || e));
    } finally {
      setBorrando(false);
    }
  };

  /** Borra de una todas las que muestra el filtro (para limpiar pruebas o calificaciones falsas). */
  const borrarFiltradas = async () => {
    const ids = r.calificaciones.map((c) => c.id);
    if (!ids.length) return;
    const filtro = `${RANGOS.find((x) => x.id === rango)?.texto.toLowerCase()}, ${convenioId ? nombreDeConvenio(convenioId) : "todos los convenios"}${incluirPruebas ? ", con las de prueba" : ""}`;
    if (!window.confirm(`¿Borrar las ${ids.length} calificaciones que muestra el filtro (${filtro})? No se puede deshacer.\n\nConviene descargar el CSV antes.`)) return;
    setBorrando(true);
    try {
      for (let i = 0; i < ids.length; i += POR_LOTE) {
        const lote = writeBatch(db);
        for (const id of ids.slice(i, i + POR_LOTE)) lote.delete(doc(db, COLECCION, id));
        await lote.commit();
        sacarDeLaLista(ids.slice(i, i + POR_LOTE));
      }
    } catch (e) {
      console.error(e);
      alert("No se pudieron borrar todas: " + (e?.message || e) + ". Las que se borraron ya no aparecen.");
    } finally {
      setBorrando(false);
    }
  };

  if (lista === null) return <p className="text-sm text-slate-500">Cargando calificaciones…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Calificaciones de la gente</h3>
          <p className="text-[12px] text-slate-500">
            Lo que contestaron en &quot;¿Te sirvió este cálculo?&quot;, en el recibo. Sin datos del sueldo; los comentarios los
            escribe cada uno y pueden traer datos personales: si ves alguno, borralo.
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
          <label className="flex items-center gap-1.5 text-[12px] text-slate-600">
            <input type="checkbox" checked={incluirPruebas} onChange={(e) => setIncluirPruebas(e.target.checked)} />
            Incluir pruebas ({r.pruebas})
          </label>
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
            {MINIMO_PARA_COMPARAR} calificaciones, una diferencia no dice nada. Las fechas y las semanas van en hora argentina.
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

          <TablaDeSeguimiento filas={r.seguimiento} />

          <TablaDeGrupos
            titulo="Semana a semana (de lunes a domingo)"
            filas={[...r.porSemana].reverse().slice(0, 16)}
            nombre={(k) => `Semana del ${k.split("-").reverse().join("/")}`}
            marca={marcaDeSemana}
            conSiguieron
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {!convenioId && <TablaDeGrupos titulo="Por convenio" filas={r.porConvenio} nombre={nombreDeConvenio} />}
            <TablaDeGrupos titulo="Para qué la usan" filas={r.porPerfil} nombre={(k) => NOMBRE_DE_PERFIL[k] || k} />
            <TablaDeGrupos titulo="Desde dónde" filas={r.porDispositivo} nombre={(k) => NOMBRE_DE_DISPOSITIVO[k] || k} />
            <TablaDeGrupos titulo="Cómo se armó el recibo" filas={r.porOrigen} nombre={(k) => NOMBRE_DE_ORIGEN[k] || k} />
            <TablaDeGrupos
              titulo="¿Le faltaban datos al recibo? (una tabla del mes que no está, o que se tomó de otro mes)"
              filas={r.porFaltanDatos}
              nombre={(k) => NOMBRE_DE_DATOS[k] || k}
            />
          </div>

          <div>
            <h4 className="mb-2 text-[13px] font-semibold text-slate-700">Comentarios ({r.comentarios.length})</h4>
            {r.comentarios.length === 0 ? (
              <p className="text-[12px] text-slate-500">Nadie dejó comentario en este período.</p>
            ) : (
              <ul className="space-y-2">
                {r.comentarios.map((c) => (
                  <Calificacion key={c.id} c={c} nombreDeConvenio={nombreDeConvenio} onBorrar={borrarUna} borrando={borrando} />
                ))}
              </ul>
            )}
          </div>

          <details className="rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-[13px] font-semibold text-slate-700">
              Todas las calificaciones del filtro ({r.calificaciones.length}), para revisar o limpiar
            </summary>
            <p className="mt-2 text-[11px] text-slate-500">
              Cualquiera puede calificar sin registrarse, así que alguien podría cargar calificaciones falsas: si ves una tanda rara
              (muchas iguales en pocos minutos), filtrala y borrala. Las de prueba se pueden borrar igual.
            </p>
            <ul className="mt-2 space-y-2">
              {r.calificaciones.slice(0, listadas).map((c) => (
                <Calificacion key={c.id} c={c} nombreDeConvenio={nombreDeConvenio} onBorrar={borrarUna} borrando={borrando} />
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {r.calificaciones.length > listadas && (
                <button type="button" onClick={() => setListadas((n) => n + LISTADAS)} className="text-[12px] font-semibold text-slate-700 underline">
                  Mostrar {Math.min(LISTADAS, r.calificaciones.length - listadas)} más
                </button>
              )}
              <button
                type="button"
                onClick={borrarFiltradas}
                disabled={borrando || !r.calificaciones.length}
                className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Borrar las {r.calificaciones.length} del filtro
              </button>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
