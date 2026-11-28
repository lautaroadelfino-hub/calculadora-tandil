"use client";
// components/calculadora/calificacion/piezas.jsx
// Las piezas de la tira "¿Te sirvió este cálculo?" (CalificarExperiencia.jsx):
// el cuadradito de LiquidAR, las estrellas, las opciones para tocar, la caja
// del comentario con su pregunta a medida, el pie con el avance, el plegado y
// los avisos. Lo que hacen (guardar, corregir, reintentar) viene de
// useCalificacion.js.
//
// LOS COLORES. La tira va en la tinta del recibo (slate-900, la misma de la
// franja "Simulación de recibo"), así que todo lo de adentro es claro sobre
// oscuro: el texto en slate-50, lo secundario en slate-300, las estrellas en
// amber-400, la opción elegida invertida (papel: slate-50 con letra
// slate-900), los botones en emerald-400 con letra slate-950, los bordes de
// las opciones y de la caja en slate-500 y los errores en rose-300. Todos
// pasan el contraste que piden el texto (4,5:1) y los controles (3:1) sobre
// slate-900; con slate-600 en los bordes no llegaba. El verde queda sólo
// para avanzar: con las opciones elegidas también en verde, competían con
// "Seguir".
//
// LO ANCHO Y LO ANGOSTO. La tira mide lo que la columna del recibo: unos 330
// px en el celular y de 500 a 900 en la compu. Lo que cambia entre una y otra
// va con consultas de contenedor (@md: desde 448 px de tira), no de pantalla:
// en una compu con la ventana angosta la tira también es angosta.

import { useEffect, useId, useState } from "react";
import { MOTIVOS, PERFILES, MAX_COMENTARIO } from "@/lib/calificaciones";

export const PREGUNTA = "¿Te sirvió este cálculo?";
/** La pregunta como entra en la tira angosta, al lado de las estrellas. El lector de pantalla dice la entera. */
export const PREGUNTA_CORTA = "¿Te sirvió?";
export const NOMBRES = ["", "Muy mal", "Mal", "Más o menos", "Bien", "Muy bien"];
const VALORES = [1, 2, 3, 4, 5];
const RUTA_ESTRELLA = "M12 2.8l2.84 5.76 6.36.92-4.6 4.48 1.09 6.33L12 17.3l-5.69 2.99 1.09-6.33-4.6-4.48 6.36-.92z";
const ANILLO = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300";
/** El anillo de foco separado del control, sobre la tinta de la tira. */
const ANILLO_SEPARADO = `${ANILLO} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`;

/**
 * El cuadradito verde de LiquidAR, el mismo de la barra. Lo que sube desde
 * abajo se cierra por reflejo si parece un chat o un aviso de cookies; con la
 * marca se lee como parte del sitio. Con `hecho` (el agradecimiento), el "AR"
 * se cambia por un tilde que se dibuja, o que ya aparece dibujado si la
 * persona pidió menos movimiento.
 */
