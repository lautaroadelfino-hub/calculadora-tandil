"use client";
// components/calculadora/calificacion/useCalificacion.js
// Lo que HACE la calificación "¿Te sirvió este cálculo?", separado de cómo se
// ve (CalificarExperiencia.jsx). Qué se guarda, para qué y qué validan las
// reglas: lib/calificaciones.js.
//
// El recorrido: la persona toca una estrella y la calificación sale en ese
// momento, sin botón (el que no lo aprieta se pierde) y sin esperar (el que
// toca y cierra la pestaña también cuenta). Después, lo opcional (qué falló si
// calificó con 3 o menos, para qué usó la calculadora, un comentario): cada
// elección corrige la misma calificación sola, y "Enviar" manda lo que falte,
// pliega el panel y deja el agradecimiento. Si la tarjeta desaparece, la
// pestaña pasa a segundo plano o la página se cierra, lo que todavía no salió
// se intenta mandar en ese momento (alIrse).
//
// Hay una tarjeta por recibo: la calculadora la vuelve a armar al recalcular,
// y si ya calificó no se muestra (DIAS_SIN_PREGUNTAR). El id de la
// calificación se elige una sola vez: un reintento después de un corte no la
// duplica, y si el alta había llegado y se perdió la respuesta, el reintento
// la encuentra y sigue desde ahí (revisión del 26/11/2026).

