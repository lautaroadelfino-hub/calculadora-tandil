"use client";
// components/calculadora/calificacion/Medidas.jsx
// Las medidas de la pantalla, a la vista, para diagnosticar un teléfono que no
// tenemos. Aparece sólo si la dirección termina en #medidas
// (CalificarExperiencia.jsx): la persona abre el link, calcula, saca una
// captura y con eso se sabe qué navegador es, cuánto mide cada viewport y
// dónde quedó la tira. Nació el 27/11/2026: el dueño veía la calificación
// "muy abajo" en su celular y no había forma de reproducirlo en la compu,
// donde no existen las barras del navegador del teléfono ni su teclado.
//
// Va arriba, debajo de la barra del sitio: si lo que falla es el pie de la
// pantalla, abajo no se vería.

import { useEffect, useState } from "react";

/** Mide en px algo que sólo se puede escribir en CSS (100dvh, env(safe-area-inset-bottom)…). */
function enPx(valor) {
  const d = document.createElement("div");
  d.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:${valor}`;
  document.body.appendChild(d);
  const px = Math.round(d.getBoundingClientRect().height * 10) / 10;
  d.remove();
  return px;
}

function leer(riel) {
  const vv = window.visualViewport;
  const r = riel?.getBoundingClientRect();
  const cuerpo = getComputedStyle(document.body);
  const raiz = getComputedStyle(document.documentElement);
  const n = (x) => (typeof x === "number" ? Math.round(x * 10) / 10 : "?");
  return [
    `ventana ${window.innerWidth}x${window.innerHeight}  html ${document.documentElement.clientHeight}  pantalla ${screen.width}x${screen.height} @${window.devicePixelRatio}`,
    vv ? `visual ${n(vv.width)}x${n(vv.height)}  corrido ${n(vv.offsetTop)}  zoom ${n(vv.scale)}` : "visual: no hay visualViewport",
    `100vh ${enPx("100vh")}  svh ${enPx("100svh")}  dvh ${enPx("100dvh")}  lvh ${enPx("100lvh")}  zona segura ${enPx("env(safe-area-inset-bottom, 0px)")}`,
    `scroll ventana ${n(window.scrollY)}  body ${n(document.body.scrollTop)}  body ${cuerpo.overflowX}/${cuerpo.overflowY} alto ${document.body.offsetHeight}  html ${raiz.overflowX}/${raiz.overflowY}`,
    r ? `tira ${n(r.top)} a ${n(r.bottom)} (${n(r.height)})  bottom ${getComputedStyle(riel).bottom}  tapa ${riel.style.getPropertyValue("--tapa") || "?"}  ${riel.dataset.calificacion}` : "tira: no está",
    navigator.userAgent,
  ].join("\n");
}

/** @param riel  un ref al elemento pegajoso de la tira. */
export default function Medidas({ riel }) {
  const [texto, setTexto] = useState("");
  useEffect(() => {
    const medir = () => setTexto(leer(riel.current));
    medir();
    // Cada medio segundo, y no por eventos: es para mirar, y así no depende de que el navegador avise.
    const id = setInterval(medir, 500);
    return () => clearInterval(id);
  }, [riel]);
  return (
    <pre
      data-flotante=""
      aria-hidden="true"
      className="pointer-events-none fixed left-2 right-2 top-[calc(var(--h-header)+0.5rem)] z-[60] m-0 whitespace-pre-wrap break-words rounded-lg bg-slate-950/90 p-2 font-mono text-[10px] leading-[1.35] text-lime-300 print:hidden"
    >
      {texto}
    </pre>
  );
}
