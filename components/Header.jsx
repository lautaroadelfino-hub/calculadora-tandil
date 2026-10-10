// components/Header.jsx
// La barra superior: blanca, baja (60 px) y con una línea gris abajo. El logo
// a color a la izquierda y los tres links a la derecha; el de la página en la
// que se está va en verde y subrayado.
//
// QUÉ CAMBIÓ Y POR QUÉ (10/10/2026): la barra anterior medía 96 px, llevaba un
// degradé verde-azul que no aparecía en ningún otro lado del sitio y no
// marcaba la página activa. Además el layout le reservaba la altura con un
// relleno aunque la barra, por ser sticky, ya ocupaba su lugar: quedaba una
// banda vacía de 137 a 177 px entre la barra y el título (C11 de la auditoría
// del 23/9/2026). Elegida por el dueño entre cuatro opciones dibujadas en un
// lienzo de diseño.
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINKS_NAVEGACION } from "@/lib/herramientas";

/** "/acuerdos/camioneros" cuenta como estar en "/acuerdos"; "/" sólo es "/". */
function esActivo(href, pathname) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/calcular");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "/";

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] print:hidden">
      {/* El mismo tope que el contenido (1600 px), para que la marca y el menú queden alineados con él. */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-[var(--h-header)]">
          {/* Marca */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500" aria-label="LiquidAR, inicio">
            <img src="/brand/icon-liquidar.svg" alt="" className="h-8 w-8" />
            <span className="font-extrabold tracking-tight text-[21px] text-slate-900 whitespace-nowrap">
              Liquid<span className="text-emerald-600">AR</span>
            </span>
          </Link>

          {/* Botón menú (solo mobile) */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="ml-auto md:hidden inline-flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>

          {/* Nav desktop */}
          {/* Los links salen de lib/herramientas.js. Antes estaban escritos dos
              veces, una acá y otra en el panel móvil, y había que acordarse de
              tocar las dos. */}
          <nav aria-label="Principal" className="ml-auto hidden md:flex items-center gap-7 h-full">
            {LINKS_NAVEGACION.map((l) => {
              const activo = esActivo(l.href, pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex items-center h-[var(--h-header)] box-border border-b-2 text-[15px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500 ${
                    activo
                      ? "border-emerald-600 text-emerald-700 font-semibold"
                      : "border-transparent text-slate-700 font-medium hover:text-slate-900"
                  }`}
                >
                  {l.texto}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Panel móvil desplegable */}
        {/* Plegado queda inerte: con max-height 0 los links seguían recibiendo
            el foco y el Tab "desaparecía" dos veces. */}
        <div
          id="mobile-menu"
          inert={!open}
          aria-hidden={!open}
          className={`md:hidden overflow-hidden transition-[max-height] duration-300 ${open ? "max-h-60" : "max-h-0"}`}
        >
          <nav aria-label="Principal" className="flex flex-col gap-1 pb-3">
            {LINKS_NAVEGACION.map((l) => {
              const activo = esActivo(l.href, pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={activo ? "page" : undefined}
                  className={`block rounded-xl px-3 py-3 text-[15px] whitespace-nowrap ${
                    activo ? "bg-emerald-50 text-emerald-800 font-semibold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {l.texto}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
