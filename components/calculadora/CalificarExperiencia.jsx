"use client";
// components/calculadora/CalificarExperiencia.jsx
// "¿Te sirvió este cálculo?": la solapa del recibo.
//
// DÓNDE. Vive en la columna del recibo, justo después de la tarjeta del
// recibo, y es pegajosa (sticky) contra el pie de la pantalla. Mientras se
// mira el recibo flota abajo: con los bordes del recibo en el celular y en su
// esquina en la compu. Al bajar hasta el final se apoya sola debajo del
// recibo, y al volver al formulario se va con él. Así nunca queda encima del
// formulario, del "Calcular liquidación" pegado, de las preguntas frecuentes
// ni del modal, y con Tab o con lector se llega en el orden en que se ve. La
// versión que el dueño eligió en la vista previa del 26/11/2026 (la 5) flotaba
// fija en la esquina de la pantalla. En monitores anchos quedaba lejos del
// recibo, al final tapaba "Copiar link" y era lo último del Tab.
//
// CUÁNDO. Entra una sola vez y sin reloj: cuando los tres números ya se vieron
// enteros (data-resumen), espera un compás y sube con un fundido. No toma el
// foco ni se anuncia. Desde el segundo recibo de la visita entra sin espera.
//
// CÓMO SIGUE. Al tocar una estrella la calificación se guarda en el acto
// (useCalificacion.js). La tarjeta sigue de a una pregunta, en el mismo
// lugar: qué falló (con 3 o menos), para qué la usó y un comentario con una
// pregunta a medida. Con todo junto, la tarjeta pasaba de 92 px a media
// pantalla, con "Enviar" escondido, justo cuando la persona decidía si seguía.
// Avanza sola sólo con toque o clic y sólo en las preguntas de una respuesta.
// Con teclado no avanza: las flechas elegirían de paso cada valor intermedio,
// así que se sigue con "Seguir". "Seguir" y "Enviar" están siempre activos:
// todo es opcional.
//
// SIN ×. No tiene × ni "Ahora no": el dueño la quiere flotando, sin que
// moleste (26/11/2026). Para no molestar sin cerrarse: si después de la
// estrella la persona sigue leyendo el recibo sin contestar (la página se
// mueve un buen trecho sin que toque la tarjeta), la pregunta abierta, que en
// el celular ocupa un tercio de la pantalla, se achica a una línea con la
// pregunta y el avance. Esa línea sigue flotando y un toque la vuelve a abrir
// donde estaba. Las estrellas, en cambio, no se achican: son la invitación.
// Tampoco se achica con un comentario escrito sin mandar (escondería "Enviar",
// lo único que lo manda). Con un error sí: el error no se va solo, y la
// pregunta abierta quedaba tapando el recibo; la línea dice "No se guardó".
// "Enviar" pliega el panel, el cuadradito de LiquidAR se vuelve un tilde y
// queda "¡Gracias por ayudar a mejorar!", que a los 4,5 s se apoya al pie.
//
// Qué se guarda, y por qué no hay un cartel: lib/calificaciones.js.

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { PREGUNTA_MOTIVO_HASTA } from "@/lib/calificaciones";
import { useCalificacion, menosMovimiento } from "@/components/calculadora/calificacion/useCalificacion";
import {
  PREGUNTA,
  Marca,
  Estrellas,
  OpcionesDeMotivo,
  OpcionesDePerfil,
  CampoComentario,
  preguntaDelComentario,
  Avance,
  Pie,
  BotonSeguir,
  BotonEnviar,
  BotonVolver,
  Plegable,
  AparecerSuave,
  BorrarComentario,
  ErrorDeCalificacion,
} from "@/components/calculadora/calificacion/piezas";

/**
 * Los tiempos, en ms:
 * - entrada: el compás entre ver los números y que suba la tarjeta;
 * - pausa: lo que se ve lo elegido antes de pasar sola a la pregunta siguiente;
 * - pie: lo que el pie no toma toques después de cambiar de pregunta;
 * - agradecimiento: lo que flota el "¡Gracias…!" antes de apoyarse al pie;
 * - salida: el fundido del agradecimiento al apoyarse.
 */
