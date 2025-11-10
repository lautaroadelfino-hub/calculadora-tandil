// components/Header.jsx
"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur border-b border-white/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white">
      {/* Full width, sin max-w fijo */}
      <div className="w-full px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
          Calculadora de Sueldos
        </h1>
        <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
        </span>
      </div>
    </header>
  );
}