import { useEffect, useRef, useState } from "react";
import {
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
export const VENCIDA = "Pasó más de un día desde que calificaste y esto ya no se puede cambiar. Si querés contarnos algo más, usá \"Reportar error / sugerencia\".";
/** Si falló "Borrar mi comentario": el error general hablaba de "tu calificación", que sí estaba guardada. */
export const NO_SE_BORRO = "No pudimos borrar tu comentario. Probá de nuevo en un rato.";
export const VENCIDA_PARA_BORRAR = "Pasó más de un día y tu comentario ya no se puede borrar desde acá. Pedinos que lo borremos con \"Reportar error / sugerencia\".";
/** Lo que dura el plegado del panel al enviar (igual que `duration-300`). */
export const PLEGADO_MS = 320;

function almacenDelNavegador() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** ¿La persona pidió menos movimiento en su sistema? Entonces nada de transiciones. */
export function menosMovimiento() {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * @param contexto  lo que se guarda solo con la calificación: { convenioId,
 *   periodo, categoria, origen, faltanDatos, calculos } (lib/calificaciones.js).
 * @param enviar, almacen, ahora, espera  para los tests y la vista previa: a
 *   dónde se manda, dónde se recuerda, qué hora es y cuánto se espera para
 *   juntar toques.
 * @param plegadoMs  cuánto dura el plegado al enviar, antes del agradecimiento.
 */
export function useCalificacion({ contexto, enviar = enviarCalificacion, almacen = null, ahora = AHORA, espera = 700, plegadoMs = PLEGADO_MS } = {}) {
  // cargando → (oculta | pregunta) → guardada → cerrada
  const [fase, setFase] = useState("cargando");
  const [plegando, setPlegando] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
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
  // Cada cambio en lo contestado sube `version`. `despachada` es la última
  // versión que salió entera en un pedido ya mandado, y `confirmada`, la
  // última que Firestore guardó. `ocupada`: hay un envío esperando respuesta.
  const version = useRef(0);
  const despachada = useRef(0);
  const confirmada = useRef(0);
  const ocupada = useRef(false);
  // "Borrar mi comentario" queda pedido hasta que salga bien un guardado sin
  // comentario, venga de donde venga (el mismo link, o el reintento al irse).
  const pideBorrar = useRef(false);
  const contextoActual = useRef(contexto);
  useEffect(() => {
    contextoActual.current = contexto;
  }, [contexto]);

  const almacenReal = () => almacen ?? almacenDelNavegador();

  /** La corrección con todo lo contestado: se puede repetir sin daño. */
  const cambioDe = (r) =>
    escrituraDeCambio({
      id: (creada.current || {}).id || idDelAlta.current,
      estrellas: r.estrellas,
      motivos: r.estrellas <= PREGUNTA_MOTIVO_HASTA ? r.motivos : [],
      perfil: r.perfil,
      comentario: r.comentario,
    });

  /** Manda lo contestado: la primera vez crea la calificación; después la corrige. Devuelve si se guardó. */
  const guardar = () => {
    cola.current = cola.current.then(async () => {
      const r = respuestas.current;
      const v = version.current;
      const masQueLaEstrella = r.motivos.length > 0 || Boolean(r.perfil) || Boolean(r.comentario);
      const sale = () => {
        despachada.current = Math.max(despachada.current, v);
      };
      ocupada.current = true;
      setError("");
      try {
        if (!creada.current) {
          idDelAlta.current = idDelAlta.current || nuevoIdDeCalificacion();
          const ctx = {
            ...contextoActual.current,
            dispositivo: dispositivoDe(typeof window !== "undefined" ? window.innerWidth : 0),
            entorno: typeof window !== "undefined" ? entornoDe(window.location.hostname) : "prueba",
          };
          // El alta lleva sólo las estrellas y el contexto (lib/calificaciones.js).
          let llevaTodo = false;
          try {
            if (!masQueLaEstrella) sale();
            await enviar(escrituraNueva({ id: idDelAlta.current, estrellas: r.estrellas, contexto: ctx }));
          } catch (e) {
            // ¿Ya existía? Pasa si el alta anterior llegó y se perdió la
            // respuesta: Firestore rechaza crearla de nuevo con el mismo id.
            // Si corregirla funciona, estaba creada; si no, era otro error.
            if (!e?.status) throw e;
            sale();
            await enviar(cambioDe(r)).catch(() => { throw e; });
            llevaTodo = true;
          }
          creada.current = { estado: "calificada", el: ahora().toISOString(), id: idDelAlta.current };
          guardarRegistro(almacenReal(), creada.current);
          setFase((f) => (f === "pregunta" ? "guardada" : f));
          // Si el alta salió en un reintento, la persona ya pudo haber elegido
          // algo más (la tarjeta sigue de pregunta en pregunta aunque el alta
          // falle): eso va enseguida, como corrección. Antes se perdía. La
          // calificación ya quedó marcada como creada, así que si esto falla,
          // "Reintentar" corrige y no repite el alta.
          if (!llevaTodo && masQueLaEstrella) {
            sale();
            await enviar(cambioDe(r));
          }
        } else if (puedeCambiar(creada.current, ahora())) {
          sale();
          await enviar(cambioDe(r));
        } else {
          // Pasó el día: no hay nada que reintentar. La estrella quedó
          // guardada, así que termina en el agradecimiento, con el aviso
          // (antes quedaba la pregunta abierta, sin forma de mandarla).
          setError(pideBorrar.current ? VENCIDA_PARA_BORRAR : VENCIDA);
          setFase("cerrada");
          return false;
        }
        confirmada.current = Math.max(confirmada.current, v);
        if (pideBorrar.current && !r.comentario) {
          pideBorrar.current = false;
          setComentarioBorrado(true);
        }
        return true;
      } catch (e) {
        // No se guardó: lo que salió en este intento vuelve a estar pendiente.
        // Si lo que faltaba era borrar el comentario, el aviso dice eso.
        despachada.current = confirmada.current;
        setError(pideBorrar.current ? NO_SE_BORRO : e?.message || "No pudimos guardar tu calificación. Probá de nuevo en un rato.");
        return false;
      } finally {
        ocupada.current = false;
      }
    });
    return cola.current;
  };

  /**
   * Al irse (la tarjeta desaparece, la pestaña pasa a segundo plano o se
   * cierra), lo que todavía no salió se manda ya: lo que esperaba para
   * juntarse con otros toques y lo que falló (sin red) y nadie reintentó. Si
   * hay un envío esperando respuesta (el alta, con una red lenta), lo que se
   * encola sale recién cuando llegue, y con la página cerrada no sale nunca:
   * la corrección se manda además aparte, sin esperar. Lleva todo lo
   * contestado, así que repetirla no hace daño, y si llega antes que el alta,
   * Firestore la rechaza sin crear nada. Lo que ya salió no se repite: una
   * corrección de más escribiría `actualizadoEl`, y en el panel contaría como
   * que siguió. El comentario entra en lo contestado recién con "Enviar": un
   * borrador no sale nunca.
   */
  const alIrse = () => {
    clearTimeout(temporizador.current);
    temporizador.current = null;
    const r = respuestas.current;
    if (!r.estrellas || version.current <= despachada.current) return;
    if (creada.current && !puedeCambiar(creada.current, ahora())) return;
    if (ocupada.current) {
      enviar(cambioDe(r)).catch(() => {});
      despachada.current = version.current;
    }
    guardar();
  };
  const alIrseRef = useRef(alIrse);
  useEffect(() => {
    alIrseRef.current = alIrse;
  });

  // Si se pregunta o no, se decide en el navegador (el servidor no sabe qué
  // contestó esta persona antes) y una sola vez. Al irse (alIrse): si la
  // tarjeta desaparece (recalcular, ir a otra página), si la pestaña pasa a
  // segundo plano o si se cierra. El envío lleva `keepalive`
  // (lib/calificaciones.js). En el celular, "pagehide" no siempre llega y el
  // sistema congela los relojes de una pestaña en segundo plano: por eso
  // también "visibilitychange".
  // Corre una sola vez, con `almacen` y `ahora` del primer dibujado: en el
  // build de producción el minificador escribe `ahora = () => new Date` en la
  // firma, una función nueva en cada dibujado. Con ellas en las dependencias,
  // el efecto se desarmaba en cada uno, creía que la tarjeta se iba y, con
  // sólo tocar la estrella, salía una corrección de más que en el panel
  // contaba como que siguió (27/11/2026).
  const almacenInicial = useRef(almacen);
  const ahoraInicial = useRef(ahora);
  useEffect(() => {
    const registro = leerRegistro(almacenInicial.current ?? almacenDelNavegador());
    setFase((f) => (f === "cargando" ? (debePreguntar(registro, ahoraInicial.current()) ? "pregunta" : "oculta") : f));
    const alOcultar = () => alIrseRef.current();
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") alIrseRef.current();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", alOcultar);
      document.addEventListener("visibilitychange", alCambiarVisibilidad);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", alOcultar);
        document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      }
      alIrseRef.current();
    };
  }, []);

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

  /** Lo contestado cambió: cuenta como una versión nueva, que todavía no salió. */
  const contestar = (cambios) => {
    respuestas.current = { ...respuestas.current, ...cambios };
    version.current += 1;
  };

  const elegirEstrellas = (n) => {
    contestar({ estrellas: n });
    setEstrellas(n);
    programar();
  };

  const alternarMotivo = (id) => {
    const actual = respuestas.current.motivos;
    const nuevos = actual.includes(id) ? actual.filter((m) => m !== id) : [...actual, id];
    contestar({ motivos: nuevos });
    setMotivos(nuevos);
    programar();
  };

  const elegirPerfil = (id) => {
    const nuevo = respuestas.current.perfil === id ? null : id;
    contestar({ perfil: nuevo });
    setPerfil(nuevo);
    programar();
  };

  /**
   * "Enviar": manda lo que haya (con o sin comentario: todo es opcional),
   * pliega el panel y deja el agradecimiento. Si no se pudo guardar, el panel
   * queda abierto con el error, y otro "Enviar" reintenta.
   */
  const enviarTodo = async (e) => {
    e?.preventDefault?.();
    if (enviando) return;
    setEnviando(true);
    clearTimeout(temporizador.current);
    temporizador.current = null;
    contestar({ comentario });
    // Se encola detrás de lo que se esté guardando solo (cola): sale en orden.
    const ok = await guardar();
    setEnviando(false);
    if (!ok) return;
    setComentarioEnviado(comentario.trim());
    setPlegando(true);
    setTimeout(() => setFase("cerrada"), menosMovimiento() ? 0 : plegadoMs);
  };

  /**
   * Desde el agradecimiento: borra el comentario que mandó (la Ley 25.326 le
   * da derecho a sacarlo). "Borramos tu comentario." aparece cuando un
   * guardado sin comentario sale bien (pideBorrar). Si falla, el aviso dice
   * eso, no que falló la calificación.
   */
  const borrarComentario = () => {
    pideBorrar.current = true;
    contestar({ comentario: "" });
    guardar();
  };

  const reintentar = () => {
    clearTimeout(temporizador.current);
    temporizador.current = null;
    guardar();
  };

  return {
    fase,
    /** ¿Se muestra algo? (ni mientras se decide, ni si ya calificó hace poco) */
    visible: fase !== "cargando" && fase !== "oculta",
    plegando,
    estrellas,
    elegirEstrellas,
    /** Calificó con 3 o menos: se pregunta qué falló. */
    baja: estrellas > 0 && estrellas <= PREGUNTA_MOTIVO_HASTA,
    motivos,
    alternarMotivo,
    perfil,
    elegirPerfil,
    comentario,
    setComentario,
    comentarioEnviado,
    comentarioBorrado,
    borrarComentario,
    enviando,
    enviarTodo,
    error,
    /** Hay error y se puede volver a probar (no si pasó el día para cambiarla). */
    puedeReintentar: Boolean(error) && estrellas > 0 && error !== VENCIDA && error !== VENCIDA_PARA_BORRAR,
    reintentar,
  };
}
