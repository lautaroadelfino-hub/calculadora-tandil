// components/Header.jsx
"use client";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 text-white shadow bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Barra superior */}
        <div className="flex items-center gap-4 py-4 sm:py-5 min-h-[80px] sm:min-h-[96px]">
          {/* Marca */}
          <a href="/" className="flex items-center gap-4 shrink-0" aria-label="LiquidAR">
            <img
              src="/brand/icon-liquidar.svg"
              alt="LiquidAR"
              className="h-12 w-12 md:h-14 md:w-14 rounded-2xl ring-1 ring-white/20 shadow-sm"
            />
            <span className="font-extrabold tracking-tight text-2xl md:text-3xl whitespace-nowrap">
              Liquid<span className="text-emerald-200">AR</span>
            </span>
          </a>

          {/* Botón menú (solo mobile) */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="ml-auto md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/15 ring-1 ring-white/25"
          >
            <span className="sr-only">Abrir menú</span>
            {/* Icono hamburguesa */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Nav desktop */}
          <nav className="ml-auto hidden md:flex items-center gap-8">
            <a href="/" className="hover:text-emerald-100 whitespace-nowrap">Calculadora</a>
            <a href="/paritarias" className="hover:text-emerald-100 whitespace-nowrap">Paritarias</a>
          </nav>
        </div>

        {/* Panel móvil desplegable */}
        <div
          id="mobile-menu"
          className={`md:hidden overflow-hidden transition-[max-height] duration-300 ${open ? "max-h-40" : "max-h-0"}`}
        >
          <nav className="flex flex-col gap-1 pb-4">
            <a
              href="/"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 bg-white/10 hover:bg-white/15 whitespace-nowrap"
            >
              Calculadora
            </a>
            <a
              href="/paritarias"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 bg-white/10 hover:bg-white/15 whitespace-nowrap"
            >
              Paritarias
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
