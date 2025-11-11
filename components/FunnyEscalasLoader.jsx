// components/loaders/LoaderWorkers.jsx
// Animación SVG “hombres trabajando” (ampliable)
// Ahora con prop `size` para escalar todo el SVG sin perder nitidez.
// Uso:
//  <LoaderWorkers size={1.4} full label="CARGANDO ESCALAS SALARIALES…" accent="#10b981" />
//  // size: 1 = base (360x160). 1.5 ≈ 540x240. 2 ≈ 720x320.

import React from 'react'

export default function LoaderWorkers({
  full = false,
  label = 'CARGANDO ESCALAS SALARIALES...',
  accent = '#10b981',
  size = 1, // ⬅️ escala total (1..2 recomendado)
}) {
  const w = Math.max(1, Math.round(360 * size))
  const h = Math.max(1, Math.round(160 * size))

  return (
    <section
      className={full ? 'min-h-dvh grid place-items-center bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700' : ''}
      aria-busy="true"
      aria-live="polite"
      style={{ ['--accent']: accent }}
    >
      <div className="flex flex-col items-center gap-4 p-6">
        <svg
          role="img"
          aria-label={label}
          width={w}
          height={h}
          viewBox="0 0 360 160"
          className="max-w-[96vw]"
        >
          <defs>
            <linearGradient id="g-tape" x1="0" x2="1">
              <stop offset="0" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* suelo */}
          <rect x="0" y="130" width="360" height="8" fill="#e5e7eb" />

          {/* cinta de obra */}
          <g className="lw-tape" transform="translate(20,40)">
            <rect x="0" y="0" width="320" height="12" fill="url(#g-tape)" />
            {Array.from({ length: 16 }).map((_, i) => (
              <rect key={i} x={i * 20} y={0} width="12" height="12" fill="#111827" opacity="0.15" />
            ))}
          </g>

          {/* Worker 1: martillo */}
          <g transform="translate(40,70)">
            <circle cx="0" cy="0" r="8" fill="#111827" />
            <rect x="-6" y="8" width="12" height="22" rx="3" fill="#334155" />
            <path d="M -9 0 a 9 9 0 0 1 18 0 v 2 h -18 z" fill="var(--accent)" />
            <g className="lw-hammer" transform="translate(6,12)">
              <rect x="-2" y="0" width="4" height="16" rx="2" fill="#334155" />
              <rect x="-1" y="15" width="2" height="12" fill="#6b7280" />
              <rect x="-5" y="15" width="10" height="4" fill="#9ca3af" />
            </g>
            <rect x="22" y="18" width="10" height="20" fill="#9ca3af" />
          </g>

          {/* Worker 2: pala */}
          <g transform="translate(150,76)">
            <circle cx="0" cy="0" r="8" fill="#111827" />
            <rect x="-6" y="8" width="12" height="22" rx="3" fill="#334155" />
            <path d="M -9 0 a 9 9 0 0 1 18 0 v 2 h -18 z" fill="var(--accent)" />
            <g className="lw-shovel" transform="translate(10,10)">
              <rect x="-1" y="0" width="2" height="26" fill="#8b5e34" />
              <path d="M -6 24 q 6 8 12 0 v 8 h -12 z" fill="#9ca3af" />
            </g>
            <path d="M 18 30 q 16 -10 32 0 v 6 h -32 z" fill="#d1d5db" />
          </g>

          {/* Worker 3: carretilla */}
          <g className="lw-wheel" transform="translate(250,82)">
            <circle cx="0" cy="-6" r="7" fill="#111827" />
            <rect x="-5" y="0" width="10" height="18" rx="3" fill="#334155" />
            <path d="M -8 -6 a 8 8 0 0 1 16 0 v 2 h -16 z" fill="var(--accent)" />
            <g transform="translate(14,14)">
              <circle cx="18" cy="8" r="6" fill="#6b7280" />
              <rect x="0" y="-2" width="22" height="10" rx="2" fill="#9ca3af" />
              <rect x="-10" y="-1" width="12" height="2" fill="#9ca3af" />
            </g>
          </g>

          {/* conos */}
          <g transform="translate(100,128)">
            <polygon points="0,0 8,0 4,-12" fill="#f97316" />
            <rect x="-2" y="0" width="12" height="3" fill="#9ca3af" />
          </g>
          <g className="lw-ping" transform="translate(120,128)">
            <polygon points="0,0 8,0 4,-12" fill="#f97316" />
            <rect x="-2" y="0" width="12" height="3" fill="#9ca3af" />
          </g>
        </svg>

        <p className="text-sm text-slate-500">{label}</p>
      </div>

      {/* estilos y animaciones */}
      <style>{`
        .lw-hammer { transform-box: fill-box; transform-origin: top left; animation: lw-hammer 900ms ease-in-out infinite; }
        @keyframes lw-hammer { 0%,100% { transform: rotate(-18deg) translateY(0); } 50% { transform: rotate(14deg) translateY(1px); } }

        .lw-shovel { transform-box: fill-box; transform-origin: top left; animation: lw-shovel 1100ms ease-in-out infinite; }
        @keyframes lw-shovel { 0%,100% { transform: rotate(-12deg) translateX(0); } 50% { transform: rotate(10deg) translateX(1px); } }

        .lw-wheel { animation: lw-wheel 1600ms ease-in-out infinite alternate; }
        @keyframes lw-wheel { 0% { transform: translate(250px,82px); } 100% { transform: translate(290px,84px); } }

        .lw-tape { animation: lw-tape 2200ms ease-in-out infinite; transform-origin: 0% 50%; }
        @keyframes lw-tape { 0%,100% { transform: translate(20px,40px) rotate(-0.6deg); } 50% { transform: translate(20px,40px) rotate(0.6deg); } }

        .lw-ping { position: relative; }
        .lw-ping::after { content: ''; position: absolute; inset: -8px -8px auto auto; width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); opacity: .4; animation: lw-pulse 1.4s ease-out infinite; }
        @keyframes lw-pulse { 0% { transform: scale(0.6); opacity: .6 } 100% { transform: scale(2.2); opacity: 0 } }

        @media (prefers-reduced-motion: reduce) {
          .lw-hammer, .lw-shovel, .lw-wheel, .lw-tape, .lw-ping::after { animation: none !important; }
        }
      `}</style>
    </section>
  )
}