export const TIEMPOS = { entrada: 600, pausa: 380, pie: 300, agradecimiento: 4500, salida: 300 };
export const AVISO_GUARDADA = "Guardamos tu calificación. Lo que sigue es opcional.";
const AVISO_BORRADO = "Borramos tu comentario.";
/**
 * Dónde tienen que verse los tres números para darlos por vistos: debajo de
 * la barra (--h-header, 60 px) y arriba de la tarjeta plegada (92 px), con aire.
 */
const ZONA_DE_LOS_NUMEROS = "-60px 0px -120px 0px";
/** Cuánto tiene que moverse la página, sin tocar la tarjeta, para que una pregunta abierta se achique. */
export const RECORRIDO_PARA_ACHICAR = 160;
const CON_EL_DEDO_O_EL_MOUSE = new Set(["mouse", "touch", "pen"]);
const SIN_TECLADO = { tapa: 0, alto: 0 };

/** ¿Los tres números estuvieron enteros a la vista, o ya quedaron arriba? */
function seVieron(e) {
  const arriba = e.rootBounds ? e.rootBounds.top : 60;
  return e.intersectionRatio >= 0.99 || e.boundingClientRect.bottom <= arriba;
}

function tituloDelPaso(paso, cal) {
  if (paso === "motivos") return cal.estrellas <= 2 ? "Uy. ¿Qué falló?" : "¿Qué no te convenció?";
  if (paso === "perfil") return cal.baja ? "¿Para qué la usaste?" : "¡Gracias! ¿Para qué la usaste?";
  if (paso === "comentario") return preguntaDelComentario(cal).titulo;
  return PREGUNTA;
}

/**
 * Cuánto se desplazó la página. Se desplaza la ventana; en el celular, con un
 * Safari anterior a la 16, el body (app/globals.css, "Evitar overflow horizontal").
 */
const desplazamiento = () => window.scrollY + (document.body?.scrollTop || 0);

/**
 * ¿El mouse está encima de la tarjeta? Se pregunta en el momento: con
 * pointerenter/pointerleave quedaba "encima" para siempre cuando la tarjeta
 * cambiaba de forma debajo del puntero. Sólo si lo último que la tocó fue un
 * mouse: en el celular, el :hover queda pegado después de un toque.
 */
const mouseEncima = (gesto, seccion) => gesto === "mouse" && Boolean(seccion?.matches(":hover"));

/**
 * ¿La persona está en la tarjeta con el teclado o con un lector de pantalla?
 * Cuenta todo foco adentro que no vino de un toque o un clic: un lector elige
 * sin mandar teclas ni toques a la página, y con Tab se entra desde afuera.
 * También se pregunta en el momento: Safari y Firefox no avisan (blur) cuando
 * desaparece lo que tenía el foco, y quedaba "adentro" para siempre.
 */
const focoDeTecladoEn = (gesto, seccion) => !CON_EL_DEDO_O_EL_MOUSE.has(gesto) && Boolean(seccion?.contains(document.activeElement));

/**
 * @param contexto  lo que se guarda con la calificación (lib/calificaciones.js).
 * @param desactualizado  el recibo dice "Cambiaste datos": si todavía no
 *   calificó, la tarjeta se va mientras dure (no se pregunta por un recibo
 *   viejo ni se compite con "Recalcular"); si ya calificó, se queda.
 * @param visita  "nueva" (todavía no apareció en esta visita) o "vista" (ya
 *   apareció: la del recibo siguiente entra sin espera). La guarda la
 *   calculadora, que arma una tarjeta por recibo.
 * @param alCambiarVisita  avisa "vista" cuando entra por primera vez.
 * @param enviar, almacen, ahora, espera, tiempos  para los tests.
 */
