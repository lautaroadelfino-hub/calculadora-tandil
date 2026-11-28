"use client";
// components/calculadora/CalificarExperiencia.jsx
// "¿Te sirvió este cálculo?": la última línea del recibo.
//
// QUÉ ES. Una tira del ancho de la columna del recibo, en la tinta de su
// franja de arriba ("Simulación de recibo", slate-900), con la pregunta a la
// izquierda y las cinco estrellas a la derecha: como un renglón del recibo,
// el concepto de un lado y el valor del otro. Mide una sola fila (52 px)
// hasta que la persona la toca. La versión anterior era una tarjeta blanca
// de 102 px que al preguntar llegaba a 304: en un celular de 640 px de alto
// tapaba entre el 18 % y la mitad de la pantalla, y en la compu flotaba justo
// sobre la columna de los importes (el dueño, 27/11/2026: "no se acomoda a
// la pantalla"). Es oscura y no blanca porque al achicarla hay que compensar
// con contraste para que se siga viendo, y porque blanca sobre el recibo
// blanco necesitaba una sombra grande para despegarse.
//
// DÓNDE. Vive en la columna del recibo, justo después de la tarjeta del
// recibo, y es pegajosa (sticky) contra el pie de la pantalla. Mientras se
// mira el recibo flota abajo, con los bordes del recibo, en el celular y en
// la compu. Al bajar hasta el final se apoya sola debajo del recibo, y al
// volver al formulario se va con él. Así nunca queda encima del formulario,
// del "Calcular liquidación" pegado, de las preguntas frecuentes ni del
// modal, y con Tab o con lector se llega en el orden en que se ve.
//
// CUÁNDO. Entra una sola vez y sin reloj: cuando los tres números ya se vieron
// enteros (data-resumen), espera un compás y sube con un fundido, y las
// estrellas se encienden una vez, de a una. No toma el foco ni se anuncia.
// Desde el segundo recibo de la visita entra sin espera y sin destello.
//
// QUIETA, PARA QUIEN YA CALIFICÓ. Cada recibo lleva su tira y se puede
// calificar (el dueño, 27/11/2026: un contador liquida varios sueldos, y si
// uno le sale mal más tarde tiene que poder decirlo). Pero invitar, se invita
// una vez: a quien ya calificó en los últimos cuatro meses, o en esta visita,
// la tira no le flota ni se le anima. Está desde el principio donde las demás
// terminan: apoyada debajo del recibo, sin sombra. Si toca una estrella, ahí
// sí se pega al pie de la pantalla y sigue como siempre (ya la tiene a la
// vista, así que no se mueve de lugar: sólo crece). Y si ya había dicho para
// qué usa la calculadora, esa pregunta no vuelve (useCalificacion.js).
//
// CÓMO SIGUE. Al tocar una estrella la calificación se guarda en el acto
// (useCalificacion.js). La tira crece hacia arriba y sigue de a una pregunta:
// qué falló (con 3 o menos), para qué la usó y un comentario con una pregunta
// a medida. El pie ("Volver", el avance y el botón verde) queda siempre en el
// mismo lugar de la pantalla. Avanza sola sólo con toque o clic y sólo en las
// preguntas de una respuesta. Con teclado no avanza: las flechas elegirían de
// paso cada valor intermedio, así que se sigue con "Seguir". "Seguir" y
// "Enviar" están siempre activos: todo es opcional.
//
// SIN ×. No tiene × ni "Ahora no": el dueño la quiere flotando, sin que
// moleste (26/11/2026). Para no molestar sin cerrarse: es una sola fila, y si
// después de la estrella la persona sigue leyendo el recibo sin contestar (la
// página se mueve un buen trecho sin que toque la tira), la pregunta abierta
// vuelve a una fila, con la pregunta y el avance. Un toque la abre donde
// estaba. No se achica con un comentario escrito sin mandar (escondería
// "Enviar", lo único que lo manda). Con un error sí: el error no se va solo,
// y la fila dice "No se guardó". "Enviar" pliega el panel, el cuadradito de
// LiquidAR se vuelve un tilde y queda "¡Gracias por ayudar a mejorar!", que a
// los 4,5 s se apoya al pie.
//
// Qué se guarda, y por qué no hay un cartel: lib/calificaciones.js.