export function Marca({ hecho = false, className = "" }) {
  return (
    <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center ${className}`}>
      <span className="grid h-[21px] w-[21px] place-items-center rounded-[5px] bg-linear-to-br from-emerald-500 to-emerald-400 text-white">
        {hecho ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M6 12.5l4 4L18 8"
              pathLength="1"
              className="[stroke-dasharray:1] [stroke-dashoffset:1] motion-safe:animate-[calificacion-trazo_.45s_.1s_ease-out_forwards] motion-reduce:[stroke-dashoffset:0]"
            />
          </svg>
        ) : (
          <span className="text-[9.5px] font-extrabold leading-none tracking-wide">AR</span>
        )}
      </span>
    </span>
  );
}

/**
 * Las cinco estrellas como radios, en la misma fila que la pregunta. Cada una
 * tiene 36 x 44 px para tocar aunque el dibujo mida 24: se eligen con el
 * teclado y el lector de pantalla dice "3 de 5 estrellas (Más o menos)". En
 * una tira muy angosta (un teléfono de 320 px) se angostan a 32. Con
 * el mouse se iluminan hasta el puntero y, donde hay lugar (la tira ancha),
 * al lado dice cuál es. En el celular no: la vista previa quedaba pegada.
 * Con `invitar`, al entrar la tira las estrellas se encienden una vez, de a
 * una (app/globals.css, calificacion-destello): es lo único que se mueve solo,
 * y dice "tocá una". La animación no deja nada aplicado al terminar: si
 * quedara, taparía la vista previa del mouse.
 * `onRepetir(n)` avisa el toque en la estrella que ya estaba elegida: un radio
 * marcado no avisa cambios, y después de "Volver" ese toque no hacía nada.
 */
export function Estrellas({ valor, onElegir, onRepetir, etiquetadaPor, invitar = false }) {
  const [previa, setPrevia] = useState(0);
  const grupo = useId();
  const mostradas = previa || valor;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span aria-hidden="true" className="hidden text-[12px] font-medium text-amber-300 @md:inline">
        {mostradas ? NOMBRES[mostradas] : ""}
      </span>
      <div role="radiogroup" aria-labelledby={etiquetadaPor} className="-mr-1.5 flex items-center" onPointerLeave={() => setPrevia(0)}>
        {VALORES.map((n) => (
          <label
            key={n}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setPrevia(n);
            }}
            className="grid h-11 w-9 cursor-pointer place-items-center rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300 @max-[19.5rem]:w-8"
          >
            <input
              type="radio"
              name={grupo}
              value={n}
              checked={valor === n}
              onChange={() => onElegir(n)}
              onClick={() => {
                if (valor === n) onRepetir?.(n);
              }}
              className="sr-only"
            />
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              strokeWidth="1.5"
              style={invitar ? { animationDelay: `${350 + n * 90}ms` } : undefined}
              className={`h-6 w-6 stroke-amber-400 transition-[fill] duration-150 ${n <= mostradas ? "fill-amber-400" : "fill-transparent"} ${
                invitar ? "motion-safe:animate-[calificacion-destello_.6s_ease-out]" : ""
              }`}
            >
              <path strokeLinejoin="round" d={RUTA_ESTRELLA} />
            </svg>
            <span className="sr-only">{`${n} de 5 estrellas (${NOMBRES[n]})`}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Opcion({ activa, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`min-h-9 rounded-xl border px-3 py-1.5 text-left text-[13px] font-medium leading-[1.2] transition-colors ${ANILLO_SEPARADO} ${
        activa ? "border-slate-50 bg-slate-50 text-slate-900" : "border-slate-500 text-slate-100 hover:border-slate-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Cómo se acomodan las opciones: en dos columnas parejas, que ocupan menos
 * alto que una fila por opción y dejan blancos grandes para el dedo. Recién
 * cuando la tira mide 608 px o más van una al lado de la otra: ahí las cuatro
 * de "¿Para qué la usaste?" entran en una fila. Más angosta (el teléfono
 * acostado, una compu con la ventana en 1024), la última quedaba sola abajo.
 */
const GRILLA_DE_OPCIONES = "grid grid-cols-2 gap-1.5 @[38rem]:flex @[38rem]:flex-wrap @[38rem]:gap-2";

/** Qué falló (con 3 estrellas o menos): se pueden marcar varias. El grupo se llama como la pregunta del paso. */
export function OpcionesDeMotivo({ cal, etiquetadaPor }) {
  return (
    <div role="group" aria-labelledby={etiquetadaPor} className={GRILLA_DE_OPCIONES}>
      {MOTIVOS.map((m) => (
        <Opcion key={m.id} activa={cal.motivos.includes(m.id)} onClick={() => cal.alternarMotivo(m.id)}>
          {m.texto}
        </Opcion>
      ))}
    </div>
  );
}

/**
 * Para qué la usó: una sola. `alTocar(elegida)` avisa si la eligió (true) o
 * la sacó tocándola de nuevo (false), para que la tira decida si avanza.
 */
export function OpcionesDePerfil({ cal, etiquetadaPor, alTocar }) {
  return (
    <div role="group" aria-labelledby={etiquetadaPor} className={GRILLA_DE_OPCIONES}>
      {PERFILES.map((p) => (
        <Opcion
          key={p.id}
          activa={cal.perfil === p.id}
          onClick={() => {
            const elegida = cal.perfil !== p.id;
            cal.elegirPerfil(p.id);
            alTocar?.(elegida);
          }}
        >
          {p.texto}
        </Opcion>
      ))}
    </div>
  );
}

/** La pregunta del comentario según cada motivo, cuando marcó uno solo. */
export const PREGUNTA_POR_MOTIVO = {
  numero_no_cierra: { titulo: "¿Qué concepto no te cierra?", ejemplo: "Por ejemplo: el presentismo, la antigüedad, Ganancias…" },
  falta_categoria_o_concepto: { titulo: "¿Qué te faltó?", ejemplo: "La categoría o el concepto que buscabas…" },
  dificil_de_usar: { titulo: "¿En qué parte te trabaste?", ejemplo: "Por ejemplo: dónde van las horas extras…" },
  datos_viejos: { titulo: "¿Qué dato está viejo?", ejemplo: "Por ejemplo: falta el acuerdo de este mes…" },
  otro: { titulo: "¿Qué pasó?", ejemplo: "Contanos con tus palabras…" },
};

/**
 * La pregunta del último paso, armada con lo que contestó: una pregunta
 * concreta se contesta más y mejor que "Comentario", y pide conceptos, no
 * importes. Devuelve { titulo, ejemplo } (el ejemplo va adentro de la caja).
 */
export function preguntaDelComentario({ estrellas, motivos = [] }) {
  if (estrellas >= 5) return { titulo: "¿Algo que le agregarías?", ejemplo: "Un convenio, un concepto, una función…" };
  if (estrellas === 4) return { titulo: "¿Qué le faltó para las 5 estrellas?", ejemplo: "Una idea, algo que no encontraste…" };
  if (motivos.length === 1 && PREGUNTA_POR_MOTIVO[motivos[0]]) return PREGUNTA_POR_MOTIVO[motivos[0]];
  return { titulo: "¿Qué esperabas y qué pasó?", ejemplo: "Contanos con tus palabras…" };
}

/**
 * La caja del comentario. Va a 16 px porque Safari del iPhone (y del iPad)
 * hace zoom en los campos más chicos y desarma la tira. Arranca en dos
 * renglones y crece con lo escrito; donde `field-sizing` no existe, queda en
 * dos renglones con scroll. No toma el foco sola: eso lo decide la tira.
 * `eventos` (onFocus, onBlur, onPointerDown, onKeyDown) le dicen a la tira
 * si la persona está escribiendo.
 */
export function CampoComentario({ cal, etiquetadaPor, ejemplo, cajaRef, ...eventos }) {
  const nota = useId();
  return (
    <div className="space-y-1.5">
      <textarea
        {...eventos}
        ref={cajaRef}
        value={cal.comentario}
        onChange={(e) => cal.setComentario(e.target.value)}
        maxLength={MAX_COMENTARIO}
        rows={2}
        placeholder={ejemplo}
        aria-labelledby={etiquetadaPor}
        aria-describedby={nota}
        className="block max-h-36 min-h-[3.75rem] w-full resize-none rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-[16px] leading-snug text-slate-50 outline-none field-sizing-content placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
      />
      <p id={nota} className="text-[11px] leading-4 text-slate-300">
        Es opcional. No escribas datos personales (nombre, CUIL, empresa).
      </p>
    </div>
  );
}

/**
 * Los puntitos de avance, desde la segunda pregunta. La estrella cuenta como
 * hecha: arrancar con un paso ya hecho sube la terminación. Para el lector de
 * pantalla no están: cada título dice "Pregunta N de M.".
 */
export function Avance({ total, actual }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-punto={i < actual ? "hecho" : i === actual ? "actual" : "falta"}
          className={`h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
            i === actual ? "w-4 bg-emerald-400" : i < actual ? "w-1.5 bg-emerald-400/50" : "w-1.5 bg-slate-600"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * El pie de cada paso: "Volver" a la izquierda, el avance al centro y el botón
 * verde a la derecha, siempre en el mismo lugar de la pantalla (la tira crece
 * hacia arriba, así que el pie no se mueve de una pregunta a otra). Con
 * `bloqueado` no toma toques: justo después de cambiar de pregunta, un doble
 * toque en "Seguir" salteaba la siguiente.
 */
export function Pie({ izquierda = null, centro = null, derecha = null, bloqueado = false }) {
  return (
    <div data-pie="" className={`grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2 ${bloqueado ? "pointer-events-none" : ""}`}>
      <div className="justify-self-start">{izquierda}</div>
      <div>{centro}</div>
      <div className="justify-self-end">{derecha}</div>
    </div>
  );
}

const BOTON_VERDE = `min-h-10 rounded-lg bg-emerald-400 px-4 text-[13px] font-semibold text-slate-950 transition-colors hover:bg-emerald-300 ${ANILLO_SEPARADO}`;

/** "Seguir": siempre activo. Sin contestar, saltea la pregunta. */
export function BotonSeguir({ onClick }) {
  return (
    <button type="button" onClick={onClick} className={BOTON_VERDE}>
      Seguir
    </button>
  );
}

/**
 * "Enviar": siempre activo, con o sin comentario (todo es opcional). Mientras
 * manda dice "Enviando…" con aria-disabled y no disabled: un botón apagado
 * suelta el foco, justo antes de un posible error.
 */
export function BotonEnviar({ cal }) {
  return (
    <button type="submit" aria-disabled={cal.enviando || undefined} className={`${BOTON_VERDE} aria-disabled:cursor-wait aria-disabled:opacity-70`}>
      {cal.enviando ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function BotonVolver({ onClick }) {
  return (
    <button type="button" onClick={onClick} className={`-ml-2 min-h-10 rounded-lg px-2 text-[13px] font-medium text-slate-300 hover:text-white ${ANILLO}`}>
      Volver
    </button>
  );
}

/**
 * Se pliega con `plegado` (al enviar), con una transición de alto (grid 1fr →
 * 0fr) que no necesita medir nada. Sin transición si la persona pidió menos
 * movimiento. Arranca abierto: al reabrir la línea achicada, abrirse con la
 * transición mostraba un instante la barra de scroll de adentro (en Windows),
 * las opciones se acomodaban en una fila más y la última quedaba escondida.
 * `interior` son las clases de la caja de adentro, que recorta lo que sale.
 */
export function Plegable({ plegado = false, className = "", interior = "", children }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        plegado ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
      } ${className}`}
    >
      <div className={`min-h-0 overflow-hidden ${interior}`}>{children}</div>
    </div>
  );
}

/**
 * Aparece con un fundido corto, desde `desde` (un corrimiento de Tailwind).
 * Tailwind 4 corre las cosas con la propiedad `translate`, no con
 * `transform`: por eso la transición es de `translate` (con `transform` el
 * corrimiento no se animaba).
 */
export function AparecerSuave({ desde = "-translate-y-1", className = "", children, ...resto }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      {...resto}
      className={`transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-x-0 translate-y-0 opacity-100" : `${desde} opacity-0`
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** "Borrar mi comentario" (la Ley 25.326 le da derecho a sacarlo), si mandó uno. */
export function BorrarComentario({ cal }) {
  if (cal.comentarioBorrado) return <p className="text-[12px] text-slate-300">Borramos tu comentario.</p>;
  if (!cal.comentarioEnviado) return null;
  return (
    <button type="button" onClick={cal.borrarComentario} className={`rounded text-[12px] text-emerald-300 underline underline-offset-2 hover:text-emerald-200 ${ANILLO}`}>
      Borrar mi comentario
    </button>
  );
}

/**
 * Lo que no se pudo guardar, arriba del pie. "Reintentar" no va en el paso
 * del comentario ("Enviar" reintenta) ni en el agradecimiento ("Borrar mi
 * comentario" sigue a la vista y reintenta). Con `alReintentar` la tira
 * mueve el foco antes de que el botón desaparezca: si no, quedaba en el body.
 */
export function ErrorDeCalificacion({ cal, conReintentar = true, alReintentar }) {
  if (!cal.error) return null;
  return (
    <p role="alert" className="pt-2 text-[12px] text-rose-300">
      {cal.error}{" "}
      {conReintentar && cal.puedeReintentar && (
        <button type="button" onClick={alReintentar || cal.reintentar} className={`rounded font-semibold underline underline-offset-2 ${ANILLO}`}>
          Reintentar
        </button>
      )}
    </p>
  );
}
