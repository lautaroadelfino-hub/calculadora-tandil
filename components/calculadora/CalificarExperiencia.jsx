"use client";
// components/calculadora/CalificarExperiencia.jsx
// La tarjeta "¿Te sirvió este cálculo?" del recibo. Qué guarda, para qué, por
// qué así y no con un cartel, y qué validan las reglas: lib/calificaciones.js.
//
// Dónde y cómo se ve (pedido del dueño, 26/11/2026): una sola línea discreta
// con las estrellas, debajo de los tres números del recibo (neto, bruto, costo
// laboral), que es lo primero que se mira. Al pie quedaba demasiado escondida.
// No tiene "Ahora no": no es un cartel, así que el que no quiere calificar
// simplemente no toca nada.
//
// El recorrido: la persona toca una estrella y la calificación sale en ese
// momento, sin botón (el que no lo aprieta se pierde) y sin esperar (el que
// toca y cierra la pestaña también cuenta). Recién ahí se abre lo opcional:
// qué falló si calificó con 3 o menos, para qué usó la calculadora y un
// comentario. Cada elección corrige la misma calificación sola; "Enviar"
// (siempre habilitado: todo es opcional de verdad, también sin comentario)
// manda lo que falte, pliega el panel con una transición corta y deja
// "¡Gracias por ayudar a mejorar!". Lo pendiente se manda igual si la tarjeta
// desaparece o la página se cierra.
//
// Hay una tarjeta por recibo: la calculadora la vuelve a armar al recalcular,
// y si ya calificó no se muestra (DIAS_SIN_PREGUNTAR). El id de la
// calificación se elige una sola vez: un reintento después de un corte no la
// duplica, y si el alta había llegado y se perdió la respuesta, el reintento
// la encuentra y sigue desde ahí (revisión del 26/11/2026).

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
  entornoDe,
} from "@/lib/calificaciones";

const AHORA = () => new Date();
const ESTRELLAS = [1, 2, 3, 4, 5];
const NOMBRE_DE_LAS_ESTRELLAS = ["", "Muy mal", "Mal", "Más o menos", "Bien", "Muy bien"];
const VENCIDA = "Pasó más de un día desde que calificaste y esto ya no se puede cambiar. Si querés contarnos algo más, usá \"Reportar error / sugerencia\".";
/** Lo que dura el plegado del panel al enviar (igual que `duration-300`). */
const PLEGADO_MS = 320;

function almacenDelNavegador() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** ¿La persona pidió menos movimiento en su sistema? Entonces nada de transiciones. */
function menosMovimiento() {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function Estrella({ llena }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-6 w-6 transition-colors ${llena ? "fill-amber-400 stroke-amber-500" : "fill-transparent stroke-slate-400"}`}
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

/** "¡Gracias por ayudar a mejorar!", que aparece con un fundido suave. */
function Agradecimiento({ comentarioEnviado, onBorrarComentario, borrado }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition-all duration-300 ease-out motion-reduce:transition-none print:hidden ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      }`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-[11px] text-white" aria-hidden="true">✓</span>
      ¡Gracias por ayudar a mejorar!
      {comentarioEnviado && !borrado && (
        <button type="button" onClick={onBorrarComentario} className="ml-auto text-[11px] font-normal text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
          Borrar mi comentario
        </button>
      )}
      {borrado && <span className="ml-auto text-[11px] font-normal text-emerald-700">Borramos tu comentario.</span>}
    </div>
  );
}

/**
 * @param contexto  lo que se guarda solo con la calificación: { convenioId,
 *   periodo, categoria, origen, faltanDatos, calculos } (lib/calificaciones.js).
 * @param enviar, almacen, ahora, espera  para los tests: a dónde se manda, dónde
 *   se recuerda, qué hora es y cuánto se espera para juntar toques.
 */
