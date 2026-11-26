"use client";
// components/calculadora/CalificarExperiencia.jsx
// La tarjeta "¿Te sirvió este cálculo?" del pie del recibo. Qué guarda, para
// qué, por qué así y no con un cartel, y qué validan las reglas:
// lib/calificaciones.js.
//
// El recorrido: la persona toca una estrella y la calificación queda guardada,
// sin botón "Enviar" (el que no lo aprieta se pierde). Recién ahí aparece lo
// opcional: qué falló si calificó con 3 o menos, quién es y un comentario.
// Cada toque se guarda solo; el comentario, con su botón. Si cambia de
// estrellas en el momento, se corrige la misma calificación, no se suma otra.
// Los toques seguidos se juntan (`espera`) y se manda uno solo, en orden.
//
// No insiste: "Ahora no" la esconde por un tiempo, y después de calificar no
// vuelve a aparecer (lib/calificaciones.js, DIAS_SIN_PREGUNTAR).

import { useEffect, useRef, useState } from "react";
import {
  MOTIVOS,
  PERFILES,
  MAX_COMENTARIO,
  PREGUNTA_MOTIVO_HASTA,
  nuevoIdDeCalificacion,
  escrituraNueva,
  escrituraDeCambio,
  enviarCalificacion,
  leerRegistro,
  guardarRegistro,
  debePreguntar,
  puedeCambiar,
  dispositivoDe,
} from "@/lib/calificaciones";

const AHORA = () => new Date();
const ESTRELLAS = [1, 2, 3, 4, 5];
const NOMBRE_DE_LAS_ESTRELLAS = ["", "Muy mal", "Mal", "Más o menos", "Bien", "Muy bien"];