export default function CalificarExperiencia({
  contexto,
  desactualizado = false,
  visita = "nueva",
  alCambiarVisita,
  enviar,
  almacen,
  ahora,
  espera,
  tiempos,
}) {
  const t = { ...TIEMPOS, ...tiempos };
  const cal = useCalificacion({ contexto, enviar, almacen, ahora, espera });
  const [paso, setPaso] = useState("estrellas");
  const [haciaAtras, setHaciaAtras] = useState(false);
  // flotando (pegada al pie de la pantalla) → saliendo → posada (quieta al pie
  // del recibo). Sólo el agradecimiento se apoya: la pregunta sigue flotando.
  const [modo, setModo] = useState("flotando");
  const [entro, setEntro] = useState(false);
  // La pregunta abierta, achicada a una línea porque la persona siguió leyendo el recibo.
  const [achicada, setAchicada] = useState(false);
  // Hay una pausa en curso antes de pasar sola a la pregunta siguiente.
  const [avanzando, setAvanzando] = useState(false);
  const [pieBloqueado, setPieBloqueado] = useState(false);
  // Lo que dice la región viva (existe vacía desde el principio, si no el lector no la anuncia).
  const [aviso, setAviso] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [teclado, setTeclado] = useState(SIN_TECLADO);
  const idPregunta = useId();
  const riel = useRef(null);
  const seccion = useRef(null);
  const titulo = useRef(null);
  const caja = useRef(null);
  const linea = useRef(null);
  // Con qué se tocó lo último en la tarjeta: "mouse", "touch", "pen" o "teclado".
  const gesto = useRef(null);
  // Cuánto se movió la página desde que la persona tocó la tarjeta por última vez.
  const recorrido = useRef(0);
  // El foco que pone la tarjeta en la caja no es escribir: con eso solo, la
  // pregunta no se achicaba aunque la persona no escribiera nada.
  const focoPuesto = useRef(false);
  const relojes = useRef({});
  // Lo que tenía el foco va a desaparecer: se pide moverlo con un número que
  // sube, en la misma tanda que el cambio que lo saca. Así el efecto del foco
  // corre en el dibujado que ya tiene la pregunta nueva (con una marca en un
  // ref, la consumía antes un dibujado de otra cosa y el foco quedaba en el body).
  const [pedidoDeFoco, setPedidoDeFoco] = useState(0);
  const pedirFoco = () => setPedidoDeFoco((n) => n + 1);

  const cerrada = cal.fase === "cerrada";
  const pasos = ["estrellas", ...(cal.baja ? ["motivos"] : []), "perfil", "comentario"];
  const indice = Math.max(0, pasos.indexOf(paso));
  const mostrada = cal.visible && !(desactualizado && cal.estrellas === 0) && (modo !== "flotando" || entro);
  const estado = mostrada ? modo : "oculta";
  const enLinea = achicada && !cerrada;
  // La persona está con la tarjeta: el mouse encima o el foco de teclado adentro.
  const estaConLaTarjeta = () => mouseEncima(gesto.current, seccion.current) || focoDeTecladoEn(gesto.current, seccion.current);

  const reloj = (nombre, fn, ms) => {
    clearTimeout(relojes.current[nombre]);
    relojes.current[nombre] = setTimeout(fn, ms);
  };
  const pararReloj = (nombre) => {
    clearTimeout(relojes.current[nombre]);
    relojes.current[nombre] = null;
  };
  useEffect(() => {
    const todos = relojes.current;
    return () => Object.values(todos).forEach(clearTimeout);
  }, []);

  // ENTRADA: cuando los tres números estuvieron enteros a la vista (o ya
  // quedaron arriba), un compás y entra. Es un pestillo: el scroll no la
  // vuelve a esconder. Sin IntersectionObserver, entra después del compás.
  const alEntrar = useEffectEvent(() => {
    setEntro(true);
    if (visita === "nueva") alCambiarVisita?.("vista");
  });
  const demoraDeEntrada = visita === "nueva" ? t.entrada : 0;
  useEffect(() => {
    if (!cal.visible || modo !== "flotando" || entro) return;
    let espera = null;
    const listo = () => {
      espera = setTimeout(() => alEntrar(), demoraDeEntrada);
    };
    const numeros = riel.current?.closest("[data-recibo]")?.querySelector("[data-resumen]");
    if (typeof IntersectionObserver === "undefined" || !numeros) {
      listo();
      return () => clearTimeout(espera);
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        const e = entradas[entradas.length - 1];
        if (!e || !seVieron(e)) return;
        observador.disconnect();
        listo();
      },
      { rootMargin: ZONA_DE_LOS_NUMEROS, threshold: [0, 1] }
    );
    observador.observe(numeros);
    return () => {
      observador.disconnect();
      clearTimeout(espera);
    };
  }, [cal.visible, modo, entro, demoraDeEntrada]);

  // ACHICARSE: la pregunta abierta (después de la estrella) se achica a una
  // línea si la página se mueve más de RECORRIDO_PARA_ACHICAR sin que la
  // persona toque la tarjeta. No mientras escribe o tiene un comentario sin
  // mandar, ni con el mouse encima o el foco de teclado adentro, ni mientras
  // manda. Con un error, sí (la línea lo dice). Se cuenta sólo el scroll de la
  // página: el de adentro de la tarjeta o el de una tabla del recibo no.
  const conBorrador = paso === "comentario" && cal.comentario.trim() !== "";
  const puedeAchicarse = mostrada && modo === "flotando" && !cerrada && cal.estrellas > 0 && !achicada && !escribiendo && !conBorrador && !cal.enviando && !cal.plegando;
  useEffect(() => {
    if (!puedeAchicarse) return;
    recorrido.current = 0;
    // Desde dónde está la página ahora: con `null`, el primer tramo no contaba
    // (un salto de un solo evento, como AvPág sin animación, no la achicaba).
    let ultimo = desplazamiento();
    const alMoverse = (e) => {
      if (e.target !== document && e.target !== document.documentElement && e.target !== document.body) return;
      const y = desplazamiento();
      const tramo = Math.abs(y - ultimo);
      ultimo = y;
      // Con el mouse encima o el foco de teclado adentro, la persona está con la tarjeta: no cuenta.
      if (mouseEncima(gesto.current, seccion.current) || focoDeTecladoEn(gesto.current, seccion.current)) {
        recorrido.current = 0;
        return;
      }
      recorrido.current += tramo;
      if (recorrido.current <= RECORRIDO_PARA_ACHICAR) return;
      // Si el foco estaba adentro (lo puso la tarjeta), pasa a la línea: lo que lo tenía desaparece.
      const conFocoAdentro = seccion.current?.contains(document.activeElement);
      setAchicada(true);
      if (conFocoAdentro) pedirFoco();
    };
    document.addEventListener("scroll", alMoverse, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", alMoverse, { capture: true });
  }, [puedeAchicarse]);

  /** El agradecimiento deja de flotar: se funde y queda quieto al pie del recibo. */
  const aterrizar = () => {
    pedirFoco();
    if (menosMovimiento()) {
      setModo("posada");
      return;
    }
    setModo("saliendo");
    reloj("salida", () => setModo("posada"), t.salida);
  };

  // El agradecimiento flota un rato y se apoya al pie. Espera mientras el
  // mouse está encima o el foco de teclado está adentro, y vuelve a preguntar
  // cada segundo (no con un toque: en iOS el foco no se suelta y quedaría
  // flotando para siempre).
  const alTerminarAgradecimiento = useEffectEvent(() => {
    if (estaConLaTarjeta()) return false;
    aterrizar();
    return true;
  });
  useEffect(() => {
    if (modo !== "flotando" || !cerrada) return;
    let id = null;
    const intentar = () => {
      if (!alTerminarAgradecimiento()) id = setTimeout(intentar, 1000);
    };
    id = setTimeout(intentar, t.agradecimiento);
    return () => clearTimeout(id);
  }, [modo, cerrada, t.agradecimiento]);

  // LO QUE TAPA. Mientras flota, lo del recibo que toma el foco (con Tab)
  // tiene que quedar por encima de la tarjeta (WCAG 2.4.11). El navegador lo
  // corre con scroll-margin-bottom (app/globals.css), que necesita el alto de
  // la tarjeta (abierta, de 110 a 300 px; en una línea, unos 64) más su
  // distancia al pie. Antes era un scroll-padding fijo de 8rem en la página:
  // no alcanzaba con la tarjeta abierta y, como incluía a la propia tarjeta,
  // tocar una estrella hacía saltar el recibo media pantalla.
  useEffect(() => {
    const s = seccion.current;
    const r = riel.current;
    const recibo = r?.closest("[data-recibo]");
    if (estado !== "flotando" || !s || !recibo) return;
    const medir = () => {
      const abajo = parseFloat(getComputedStyle(r).bottom) || 0;
      recibo.style.setProperty("--reserva-calificacion", `${Math.ceil(s.offsetHeight + abajo + 8)}px`);
    };
    medir();
    const observador = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    observador?.observe(s);
    return () => {
      observador?.disconnect();
      recibo.style.removeProperty("--reserva-calificacion");
    };
  }, [estado, teclado.tapa]);

  // EL TECLADO DEL CELULAR. En Safari del iPhone y en Chrome de Android el
  // teclado achica sólo el viewport visual: lo que está pegado abajo queda
  // tapado, y se escribía a ciegas con "Enviar" debajo del teclado. Mientras
  // la caja tiene el foco, la parte tapada se suma al `bottom` del riel
  // (--teclado). Con zoom de dedos no se toca nada.
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!escribiendo || modo !== "flotando" || !vv) {
      setTeclado((v) => (v.tapa === 0 && v.alto === 0 ? v : SIN_TECLADO));
      return;
    }
    let cuadro = 0;
    const medir = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const tapa = vv.scale > 1.01 ? 0 : Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        setTeclado({ tapa, alto: Math.round(vv.height) });
      });
    };
    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      cancelAnimationFrame(cuadro);
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, [escribiendo, modo]);

  // Un solo aviso para el lector cuando Firestore confirmó el alta, y otro al
  // borrar el comentario. Si el alta llegó recién con "Enviar" (había fallado),
  // no: sigue el agradecimiento, que toma el foco, y "Lo que sigue es
  // opcional" ya no es cierto. Al llegar al agradecimiento, el foco va a él.
  const faseAnterior = useRef(cal.fase);
  useEffect(() => {
    if (faseAnterior.current === cal.fase) return;
    faseAnterior.current = cal.fase;
    if (cal.fase === "guardada" && !cal.enviando && !cal.plegando) setAviso(AVISO_GUARDADA);
    if (cal.fase === "cerrada") pedirFoco();
  }, [cal.fase, cal.enviando, cal.plegando]);
  useEffect(() => {
    if (!cal.comentarioBorrado) return;
    setAviso(AVISO_BORRADO);
    pedirFoco();
  }, [cal.comentarioBorrado]);

  // EL FOCO. Cuando desaparece lo que tenía el foco (cambio de pregunta,
  // achicarse, agradecimiento, borrar el comentario), va al título del estado
  // nuevo, sin mover la página: nunca queda en el body, donde el próximo Tab
  // arrancaría en "Saltar al contenido". En el comentario, con mouse o
  // teclado, va a la caja; con el dedo no, para no abrir el teclado a quien no
  // pidió escribir. Si la persona ya está en otro lado (el formulario), no se
  // mueve.
  const moverFoco = useEffectEvent(() => {
    const s = seccion.current;
    const activo = document.activeElement;
    if (!s || s.hasAttribute("inert")) return;
    if (activo && activo !== document.body && !s.contains(activo)) return;
    let destino = titulo.current;
    if (enLinea) destino = linea.current;
    else if (paso === "comentario" && !cerrada && (gesto.current === "mouse" || gesto.current === "teclado")) destino = caja.current;
    focoPuesto.current = destino === caja.current;
    destino?.focus({ preventScroll: true });
    focoPuesto.current = false;
  });
  useEffect(() => {
    if (pedidoDeFoco > 0) moverFoco();
  }, [pedidoDeFoco]);

  if (!cal.visible) return null;

  /** Cambia de pregunta, en el acto o después de la pausa para ver lo elegido. */
  const irA = (destino, { conPausa = false, atras = false } = {}) => {
    pararReloj("pausa");
    const ir = () => {
      setAvanzando(false);
      setHaciaAtras(atras);
      setPaso(destino);
      setPieBloqueado(true);
      reloj("pie", () => setPieBloqueado(false), t.pie);
      pedirFoco();
    };
    if (!conPausa) return ir();
    setAvanzando(true);
    reloj("pausa", ir, t.pausa);
  };
  const conElDedoOElMouse = () => CON_EL_DEDO_O_EL_MOUSE.has(gesto.current);
  const seguir = () => irA(pasos[Math.min(indice + 1, pasos.length - 1)]);
  const volver = () => irA(pasos[Math.max(indice - 1, 0)], { atras: true });

  const elegirEstrellas = (n) => {
    cal.elegirEstrellas(n);
    if (conElDedoOElMouse()) {
      irA(n <= PREGUNTA_MOTIVO_HASTA ? "motivos" : "perfil", { conPausa: true });
    } else {
      pararReloj("pausa");
      setAvanzando(false);
    }
  };
  const alTocarPerfil = (elegida) => {
    if (elegida && conElDedoOElMouse()) irA("comentario", { conPausa: true });
    else {
      pararReloj("pausa");
      setAvanzando(false);
    }
  };

  const abrir = () => {
    setAchicada(false);
    pedirFoco();
  };
  // El foco se pide antes de que "Reintentar" desaparezca (el error se borra al empezar a guardar).
  const reintentar = () => {
    pedirFoco();
    cal.reintentar();
  };

  const alEnviar = (e) => {
    e.preventDefault();
    // Con el dedo, primero baja el teclado y después se pliega.
    if (gesto.current !== "mouse" && gesto.current !== "teclado" && document.activeElement === caja.current) caja.current?.blur();
    cal.enviarTodo();
  };

  // Lo que va en el cuerpo y en el pie de cada pregunta.
  let cuerpo = null;
  let pie = null;
  const pieDelPaso = (derecha) => (
    <Pie izquierda={<BotonVolver onClick={volver} />} centro={<Avance total={pasos.length} actual={indice} />} derecha={derecha} bloqueado={pieBloqueado} />
  );
  if (paso === "motivos") {
    cuerpo = (
      <>
        <p className="text-[12px] text-slate-600">Podés marcar varias. Así lo arreglamos.</p>
        <div className="mt-2">
          <OpcionesDeMotivo cal={cal} etiquetadaPor={idPregunta} />
        </div>
      </>
    );
    pie = pieDelPaso(<BotonSeguir onClick={seguir} />);
  } else if (paso === "perfil") {
    cuerpo = <OpcionesDePerfil cal={cal} etiquetadaPor={idPregunta} alTocar={alTocarPerfil} />;
    pie = pieDelPaso(<BotonSeguir onClick={seguir} />);
  } else if (paso === "comentario") {
    cuerpo = (
      <CampoComentario
        cal={cal}
        etiquetadaPor={idPregunta}
        ejemplo={preguntaDelComentario(cal).ejemplo}
        cajaRef={caja}
        onFocus={() => {
          if (!focoPuesto.current) setEscribiendo(true);
        }}
        onPointerDown={() => setEscribiendo(true)}
        onKeyDown={() => setEscribiendo(true)}
        onBlur={() => setEscribiendo(false)}
      />
    );
    pie = pieDelPaso(<BotonEnviar cal={cal} />);
  } else {
    cuerpo = <Estrellas valor={cal.estrellas} onElegir={elegirEstrellas} etiquetadaPor={idPregunta} />;
    // Con las flechas (o al volver) se eligió sin avanzar: "Seguir".
    if (cal.estrellas > 0 && !avanzando) pie = <Pie derecha={<BotonSeguir onClick={seguir} />} bloqueado={pieBloqueado} />;
  }
  const Contenedor = paso === "comentario" ? "form" : "div";
  const progreso = !cerrada && indice > 0 ? ` Pregunta ${indice + 1} de ${pasos.length}.` : "";

  const pegada = modo !== "posada";
  const visibilidad =
    estado === "oculta"
      ? `pointer-events-none opacity-0 ${!entro && visita === "nueva" ? "translate-y-3 motion-reduce:translate-y-0" : ""}`
      : estado === "saliendo"
        ? "pointer-events-none opacity-0 translate-y-2 motion-reduce:translate-y-0"
        : "pointer-events-auto opacity-100 translate-y-0";
  const aspecto = cerrada
    ? "bg-emerald-50 ring-emerald-600/20"
    : pegada
      ? "bg-white ring-slate-900/10"
      : "bg-white ring-slate-200";

  return (
    <div
      ref={riel}
      data-flotante=""
      data-calificacion={estado}
      style={{ "--teclado": `${teclado.tapa}px` }}
      className={`pointer-events-none mt-3 flex justify-end sm:pr-5 print:hidden ${
        pegada ? "sticky bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))_+_var(--teclado,0px))] z-10 sm:bottom-[calc(1.25rem_+_var(--teclado,0px))]" : ""
      }`}
    >
      <section
        ref={seccion}
        aria-label="Calificá este cálculo"
        data-achicada={enLinea ? "" : undefined}
        inert={!mostrada}
        style={teclado.tapa > 0 ? { maxHeight: `min(${teclado.alto - 16}px, 26rem)` } : undefined}
        onPointerDownCapture={(e) => {
          gesto.current = e.pointerType || "mouse";
          recorrido.current = 0;
        }}
        onKeyDownCapture={() => {
          gesto.current = "teclado";
          recorrido.current = 0;
        }}
        className={`relative flex max-h-[min(60dvh,26rem)] w-full flex-col rounded-2xl px-4 ring-1 transition-[opacity,translate,box-shadow,background-color] duration-300 ease-out motion-reduce:transition-opacity sm:w-[25rem] ${
          enLinea ? "py-1" : "py-3"
        } ${pegada ? "shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)]" : "shadow-none"} ${aspecto} ${visibilidad}`}
      >
        <p className="sr-only" role="status" aria-live="polite">
          {aviso}
        </p>

        {enLinea ? (
          // La pregunta abierta, en una línea: sigue flotando y un toque la abre donde estaba.
          <AparecerSuave desde="translate-y-1">
            {/* Achicada no está el aviso del error: el lector se entera por acá. */}
            {cal.error && (
              <p role="alert" className="sr-only">
                {cal.error}
              </p>
            )}
            <button
              ref={linea}
              type="button"
              aria-expanded="false"
              onClick={abrir}
              className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 rounded-xl px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Marca />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                {tituloDelPaso(paso, cal)}
                <span className="sr-only">{progreso}</span>
              </span>
              {cal.error ? (
                <span className="shrink-0 text-[12px] font-semibold text-rose-700"> No se guardó</span>
              ) : (
                indice > 0 && <Avance total={pasos.length} actual={indice} />
              )}
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10l4-4 4 4" />
              </svg>
            </button>
          </AparecerSuave>
        ) : (
          <>
            <div className="flex shrink-0 items-start gap-2.5">
              <Marca hecho={cerrada} />
              <AparecerSuave key={cerrada ? "gracias" : paso} desde={haciaAtras ? "-translate-x-3" : "translate-x-3"} className="min-w-0 flex-1">
                <p ref={titulo} tabIndex={-1} className={`pt-0.5 text-sm font-semibold leading-5 outline-none ${cerrada ? "text-emerald-900" : "text-slate-800"}`}>
                  <span id={idPregunta}>{cerrada ? "¡Gracias por ayudar a mejorar!" : tituloDelPaso(paso, cal)}</span>
                  {progreso && <span className="sr-only">{progreso}</span>}
                </p>
              </AparecerSuave>
            </div>

            {cerrada ? (
              (cal.comentarioEnviado || cal.comentarioBorrado || cal.error) && (
                <div className="pl-[34px] pt-0.5">
                  <BorrarComentario cal={cal} />
                  <ErrorDeCalificacion cal={cal} conReintentar={false} />
                </div>
              )
            ) : (
              // Aire adentro (-mx-3 px-3, pb-1) en las dos cajas que recortan, la
              // del plegado y la del scroll: sin él se cortaban los anillos de foco
              // de la primera estrella, de las opciones del borde y del pie.
              <Plegable plegado={cal.plegando} className="min-h-0" interior="-mx-3 flex flex-col px-3 pb-1">
                <Contenedor className="flex min-h-0 flex-col" {...(paso === "comentario" ? { onSubmit: alEnviar } : {})}>
                  {/* overscroll-contain sólo con el teclado del celular, cuando el cuerpo
                      desborda: siempre, frenaba la rueda con el puntero sobre las opciones. */}
                  <AparecerSuave
                    key={paso}
                    desde={haciaAtras ? "-translate-x-3" : "translate-x-3"}
                    className={`-mx-3 min-h-0 overflow-y-auto px-3 pb-1 pt-1.5 ${teclado.tapa > 0 ? "overscroll-contain" : ""}`}
                  >
                    {cuerpo}
                  </AparecerSuave>
                  <ErrorDeCalificacion cal={cal} conReintentar={paso !== "comentario"} alReintentar={reintentar} />
                  {pie}
                </Contenedor>
              </Plegable>
            )}
          </>
        )}
      </section>
    </div>
  );
}
