// components/Header.jsx
"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 text-white shadow bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 py-4 sm:py-5 min-h-[80px] sm:min-h-[96px]">
          {/* Marca */}
          <a href="/" className="flex items-center gap-4 shrink-0" aria-label="LiquidAR">
            <img
              src="/brand/icon-liquidar.svg"
              alt="LiquidAR"
              className="h-12 w-12 md:h-14 md:w-14 rounded-2xl ring-1 ring-white/20 shadow-sm"
            />
            <span className="font-extrabold tracking-tight text-2xl md:text-3xl">
              Liquid<span className="text-emerald-200">AR</span>
            </span>
          </a>

          {/* Nav */}
          <nav className="ml-auto flex items-center gap-8">
            <a href="/" className="hover:text-emerald-100">Calculadora</a>
            <a href="/paritarias" className="hover:text-emerald-100">Paritarias</a>
          </nav>
        </div>
      </div>
    </header>
  );
}