function almacenDelNavegador() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function Estrella({ llena }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-7 w-7 transition-colors ${llena ? "fill-amber-400 stroke-amber-500" : "fill-transparent stroke-slate-400"}`}
      strokeWidth="1.5"
    >
      <path strokeLinejoin="round" d="M12 2.8l2.84 5.76 6.36.92-4.6 4.48 1.09 6.33L12 17.3l-5.69 2.99 1.09-6.33-4.6-4.48 6.36-.92z" />
    </svg>
  );
}

function Opcion({ activa, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        activa ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * @param contexto  lo que se guarda solo con la calificación: { convenioId,
 *   periodo, categoria, origen, conAvisos, calculos } (lib/calificaciones.js).
 * @param enviar, almacen, ahora, espera  para los tests: a dónde se manda, dónde
 *   se recuerda, qué hora es y cuánto se espera para juntar toques.
 */
export default function CalificarExperiencia({ contexto, enviar = enviarCalificacion, almacen = null, ahora = AHORA, espera = 700 }) {
  // cargando → (oculta | pregunta) → guardada → cerrada
  const [fase, setFase] = useState("cargando");
  const [estrellas, setEstrellas] = useState(0);
  const [previa, setPrevia] = useState(0);
  const [motivos, setMotivos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [comentario, setComentario] = useState("");
  const [comentarioGuardado, setComentarioGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Lo último que contestó, para que cada envío mande lo más nuevo aunque se
  // haya programado antes; y la calificación creada, si ya la hay.
  const respuestas = useRef({ estrellas: 0, motivos: [], perfil: null, comentario: "" });
  const creada = useRef(null);
  const temporizador = useRef(null);
  const cola = useRef(Promise.resolve(true));
  const contextoActual = useRef(contexto);
  useEffect(() => {
    contextoActual.current = contexto;
  }, [contexto]);

  const almacenReal = () => almacen ?? almacenDelNavegador();

  // Si se pregunta o no, se decide en el navegador (el servidor no sabe qué
  // contestó esta persona antes) y una sola vez.
  useEffect(() => {
    const registro = leerRegistro(almacen ?? almacenDelNavegador());
    setFase((f) => (f === "cargando" ? (debePreguntar(registro, ahora()) ? "pregunta" : "oculta") : f));
    return () => clearTimeout(temporizador.current);
  }, [almacen, ahora]);

  /** Manda lo contestado: la primera vez crea la calificación; después la corrige. Devuelve si se guardó. */
  const guardar = () => {
    cola.current = cola.current.then(async () => {
      const r = respuestas.current;
      setGuardando(true);
      setError("");
      try {
        if (!creada.current) {
          const id = nuevoIdDeCalificacion();
          const ctx = { ...contextoActual.current, dispositivo: dispositivoDe(typeof window !== "undefined" ? window.innerWidth : 0) };
          await enviar(escrituraNueva({ id, estrellas: r.estrellas, contexto: ctx }));
          creada.current = { estado: "calificada", el: ahora().toISOString(), id };
          guardarRegistro(almacenReal(), creada.current);
          setFase((f) => (f === "pregunta" ? "guardada" : f));
        } else if (puedeCambiar(creada.current, ahora())) {
          await enviar(
            escrituraDeCambio({
              id: creada.current.id,
              estrellas: r.estrellas,
              motivos: r.estrellas <= PREGUNTA_MOTIVO_HASTA ? r.motivos : [],
              perfil: r.perfil,
              comentario: r.comentario,
            })
          );
        } else {
          setError("Ya pasó el rato para cambiar esta calificación, pero quedó guardada. ¡Gracias!");
          return false;
        }
        return true;
      } catch (e) {
        setError(e?.message || "No pudimos guardar tu calificación. Probá de nuevo en un rato.");
        return false;
      } finally {
        setGuardando(false);
      }
    });
    return cola.current;
  };

  const programar = () => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(guardar, espera);
  };

  const elegirEstrellas = (n) => {
    respuestas.current = { ...respuestas.current, estrellas: n };
    setEstrellas(n);
    programar();
  };

  const alternarMotivo = (id) => {
    const actual = respuestas.current.motivos;
    const nuevos = actual.includes(id) ? actual.filter((m) => m !== id) : [...actual, id];
    respuestas.current = { ...respuestas.current, motivos: nuevos };
    setMotivos(nuevos);
    programar();
  };

  const elegirPerfil = (id) => {
    const nuevo = respuestas.current.perfil === id ? null : id;
    respuestas.current = { ...respuestas.current, perfil: nuevo };
    setPerfil(nuevo);
    programar();
  };

  const mandarComentario = async (e) => {
    e.preventDefault();
    clearTimeout(temporizador.current);
    respuestas.current = { ...respuestas.current, comentario };
    const ok = await guardar();
    setComentarioGuardado(ok);
  };

  const descartar = () => {
    clearTimeout(temporizador.current);
    guardarRegistro(almacenReal(), { estado: "descartada", el: ahora().toISOString() });
    setFase("oculta");
  };

  if (fase === "cargando" || fase === "oculta") return null;

  if (fase === "cerrada") {
    return (
      <p role="status" className="text-[12px] text-emerald-800 print:hidden">
        ¡Gracias por calificar! Nos ayuda a mejorar la calculadora.
      </p>
    );
  }

  const mostradas = previa || estrellas;
  const baja = estrellas > 0 && estrellas <= PREGUNTA_MOTIVO_HASTA;

  return (
    <section aria-label="Calificá este cálculo" className="rounded-xl border border-slate-200 bg-slate-50 p-4 print:hidden">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">¿Te sirvió este cálculo?</legend>
        {fase === "pregunta" && <p className="text-[12px] text-slate-500">Calificalo con un toque y nos ayudás a mejorar.</p>}
        <div className="mt-2 flex items-center gap-0.5" onMouseLeave={() => setPrevia(0)}>
          {ESTRELLAS.map((n) => (
            <label
              key={n}
              onMouseEnter={() => setPrevia(n)}
              className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-400"
            >
              <input
                type="radio"
                name="calificacion-estrellas"
                value={n}
                checked={estrellas === n}
                onChange={() => elegirEstrellas(n)}
                className="sr-only"
              />
              <Estrella llena={n <= mostradas} />
              <span className="sr-only">{`${n} de 5 estrellas (${NOMBRE_DE_LAS_ESTRELLAS[n]})`}</span>
            </label>
          ))}
          <span className="ml-2 min-w-[6rem] text-[12px] text-slate-600" aria-hidden="true">
            {mostradas ? NOMBRE_DE_LAS_ESTRELLAS[mostradas] : ""}
          </span>
          {guardando && <span className="text-[11px] text-slate-400">Guardando…</span>}
        </div>
      </fieldset>

      {fase === "pregunta" && !guardando && (
        <button type="button" onClick={descartar} className="mt-2 text-[12px] text-slate-500 underline underline-offset-2 hover:text-slate-800">
          Ahora no
        </button>
      )}

      {fase === "guardada" && (
        <div className="mt-3 space-y-3">
          <p role="status" className="text-[13px] font-medium text-emerald-800">
            ¡Gracias! {baja ? "Contanos qué falló, así lo arreglamos." : "Si querés, contanos un poco más."}
          </p>

          {baja && (
            <div role="group" aria-labelledby="calificar-motivos">
              <p id="calificar-motivos" className="text-[12px] font-semibold text-slate-700">¿Qué falló? Podés marcar varias.</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {MOTIVOS.map((m) => (
                  <Opcion key={m.id} activa={motivos.includes(m.id)} onClick={() => alternarMotivo(m.id)}>
                    {m.texto}
                  </Opcion>
                ))}
              </div>
            </div>
          )}

          <div role="group" aria-labelledby="calificar-perfil">
            <p id="calificar-perfil" className="text-[12px] font-semibold text-slate-700">¿Para qué la usaste? (opcional)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PERFILES.map((p) => (
                <Opcion key={p.id} activa={perfil === p.id} onClick={() => elegirPerfil(p.id)}>
                  {p.texto}
                </Opcion>
              ))}
            </div>
          </div>

          <form onSubmit={mandarComentario} className="space-y-1.5">
            <label htmlFor="calificar-comentario" className="block text-[12px] font-semibold text-slate-700">
              Comentario (opcional)
            </label>
            <textarea
              id="calificar-comentario"
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                setComentarioGuardado(false);
              }}
              maxLength={MAX_COMENTARIO}
              rows={3}
              placeholder={baja ? "Qué esperabas ver y qué te dio…" : "Qué te sirvió, qué te faltó…"}
              aria-describedby="calificar-comentario-nota"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400"
            />
            <p id="calificar-comentario-nota" className="text-[11px] text-slate-500">
              No escribas datos personales (nombre, CUIL, empresa). Si encontraste un error en el cálculo, también podés usar
              &quot;Reportar error / sugerencia&quot;.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!comentario.trim() || guardando}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar comentario
              </button>
              <button
                type="button"
                onClick={() => setFase("cerrada")}
                className="text-[12px] text-slate-600 underline underline-offset-2 hover:text-slate-900"
              >
                Listo
              </button>
            </div>
            {comentarioGuardado && (
              <p role="status" className="text-[12px] text-emerald-800">
                Comentario guardado. ¡Gracias!
              </p>
            )}
          </form>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-rose-700">
          {error}{" "}
          {fase === "pregunta" && estrellas > 0 && (
            <button type="button" onClick={guardar} className="font-semibold underline underline-offset-2">
              Reintentar
            </button>
          )}
        </p>
      )}
    </section>
  );
}
