"use client";
// components/calculadora/CalificarExperiencia.jsx
// La tarjeta "¿Te sirvió este cálculo?" del pie del recibo. Qué guarda, para
// qué, por qué así y no con un cartel, y qué validan las reglas:
// lib/calificaciones.js.
//
// El recorrido: la persona toca una estrella y la calificación sale en ese
// momento, sin botón "Enviar" (el que no lo aprieta se pierde) y sin esperar
// (el que toca y cierra la pestaña también cuenta). Recién ahí aparece lo
// opcional: qué falló si calificó con 3 o menos, para qué usó la calculadora
// y un comentario. Cada toque corrige la misma calificación; los toques
// seguidos se juntan (`espera`) y se mandan en orden, y lo que quede
// pendiente se manda igual si la tarjeta desaparece o la página se cierra.
//
// No insiste: "Ahora no" la esconde por un tiempo, y después de calificar no
// vuelve a aparecer (DIAS_SIN_PREGUNTAR). Hay una tarjeta por recibo: la
// calculadora la vuelve a armar al recalcular, y si ya calificó no se muestra.
//
// Revisión del 26/11/2026: el id de la calificación se elige una sola vez, así
// un reintento después de un corte no la duplica; si el alta había llegado y
// se perdió la respuesta, el reintento la encuentra y sigue desde ahí.

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
 *   periodo, categoria, origen, faltanDatos, calculos } (lib/calificaciones.js).
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
  const [comentarioEnviado, setComentarioEnviado] = useState(""); // el que quedó guardado
  const [avisoComentario, setAvisoComentario] = useState(null); // "guardado" | "borrado" | null
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Lo último que contestó, para que cada envío mande lo más nuevo aunque se
  // haya programado antes; el id elegido para el alta; la calificación ya
  // creada, si la hay; y lo que hay escrito en la caja ahora.
  const respuestas = useRef({ estrellas: 0, motivos: [], perfil: null, comentario: "" });
  const idDelAlta = useRef(null);
  const creada = useRef(null);
  const temporizador = useRef(null);
  const cola = useRef(Promise.resolve(true));
  const ultimoFallo = useRef(false);
  const textoEnLaCaja = useRef("");
  const contextoActual = useRef(contexto);
  useEffect(() => {
    contextoActual.current = contexto;
  }, [contexto]);

  const almacenReal = () => almacen ?? almacenDelNavegador();

  /** Manda lo contestado: la primera vez crea la calificación; después la corrige. Devuelve si se guardó. */
  const guardar = () => {
    cola.current = cola.current.then(async () => {
      const r = respuestas.current;
      setGuardando(true);
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
      } finally {
        setGuardando(false);
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

  /** Manda el comentario de la caja; con la caja vacía, borra el que se había mandado. Devuelve si se guardó. */
  const mandarComentario = async (e) => {
    e?.preventDefault?.();
    clearTimeout(temporizador.current);
    temporizador.current = null;
    const enviado = comentario;
    respuestas.current = { ...respuestas.current, comentario: enviado };
    const ok = await guardar();
    if (ok) setComentarioEnviado(enviado.trim() ? enviado : "");
    // El aviso sólo si lo que quedó es lo que sigue en la caja (pudo seguir escribiendo).
    if (ok && textoEnLaCaja.current === enviado) setAvisoComentario(enviado.trim() ? "guardado" : "borrado");
    return ok;
  };

  const reintentar = () => {
    clearTimeout(temporizador.current);
    temporizador.current = null;
    guardar();
  };

  /** Cierra la tarjeta. Si quedó un comentario escrito sin mandar, lo manda: "Listo" se lee como "ya está". */
  const listo = async () => {
    vaciarPendiente();
    let ok;
    if (comentario.trim() && comentario !== comentarioEnviado) ok = await mandarComentario();
    else ok = ultimoFallo.current ? await guardar() : await cola.current;
    if (ok !== false && !ultimoFallo.current) setFase("cerrada");
  };

  const descartar = () => {
    clearTimeout(temporizador.current);
    temporizador.current = null;
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
  const puedeBorrarComentario = Boolean(comentarioEnviado.trim()) && !comentario.trim();

  return (
    <section aria-label="Calificá este cálculo" className="rounded-xl border border-slate-200 bg-slate-50 p-4 print:hidden">
      <fieldset className="min-w-0">
        <legend className="text-sm font-semibold text-slate-800">¿Te sirvió este cálculo?</legend>
        {fase === "pregunta" && <p className="text-[12px] text-slate-500">Calificalo con un toque y nos ayudás a mejorar.</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-0.5 gap-y-1" onMouseLeave={() => setPrevia(0)}>
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
          <span className="ml-2 text-[12px] text-slate-600 sm:min-w-[6rem]" aria-hidden="true">
            {mostradas ? NOMBRE_DE_LAS_ESTRELLAS[mostradas] : ""}
          </span>
          {guardando && <span className="basis-full text-[11px] text-slate-400 sm:basis-auto">Guardando…</span>}
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
                textoEnLaCaja.current = e.target.value;
                setAvisoComentario(null);
              }}
              maxLength={MAX_COMENTARIO}
              rows={3}
              placeholder={baja ? "Qué esperabas y qué pasó…" : "Qué te sirvió, qué te faltó…"}
              aria-describedby="calificar-comentario-nota"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400"
            />
            <p id="calificar-comentario-nota" className="text-[11px] text-slate-500">
              No escribas datos personales (nombre, CUIL, empresa). Si encontraste un error en el cálculo, también podés usar
              &quot;Reportar error / sugerencia&quot;.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {puedeBorrarComentario ? (
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Borrar el comentario que mandé
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!comentario.trim() || guardando}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enviar comentario
                </button>
              )}
              <button type="button" onClick={listo} className="text-[12px] text-slate-600 underline underline-offset-2 hover:text-slate-900">
                Listo
              </button>
            </div>
            {avisoComentario && (
              <p role="status" className="text-[12px] text-emerald-800">
                {avisoComentario === "guardado" ? "Comentario guardado. ¡Gracias!" : "Listo, borramos tu comentario."}
              </p>
            )}
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