export default function CalificarExperiencia({ contexto, enviar = enviarCalificacion, almacen = null, ahora = AHORA, espera = 700 }) {
  // cargando → (oculta | pregunta) → guardada → cerrada
  const [fase, setFase] = useState("cargando");
  const [plegando, setPlegando] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [previa, setPrevia] = useState(0);
  const [motivos, setMotivos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [comentario, setComentario] = useState("");
  const [comentarioEnviado, setComentarioEnviado] = useState("");
  const [comentarioBorrado, setComentarioBorrado] = useState(false);
  // Sólo mientras corre el "Enviar" que apretó la persona (contra el doble clic).
  // No se apaga mientras se guarda sola una elección anterior: así el clic de
  // ese momento se perdía sin aviso (26/11/2026).
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Lo último que contestó, para que cada envío mande lo más nuevo aunque se
  // haya programado antes; el id elegido para el alta; y la calificación ya
  // creada, si la hay.
  const respuestas = useRef({ estrellas: 0, motivos: [], perfil: null, comentario: "" });
  const idDelAlta = useRef(null);
  const creada = useRef(null);
  const temporizador = useRef(null);
  const cola = useRef(Promise.resolve(true));
  const ultimoFallo = useRef(false);
  const contextoActual = useRef(contexto);
  useEffect(() => {
    contextoActual.current = contexto;
  }, [contexto]);

  const almacenReal = () => almacen ?? almacenDelNavegador();

  /** Manda lo contestado: la primera vez crea la calificación; después la corrige. Devuelve si se guardó. */
  const guardar = () => {
    cola.current = cola.current.then(async () => {
      const r = respuestas.current;
      setError("");
      const cambio = () =>
        escrituraDeCambio({
          id: (creada.current || {}).id || idDelAlta.current,
          estrellas: r.estrellas,
          motivos: r.estrellas <= PREGUNTA_MOTIVO_HASTA ? r.motivos : [],
          perfil: r.perfil,
          comentario: r.comentario,
        });
      try {
        if (!creada.current) {
          idDelAlta.current = idDelAlta.current || nuevoIdDeCalificacion();
          const ctx = {
            ...contextoActual.current,
            dispositivo: dispositivoDe(typeof window !== "undefined" ? window.innerWidth : 0),
            entorno: typeof window !== "undefined" ? entornoDe(window.location.hostname) : "prueba",
          };
          try {
            await enviar(escrituraNueva({ id: idDelAlta.current, estrellas: r.estrellas, contexto: ctx }));
          } catch (e) {
            // ¿Ya existía? Pasa si el alta anterior llegó y se perdió la
            // respuesta: Firestore rechaza crearla de nuevo con el mismo id.
            // Si corregirla funciona, estaba creada; si no, era otro error.
            if (!e?.status) throw e;
            await enviar(cambio()).catch(() => { throw e; });
          }
          creada.current = { estado: "calificada", el: ahora().toISOString(), id: idDelAlta.current };
          guardarRegistro(almacenReal(), creada.current);
          setFase((f) => (f === "pregunta" ? "guardada" : f));
        } else if (puedeCambiar(creada.current, ahora())) {
          await enviar(cambio());
        } else {
          setError(VENCIDA);
          ultimoFallo.current = true;
          return false;
        }
        ultimoFallo.current = false;
        return true;
      } catch (e) {
        setError(e?.message || "No pudimos guardar tu calificación. Probá de nuevo en un rato.");
        ultimoFallo.current = true;
        return false;
      }
    });
    return cola.current;
  };

  /** Lo que estaba esperando para juntarse con otros toques, que salga ya. */
  const vaciarPendiente = () => {
    if (temporizador.current === null) return;
    clearTimeout(temporizador.current);
    temporizador.current = null;
    guardar();
  };
  const vaciarRef = useRef(vaciarPendiente);
  useEffect(() => {
    vaciarRef.current = vaciarPendiente;
  });

  // Si se pregunta o no, se decide en el navegador (el servidor no sabe qué
  // contestó esta persona antes) y una sola vez. Lo pendiente se manda igual
  // si la tarjeta desaparece (recalcular, ir a otra página) o la pestaña se
  // cierra: el envío lleva `keepalive` (lib/calificaciones.js).
  useEffect(() => {
    const registro = leerRegistro(almacen ?? almacenDelNavegador());
    setFase((f) => (f === "cargando" ? (debePreguntar(registro, ahora()) ? "pregunta" : "oculta") : f));
    const alOcultar = () => vaciarRef.current();
    if (typeof window !== "undefined") window.addEventListener("pagehide", alOcultar);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("pagehide", alOcultar);
      vaciarRef.current();
    };
  }, [almacen, ahora]);

  /** Junta los toques seguidos y manda uno solo. La primera estrella no espera. */
  const programar = () => {
    if (!creada.current && !idDelAlta.current) {
      guardar();
      return;
    }
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      guardar();
    }, espera);
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

  /**
   * "Enviar": manda lo que haya (con o sin comentario: todo es opcional),
   * pliega el panel y deja el agradecimiento. Si no se pudo guardar, el panel
   * queda abierto con el error y "Reintentar".
   */
  const enviarTodo = async (e) => {
    e?.preventDefault?.();
    if (enviando) return;
    setEnviando(true);
    clearTimeout(temporizador.current);
    temporizador.current = null;
    respuestas.current = { ...respuestas.current, comentario };
    // Se encola detrás de lo que se esté guardando solo (cola): sale en orden.
    const ok = await guardar();
    setEnviando(false);
    if (!ok) return;
    setComentarioEnviado(comentario.trim());
    setPlegando(true);
    setTimeout(() => setFase("cerrada"), menosMovimiento() ? 0 : PLEGADO_MS);
  };

  /** Desde el agradecimiento: borra el comentario que mandó (la Ley 25.326 le da derecho a sacarlo). */
  const borrarComentario = async () => {
    respuestas.current = { ...respuestas.current, comentario: "" };
    const ok = await guardar();
    if (ok) setComentarioBorrado(true);
  };

  const reintentar = () => {
    clearTimeout(temporizador.current);
    temporizador.current = null;
    guardar();
  };

  if (fase === "cargando" || fase === "oculta") return null;

  if (fase === "cerrada") {
    return (
      <div className="space-y-1">
        <Agradecimiento comentarioEnviado={comentarioEnviado} onBorrarComentario={borrarComentario} borrado={comentarioBorrado} />
        {error && <p role="alert" className="text-[12px] text-rose-700">{error}</p>}
      </div>
    );
  }

  const mostradas = previa || estrellas;
  const baja = estrellas > 0 && estrellas <= PREGUNTA_MOTIVO_HASTA;

  return (
    <section aria-label="Calificá este cálculo" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 print:hidden">
      <div
        role="radiogroup"
        aria-labelledby="calificar-titulo"
        className="flex flex-wrap items-center gap-x-3 gap-y-1"
        onMouseLeave={() => setPrevia(0)}
      >
        <span id="calificar-titulo" className="text-sm font-semibold text-slate-800">¿Te sirvió este cálculo?</span>
        <div className="flex items-center">
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
        </div>
        <span className="text-[12px] text-slate-600" aria-hidden="true">
          {mostradas ? NOMBRE_DE_LAS_ESTRELLAS[mostradas] : ""}
        </span>
        {/* Sin "Guardando…" acá: aparecía y desaparecía en esta misma línea, que
            en el celular se partía en dos, el panel saltaba y el toque en
            "Enviar" caía al lado del botón (probado el 26/11/2026). El guardado
            de cada elección es silencioso; "Enviar" dice "Enviando…". */}
      </div>

      {fase === "guardada" && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
            plegando ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <form onSubmit={enviarTodo} className="min-h-0 overflow-hidden">
            <div className="space-y-3 pt-3">
              <p role="status" className="text-[13px] font-medium text-emerald-800">
                ¡Gracias! {baja ? "Contanos qué falló, así lo arreglamos." : "Si querés, contanos un poco más."}{" "}
                <span className="font-normal text-slate-500">Todo es opcional.</span>
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
                <p id="calificar-perfil" className="text-[12px] font-semibold text-slate-700">¿Para qué la usaste?</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PERFILES.map((p) => (
                    <Opcion key={p.id} activa={perfil === p.id} onClick={() => elegirPerfil(p.id)}>
                      {p.texto}
                    </Opcion>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="calificar-comentario" className="block text-[12px] font-semibold text-slate-700">
                  Comentario
                </label>
                <textarea
                  id="calificar-comentario"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  maxLength={MAX_COMENTARIO}
                  rows={2}
                  placeholder={baja ? "Qué esperabas y qué pasó…" : "Qué te sirvió, qué te faltó…"}
                  aria-describedby="calificar-comentario-nota"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400"
                />
                <p id="calificar-comentario-nota" className="text-[11px] text-slate-500">
                  No escribas datos personales (nombre, CUIL, empresa).
                </p>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
              >
                {enviando ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-rose-700">
          {error}{" "}
          {estrellas > 0 && error !== VENCIDA && (
            <button type="button" onClick={reintentar} className="font-semibold underline underline-offset-2">
              Reintentar
            </button>
          )}
        </p>
      )}
    </section>
  );
}
