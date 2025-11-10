// components/FunnyEscalasLoader.jsx
export default function FunnyEscalasLoader() {
  return (
    <main
      className="min-h-dvh grid place-items-center bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Aro girando con la calculadora */}
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 rounded-full border-4 border-slate-300 border-t-transparent motion-safe:animate-spin" />
          <div className="absolute inset-0 grid place-items-center text-5xl select-none">🧮</div>

          {/* Moneditas / íconos rebotando */}
          <span className="absolute -top-3 -right-3 text-2xl motion-safe:animate-bounce" style={{ animationDelay: "0ms" }}>
            💸
          </span>
          <span className="absolute -bottom-3 -left-4 text-2xl motion-safe:animate-bounce" style={{ animationDelay: "150ms" }}>
            💵
          </span>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl motion-safe:animate-bounce" style={{ animationDelay: "300ms" }}>
            📈
          </span>
        </div>

        <p className="text-lg font-semibold tracking-wide">Cargando escalas salariales…</p>
        <p className="text-sm text-slate-500">Esto puede tardar unos segunditos.</p>

        {/* Barras tipo “gráfico” */}
        <div className="flex items-end gap-2 h-12 mt-2" aria-hidden="true">
          <div className="w-2 rounded bg-emerald-500/80 motion-safe:animate-pulse h-4" />
          <div className="w-2 rounded bg-emerald-500/80 motion-safe:animate-pulse h-8" style={{ animationDelay: "120ms" }} />
          <div className="w-2 rounded bg-emerald-500/80 motion-safe:animate-pulse h-10" style={{ animationDelay: "240ms" }} />
          <div className="w-2 rounded bg-emerald-500/80 motion-safe:animate-pulse h-6" style={{ animationDelay: "360ms" }} />
          <div className="w-2 rounded bg-emerald-500/80 motion-safe:animate-pulse h-9" style={{ animationDelay: "480ms" }} />
        </div>

        {/* Línea estética */}
        <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 motion-safe:animate-pulse bg-gradient-to-r from-emerald-400/70 to-emerald-600/70" />
        </div>
      </div>
    </main>
  );
}
