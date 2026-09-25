// components/Header.jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { LINKS_NAVEGACION } from "@/lib/herramientas";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 text-white shadow bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 print:hidden">
      {/* El mismo tope que el contenido (1600 px), para que la marca y el menú queden alineados con él. */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Barra superior */}
        <div className="flex items-center gap-4 py-4 sm:py-5 min-h-[80px] sm:min-h-[96px]">
          {/* Marca */}
          <Link href="/" className="flex items-center gap-4 shrink-0" aria-label="LiquidAR">
            <img
              src="/brand/icon-liquidar.svg"
              alt="LiquidAR"
              className="h-12 w-12 md:h-14 md:w-14 rounded-2xl ring-1 ring-white/20 shadow-sm"
            />
            <span className="font-extrabold tracking-tight text-2xl md:text-3xl whitespace-nowrap">
              Liquid<span className="text-emerald-200">AR</span>
            </span>
          </Link>

          {/* Botón menú (solo mobile) */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="ml-auto md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/15 ring-1 ring-white/25"
          >
            <span className="sr-only">Abrir menú</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Nav desktop */}
          {/* Los links salen de lib/herramientas.js. Antes estaban escritos dos
              veces, una acá y otra en el panel móvil, y había que acordarse de
              tocar las dos. */}
          <nav className="ml-auto hidden md:flex items-center gap-8">
            {LINKS_NAVEGACION.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-emerald-100 whitespace-nowrap">{l.texto}</Link>
            ))}
          </nav>
        </div>

        {/* Panel móvil desplegable */}
        {/* Plegado queda inerte: con max-height 0 los links seguían recibiendo
            el foco y el Tab "desaparecía" dos veces. */}
        <div
          id="mobile-menu"
          inert={!open}
          aria-hidden={!open}
          className={`md:hidden overflow-hidden transition-[max-height] duration-300 ${open ? "max-h-40" : "max-h-0"}`}
        >
          <nav className="flex flex-col gap-1 pb-4">
            {LINKS_NAVEGACION.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 bg-white/10 hover:bg-white/15 whitespace-nowrap"
              >
                {l.texto}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