import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from "react";
import { PREGUNTA_MOTIVO_HASTA } from "@/lib/calificaciones";
import { useCalificacion, menosMovimiento } from "@/components/calculadora/calificacion/useCalificacion";
import { loQueTapaElPie, altoLibre } from "@/components/calculadora/calificacion/loQueTapa";
import Medidas from "@/components/calculadora/calificacion/Medidas";
import {
  PREGUNTA,
  PREGUNTA_CORTA,
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
 * - entrada: el compás entre ver los números y que suba la tira;
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
 * la barra (--h-header, 60 px) y arriba de la tira (52 px), con aire.
 */
const ZONA_DE_LOS_NUMEROS = "-60px 0px -80px 0px";
/** Cuánto tiene que moverse la página, sin tocar la tira, para que una pregunta abierta se achique. */
export const RECORRIDO_PARA_ACHICAR = 160;
const CON_EL_DEDO_O_EL_MOUSE = new Set(["mouse", "touch", "pen"]);
const SIN_TAPA = { px: 0, libre: null };
/** Cuánto se espera a que las barras del navegador y el teclado queden quietos para medir. */
const QUIETO_MS = 150;
/**
 * Con esto al final de la dirección, la tira muestra las medidas de la
 * pantalla (calificacion/Medidas.jsx), pregunta aunque ese navegador ya haya
 * calificado y lo que se conteste va como prueba. Es para mirarla en un
 * teléfono de verdad: README, sección 5.
 */
export const HASH_DE_MEDIDAS = "#medidas";
/** Un almacén que no recuerda nada: en el modo de medidas, la tira pregunta siempre. */
const SIN_MEMORIA = { getItem: () => null, setItem: () => {} };

/**
 * ¿Los tres números ya se vieron? Sí, si estuvieron enteros a la vista o ya
 * quedaron arriba. También si no entran enteros (el teléfono acostado, donde
 * la zona es más baja que los tres apilados) y su final ya subió a la vista:
 * antes ahí la tira esperaba a que se fueran del todo.
 */
function seVieron(e) {
  const arriba = e.rootBounds ? e.rootBounds.top : 60;
  if (e.intersectionRatio >= 0.99 || e.boundingClientRect.bottom <= arriba) return true;
  return Boolean(e.isIntersecting && e.rootBounds && Number.isFinite(e.rootBounds.bottom) && e.boundingClientRect.bottom <= e.rootBounds.bottom);
}
/** Los cortes en los que el navegador avisa cuánto de los números se ve: cada 5 %, para enterarse de que su final subió. */
const CORTES_DE_LOS_NUMEROS = Array.from({ length: 21 }, (_, i) => i / 20);

function tituloDelPaso(paso, cal) {
  if (paso === "motivos") return cal.estrellas <= 2 ? "Uy. ¿Qué falló?" : "¿Qué no te convenció?";
  // Sin "¡Gracias!" si la calificación no se pudo guardar: al lado del aviso, agradecía algo que no pasó.
  if (paso === "perfil") return cal.baja || cal.error ? "¿Para qué la usaste?" : "¡Gracias! ¿Para qué la usaste?";
  if (paso === "comentario") return preguntaDelComentario(cal).titulo;
  return PREGUNTA;
}

/**
 * Cuánto se desplazó la página. Se desplaza la ventana; en el celular, con un
 * Safari anterior a la 16, el body (app/globals.css, "Evitar overflow horizontal").
 */
const desplazamiento = () => window.scrollY + (document.body?.scrollTop || 0);

/**
 * ¿El mouse está encima de la tira? Se pregunta en el momento: con
 * pointerenter/pointerleave quedaba "encima" para siempre cuando la tira
 * cambiaba de forma debajo del puntero. Sólo si lo último que la tocó fue un
 * mouse: en el celular, el :hover queda pegado después de un toque.
 */
const mouseEncima = (gesto, seccion) => gesto === "mouse" && Boolean(seccion?.matches(":hover"));

/**
 * ¿La persona está en la tira con el teclado o con un lector de pantalla?
 * Cuenta todo foco adentro que no vino de un toque o un clic: un lector elige
 * sin mandar teclas ni toques a la página, y con Tab se entra desde afuera.
 * También se pregunta en el momento: Safari y Firefox no avisan (blur) cuando
 * desaparece lo que tenía el foco, y quedaba "adentro" para siempre.
 */
const focoDeTecladoEn = (gesto, seccion) => !CON_EL_DEDO_O_EL_MOUSE.has(gesto) && Boolean(seccion?.contains(document.activeElement));

/**
 * @param contexto  lo que se guarda con la calificación (lib/calificaciones.js).
 * @param desactualizado  el recibo dice "Cambiaste datos": si todavía no
 *   calificó, la tira se va mientras dure (no se pregunta por un recibo
 *   viejo ni se compite con "Recalcular"); si ya calificó, se queda.
 * @param visita  "nueva" (todavía no apareció en esta visita) o "vista" (ya
 *   apareció: la del recibo siguiente entra sin espera). La guarda la
 *   calculadora, que arma una tira por recibo.
 * @param alCambiarVisita  avisa "vista" cuando entra por primera vez.
 * @param calificoEnLaVisita  ya tocó una estrella en otro recibo de esta
 *   visita: esta tira arranca quieta, aunque el navegador todavía no lo haya
 *   anotado (useCalificacion.js lo anota recién cuando Firestore contesta).
 * @param alCalificar  avisa la primera estrella de este recibo: la calculadora
 *   se lo dice a las tiras de los recibos que sigan (calificoEnLaVisita).
 * @param enviar, almacen, ahora, espera, tiempos  para los tests.
 */
export default function CalificarExperiencia({
  contexto,
  desactualizado = false,
  visita = "nueva",
  alCambiarVisita,
  calificoEnLaVisita = false,
  alCalificar,
  enviar,
  almacen,
  ahora,
  espera,
  tiempos,
}) {
  const t = { ...TIEMPOS, ...tiempos };
  // Se mira una sola vez, al armarse: en el servidor no hay dirección, y ahí la tira no dibuja nada.
  const [conMedidas] = useState(() => typeof window !== "undefined" && window.location.hash === HASH_DE_MEDIDAS);
  const cal = useCalificacion({
    contexto,
    enviar,
    almacen: almacen ?? (conMedidas ? SIN_MEMORIA : null),
    ahora,
    espera,
    dePrueba: conMedidas,
    // En el modo de medidas se prueba la tira que invita: lo calificado antes no cuenta.
    calificoEnLaVisita: calificoEnLaVisita && !conMedidas,
  });
  const [paso, setPaso] = useState("estrellas");
  const [haciaAtras, setHaciaAtras] = useState(false);
  // flotando (pegada al pie de la pantalla) → saliendo → posada (quieta al pie
  // del recibo). Sólo el agradecimiento se apoya: la pregunta sigue flotando.
  // La tira de quien ya calificó también espera apoyada, pero eso no es un
  // estado de acá: sale de lo que recuerda el navegador (`quieta`, más abajo).
  const [modo, setModo] = useState("flotando");
  const [entro, setEntro] = useState(false);
  // Las estrellas se encienden una vez al entrar, sólo en el primer recibo de la visita.
  const [conDestello, setConDestello] = useState(false);
  // La pregunta abierta, achicada a una línea porque la persona siguió leyendo el recibo.
  const [achicada, setAchicada] = useState(false);
  // Hay una pausa en curso antes de pasar sola a la pregunta siguiente.
  const [avanzando, setAvanzando] = useState(false);
  // Un momento sin tomar toques, las opciones y el pie: justo después de que
  // la tira cambia de forma, lo que queda debajo del dedo es otra cosa.
  const [bloqueado, setBloqueado] = useState(false);
  // Lo que dice la región viva (existe vacía desde el principio, si no el lector no la anuncia).
  const [aviso, setAviso] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  // Lo que tapa el pie de la pantalla (px) y, mientras se escribe o algo lo
  // tapa, el alto que le queda a la tira (libre; si no, null).
  const [tapa, setTapa] = useState(SIN_TAPA);
  const idPregunta = useId();
  const riel = useRef(null);
  const seccion = useRef(null);
  const titulo = useRef(null);
  const caja = useRef(null);
  const linea = useRef(null);
  // Con qué se tocó lo último en la tira: "mouse", "touch", "pen" o "teclado".
  const gesto = useRef(null);
  // Cuánto se movió la página desde que la persona tocó la tira por última vez.
  const recorrido = useRef(0);
  // El foco que pone la tira en la caja no es escribir: con eso solo, la
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
  // Para qué la usa se pregunta hasta que lo contesta una vez: después lo recuerda el navegador.
  const pasos = ["estrellas", ...(cal.baja ? ["motivos"] : []), ...(cal.perfilRecordado ? [] : ["perfil"]), "comentario"];
  const indice = Math.max(0, pasos.indexOf(paso));
  // QUIETA: a quien no se invita (ya calificó hace poco), la tira lo espera
  // apoyada al pie del recibo hasta que toca una estrella. Desde ahí es una
  // tira como cualquiera: `modoActual` es dónde está, y `modo`, por dónde va
  // el agradecimiento. Sin invitación tampoco hay entrada que esperar.
  const quieta = !cal.invita && cal.estrellas === 0;
  const modoActual = quieta ? "posada" : modo;
  const entroYa = entro || !cal.invita;
  const mostrada = cal.visible && !(desactualizado && cal.estrellas === 0) && (modoActual !== "flotando" || entroYa);
  const estado = mostrada ? modoActual : "oculta";
  const enLinea = achicada && !cerrada;
  // La persona está con la tira: el mouse encima o el foco de teclado adentro.
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
    if (visita !== "nueva") return;
    setConDestello(true);
    alCambiarVisita?.("vista");
  });
  const demoraDeEntrada = visita === "nueva" ? t.entrada : 0;
  useEffect(() => {
    if (!cal.visible || modoActual !== "flotando" || entroYa) return;
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
      { rootMargin: ZONA_DE_LOS_NUMEROS, threshold: CORTES_DE_LOS_NUMEROS }
    );
    observador.observe(numeros);
    return () => {
      observador.disconnect();
      clearTimeout(espera);
    };
  }, [cal.visible, modoActual, entroYa, demoraDeEntrada]);

  // ACHICARSE: la pregunta abierta (después de la estrella) se achica a una
  // línea si la página se mueve más de RECORRIDO_PARA_ACHICAR sin que la
  // persona toque la tira. No mientras escribe o tiene un comentario sin
  // mandar, ni con el mouse encima o el foco de teclado adentro, ni mientras
  // manda. Con un error, sí (la línea lo dice). Se cuenta sólo el scroll de la
  // página: el de adentro de la tira o el de una tabla del recibo no. Antes
  // de calificar no hay nada que achicar: las estrellas ya son una fila. Con
  // una estrella elegida y de vuelta en ellas (con "Volver", o con el
  // teclado), sí: se va el renglón de "Seguir".
  const conBorrador = paso === "comentario" && cal.comentario.trim() !== "";
  const puedeAchicarse = mostrada && modoActual === "flotando" && !cerrada && cal.estrellas > 0 && !achicada && !escribiendo && !conBorrador && !cal.enviando && !cal.plegando;
  // De disposición (useLayoutEffect) y no pasivo: el escucha queda puesto en el
  // mismo dibujado que muestra la pregunta. Con useEffect se ponía un instante
  // después, en otra tarea, y un scroll en ese medio no contaba (en el build
  // de Cloudflare, más lento, un test lo agarró así).
  useLayoutEffect(() => {
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
      // Con el mouse encima o el foco de teclado adentro, la persona está con la tira: no cuenta.
      if (mouseEncima(gesto.current, seccion.current) || focoDeTecladoEn(gesto.current, seccion.current)) {
        recorrido.current = 0;
        return;
      }
      recorrido.current += tramo;
      if (recorrido.current <= RECORRIDO_PARA_ACHICAR) return;
      // Si el foco estaba adentro (lo puso la tira), pasa a la línea: lo que lo tenía desaparece.
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
  // tiene que quedar por encima de la tira (WCAG 2.4.11). El navegador lo
  // corre con scroll-margin-bottom (app/globals.css), que necesita el alto de
  // la tira (en una fila, 52 px; abierta, de 110 a 290) más su
  // distancia al pie. Antes era un scroll-padding fijo de 8rem en la página:
  // no alcanzaba con la tira abierta y, como incluía a la propia tira,
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
  }, [estado, tapa.px]);

  // LO QUE TAPA EL PIE: el teclado del celular y las barras del navegador. La
  // tira va pegada al pie del viewport de disposición; lo que se ve es el
  // visual, que con el teclado en pantalla (o con una barra que el de
  // disposición no descuenta) es más corto. La diferencia se suma al `bottom`
  // del riel (--tapa): la cuenta y sus topes, en calificacion/loQueTapa.js.
  // Escribiendo se mide enseguida, y siempre otra vez con todo quieto: iOS
  // avisa antes de tener el valor nuevo, y mientras las barras se mueven
  // llegan medidas de paso que harían temblar la tira. Al dejar de escribir
  // baja en el acto: después de cerrar el teclado, iOS 26.0 deja el viewport
  // visual unos 24 px corrido.
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    // Sólo mientras hay una tira flotando: apoyada al pie del recibo (el agradecimiento, o la que espera a quien ya calificó) no hay qué medir.
    if (!cal.visible || modoActual !== "flotando" || !vv) {
      setTapa((v) => (v.px === 0 && v.libre === null ? v : SIN_TAPA));
      return;
    }
    if (!escribiendo) setTapa((v) => (v.px === 0 && v.libre === null ? v : SIN_TAPA));
    let cuadro = 0;
    let espera = null;
    const leer = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const px = loQueTapaElPie({ alto: window.innerHeight, vv, escribiendo });
        // El tope de alto vale también con lo visible corrido hasta el pie
        // (iOS): ahí no hay nada tapado, pero la pantalla útil es igual de corta.
        let libre = null;
        if (escribiendo || px > 0) {
          const r = riel.current;
          const abajo = r ? parseFloat(getComputedStyle(r).bottom) : NaN;
          const yaSubida = r ? parseFloat(r.style.getPropertyValue("--tapa")) || 0 : 0;
          libre = altoLibre({
            visible: vv.height,
            corrido: vv.offsetTop || 0,
            barra: document.querySelector("header")?.getBoundingClientRect().bottom ?? 0,
            margen: Number.isFinite(abajo) ? Math.max(0, abajo - yaSubida) : undefined,
          });
        }
        setTapa((v) => (v.px === px && v.libre === libre ? v : { px, libre }));
      });
    };
    const medir = () => {
      if (escribiendo) leer();
      clearTimeout(espera);
      espera = setTimeout(leer, QUIETO_MS);
    };
    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    window.addEventListener("resize", medir);
    window.addEventListener("pageshow", medir);
    return () => {
      cancelAnimationFrame(cuadro);
      clearTimeout(espera);
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
      window.removeEventListener("pageshow", medir);
    };
  }, [escribiendo, modoActual, cal.visible]);

  // "Escribiendo" se apaga con el blur de la caja, pero si la caja desaparece
  // con el foco adentro (otra pregunta, el agradecimiento) no llega ninguno.
  const hayCaja = paso === "comentario" && !cerrada && !enLinea;
  useEffect(() => {
    if (!hayCaja) setEscribiendo(false);
  }, [hayCaja]);

  // Ya apoyado al pie del recibo, el agradecimiento crece hacia abajo: si
  // "Borrar mi comentario" falla, el aviso podía quedar fuera de la pantalla y
  // el toque parecía no hacer nada.
  useEffect(() => {
    if (cal.error && modo === "posada") seccion.current?.scrollIntoView?.({ block: "nearest" });
  }, [cal.error, modo]);

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
  const bloquearUnMomento = () => {
    setBloqueado(true);
    reloj("pie", () => setBloqueado(false), t.pie);
  };
  const irA = (destino, { conPausa = false, atras = false } = {}) => {
    pararReloj("pausa");
    const ir = () => {
      // Si la caja tenía el foco (en el iPhone, tocar un botón no se lo saca),
      // se suelta acá: al desaparecer no avisa, y el teclado quedaba abierto.
      if (document.activeElement === caja.current) caja.current?.blur();
      setAvanzando(false);
      setHaciaAtras(atras);
      setPaso(destino);
      bloquearUnMomento();
      pedirFoco();
    };
    if (!conPausa) return ir();
    setAvanzando(true);
    reloj("pausa", ir, t.pausa);
  };
  const conElDedoOElMouse = () => CON_EL_DEDO_O_EL_MOUSE.has(gesto.current);
  const seguir = () => irA(pasos[Math.min(indice + 1, pasos.length - 1)]);
  const volver = () => irA(pasos[Math.max(indice - 1, 0)], { atras: true });
  /** La pregunta que sigue a `n` estrellas: qué falló (con 3 o menos), para qué la usó (si el navegador no lo recuerda) o el comentario. */
  const despuesDeLasEstrellas = (n) => (n <= PREGUNTA_MOTIVO_HASTA ? "motivos" : cal.perfilRecordado ? "comentario" : "perfil");

  const elegirEstrellas = (n) => {
    // La primera estrella. En el modo de medidas no avisa: ahí se prueba, y tiene que volver a invitar.
    if (cal.estrellas === 0 && !conMedidas) alCalificar?.();
    cal.elegirEstrellas(n);
    if (conElDedoOElMouse()) {
      irA(despuesDeLasEstrellas(n), { conPausa: true });
    } else {
      pararReloj("pausa");
      setAvanzando(false);
    }
  };
  /** Un toque en la estrella que ya estaba elegida (después de "Volver"): sigue, igual que al elegirla. */
  const repetirEstrella = (n) => {
    if (conElDedoOElMouse()) irA(despuesDeLasEstrellas(n), { conPausa: true });
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
  // El foco se pide antes de que "Reintentar" desaparezca (el error se borra al
  // empezar a guardar). Al irse el renglón del error, lo de arriba baja y queda
  // una opción debajo del dedo: un doble toque en "Reintentar" la elegía.
  const reintentar = () => {
    pedirFoco();
    bloquearUnMomento();
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
    <Pie izquierda={<BotonVolver onClick={volver} />} centro={<Avance total={pasos.length} actual={indice} />} derecha={derecha} bloqueado={bloqueado} />
  );
  if (paso === "motivos") {
    cuerpo = (
      <>
        <p className="text-[12px] text-slate-300">Podés marcar varias. Así lo arreglamos.</p>
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
        onPointerDown={() => {
          // Sólo si la caja ya tiene el foco. El toque que se lo da entra por
          // onFocus; el que empieza un deslizamiento de la página sobre la
          // caja no la enfoca, y dejaba "escribiendo" para siempre.
          if (document.activeElement === caja.current) setEscribiendo(true);
        }}
        onKeyDown={() => setEscribiendo(true)}
        onBlur={() => setEscribiendo(false)}
      />
    );
    pie = pieDelPaso(<BotonEnviar cal={cal} />);
  } else if (cal.estrellas > 0 && !avanzando) {
    // Las estrellas van en la fila de la pregunta. Con las flechas (o al volver) se eligió sin avanzar: "Seguir".
    pie = <Pie derecha={<BotonSeguir onClick={seguir} />} bloqueado={bloqueado} />;
  }
  const Contenedor = paso === "comentario" ? "form" : "div";
  const progreso = !cerrada && indice > 0 ? ` Pregunta ${indice + 1} de ${pasos.length}.` : "";

  const pegada = modoActual !== "posada";
  const visibilidad =
    estado === "oculta"
      ? `pointer-events-none opacity-0 ${!entroYa && visita === "nueva" ? "translate-y-3 motion-reduce:translate-y-0" : ""}`
      : estado === "saliendo"
        ? "pointer-events-none opacity-0 translate-y-2 motion-reduce:translate-y-0"
        : "pointer-events-auto opacity-100 translate-y-0";
  const enEstrellas = paso === "estrellas" && !cerrada;
  const bajoElGracias = cerrada && Boolean(cal.comentarioEnviado || cal.comentarioBorrado || cal.error);
  // La tira en una sola fila: las estrellas sin nada debajo, la pregunta achicada o el agradecimiento solo.
  const unaFila = enLinea || (enEstrellas && !pie && !cal.error) || (cerrada && !bajoElGracias);
  // La primera fila mide 44 px (lo que piden las estrellas para tocarlas) y centra lo suyo.
  const filaAlta = unaFila || enEstrellas;

  return (
    <>
      <div
        ref={riel}
        data-flotante=""
        data-calificacion={estado}
        data-quieta={quieta ? "" : undefined}
        data-de-prueba={conMedidas ? "" : undefined}
        style={{ "--tapa": `${tapa.px}px` }}
        className={`@container pointer-events-none mt-3 print:hidden ${
          pegada ? "sticky bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))_+_var(--tapa,0px))] z-10 sm:bottom-[calc(1rem_+_var(--tapa,0px))]" : ""
        }`}
      >
        <section
          ref={seccion}
          aria-label="Calificá este cálculo"
          data-achicada={enLinea ? "" : undefined}
          inert={!mostrada}
          style={tapa.libre !== null ? { maxHeight: `min(${tapa.libre}px, 26rem)` } : undefined}
          onPointerDownCapture={(e) => {
            gesto.current = e.pointerType || "mouse";
            recorrido.current = 0;
          }}
          onKeyDownCapture={() => {
            gesto.current = "teclado";
            recorrido.current = 0;
          }}
          className={`relative flex max-h-[min(60dvh,26rem)] w-full flex-col rounded-2xl bg-slate-900 px-3 text-slate-50 ring-1 ring-white/10 transition-[opacity,translate,box-shadow] duration-300 ease-out motion-reduce:transition-opacity @md:px-4 ${
            filaAlta ? "pt-1" : "pt-3"
          } ${unaFila ? "pb-1" : "pb-3"} ${pegada ? "shadow-[0_14px_34px_-14px_rgba(2,6,23,0.7)]" : "shadow-none"} ${visibilidad}`}
        >
          <p className="sr-only" role="status" aria-live="polite">
            {aviso}
          </p>

          {enLinea ? (
            // La pregunta abierta, en una fila: sigue flotando y un toque la abre donde estaba.
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
                className="-mx-1.5 flex min-h-11 w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-xl px-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <Marca />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-50">
                  {tituloDelPaso(paso, cal)}
                  <span className="sr-only">{progreso}</span>
                </span>
                {cal.error ? (
                  <span className="shrink-0 text-[12px] font-semibold text-rose-300"> No se guardó</span>
                ) : (
                  indice > 0 && <Avance total={pasos.length} actual={indice} />
                )}
                <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10l4-4 4 4" />
                </svg>
              </button>
            </AparecerSuave>
          ) : (
            <>
              <div className={`flex shrink-0 gap-2.5 ${filaAlta ? "min-h-11 items-center" : "items-start"}`}>
                {/* En una tira muy angosta (un teléfono de 320 px) la marca le deja su lugar a la pregunta. */}
                <Marca hecho={cerrada} className={enEstrellas ? "@max-[19.5rem]:hidden" : ""} />
                <AparecerSuave
                  key={cerrada ? "gracias" : paso}
                  desde={haciaAtras ? "-translate-x-3" : "translate-x-3"}
                  className={`min-w-0 flex-1 ${enEstrellas ? "flex items-center justify-between gap-2" : ""}`}
                >
                  <p ref={titulo} tabIndex={-1} className={`text-sm font-semibold leading-5 text-slate-50 outline-none ${filaAlta ? "" : "pt-0.5"}`}>
                    {enEstrellas ? (
                      // En la tira angosta entra la pregunta corta; el lector de pantalla dice la entera.
                      <>
                        <span id={idPregunta} className="sr-only @md:not-sr-only">
                          {PREGUNTA}
                        </span>
                        <span aria-hidden="true" className="@md:hidden">
                          {PREGUNTA_CORTA}
                        </span>
                      </>
                    ) : (
                      <span id={idPregunta}>{cerrada ? "¡Gracias por ayudar a mejorar!" : tituloDelPaso(paso, cal)}</span>
                    )}
                    {progreso && <span className="sr-only">{progreso}</span>}
                  </p>
                  {enEstrellas && (
                    <>
                      {/* La línea de puntos del recibo: en la tira ancha une la pregunta con sus estrellas. */}
                      <span aria-hidden="true" className="hidden min-w-4 flex-1 translate-y-1 border-b border-dotted border-slate-600 @md:block" />
                      <Estrellas
                        valor={cal.estrellas}
                        onElegir={elegirEstrellas}
                        onRepetir={repetirEstrella}
                        etiquetadaPor={idPregunta}
                        invitar={conDestello && cal.estrellas === 0}
                      />
                    </>
                  )}
                </AparecerSuave>
              </div>

              {cerrada
                ? bajoElGracias && (
                    <div className="pl-[34px] pt-0.5">
                      <BorrarComentario cal={cal} />
                      <ErrorDeCalificacion cal={cal} conReintentar={false} />
                    </div>
                  )
                : (cuerpo || pie || cal.error) && (
                    // Aire adentro (-mx-3 px-3, pb-1) en las dos cajas que recortan, la
                    // del plegado y la del scroll: sin él se cortaban los anillos de foco
                    // de las opciones del borde y del pie.
                    <Plegable plegado={cal.plegando} className="min-h-0" interior="-mx-3 flex flex-col px-3 pb-1">
                      <Contenedor className="flex min-h-0 flex-col" {...(paso === "comentario" ? { onSubmit: alEnviar } : {})}>
                        {/* overscroll-contain sólo con el teclado del celular, cuando el cuerpo
                            desborda: siempre, frenaba la rueda con el puntero sobre las opciones. */}
                        {cuerpo && (
                          <AparecerSuave
                            key={paso}
                            desde={haciaAtras ? "-translate-x-3" : "translate-x-3"}
                            className={`-mx-3 min-h-0 overflow-y-auto px-3 pb-1 pt-2 ${tapa.px > 0 ? "overscroll-contain" : ""} ${bloqueado ? "pointer-events-none" : ""}`}
                          >
                            {cuerpo}
                          </AparecerSuave>
                        )}
                        <ErrorDeCalificacion cal={cal} conReintentar={paso !== "comentario"} alReintentar={reintentar} />
                        {pie}
                      </Contenedor>
                    </Plegable>
                  )}
            </>
          )}
        </section>
      </div>
      {/* Las medidas van al lado del riel y no adentro: el riel es un contenedor
          de consultas, y en los navegadores que le aplican contención de
          disposición (Safari y Chrome de antes de 2024) lo fijo de adentro se
          ubica contra él y no contra la pantalla. */}
      {conMedidas && <Medidas riel={riel} />}
    </>
  );
}
