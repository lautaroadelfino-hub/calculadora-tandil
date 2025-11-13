// components/FunnyEscalasLoader.jsx
// Loader tipo "paneles de resultado" que se acomodan alrededor del logo

import React from "react";

export default function FunnyEscalasLoader({
  full = false,
  label = "CARGANDO ESCALAS SALARIALES...",
  accent = "#10b981",
  size = 1, // escala total (1..2 recomendado)
}) {
  return (
    <section
      className={
        full
          ? "min-h-dvh grid place-items-center bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700"
          : "grid place-items-center text-slate-700"
      }
      aria-busy="true"
      aria-live="polite"
      // CSS vars para color y escala
      style={{ "--accent": accent, "--fl-scale": size }}
    >
      <div className="flex flex-col items-center gap-4 p-6">
        {/* Caja principal del loader */}
        <div className="relative fl-box max-w-md w-full rounded-3xl bg-white/90 border border-slate-200 shadow-lg px-6 py-5 overflow-hidden">
          {/* Brillo de fondo */}
          <div className="pointer-events-none absolute inset-0 opacity-40 fl-glow" />

          {/* Logo al centro */}
          <div className="relative z-10 flex items-center justify-center mb-6">
            <div className="fl-logo-center flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 text-white shadow-md">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-400">
                <span className="text-[11px] font-extrabold tracking-[0.12em]">
                  AR
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold">LiquidAR</span>
                <span className="text-[10px] text-emerald-200">
                  simulador de sueldos
                </span>
              </div>
            </div>
          </div>

          {/* Paneles que “se acomodan” */}
          <div className="relative z-10 h-[140px]">
            {/* Remunerativo */}
            <div className="fl-panel fl-rem">
              <div className="fl-chip">Remunerativo</div>
              <div className="fl-amount fl-positive">$ 485.230,15</div>
              <div className="fl-sub">Básico + antigüedad + presentismo</div>
            </div>

            {/* No remunerativo */}
            <div className="fl-panel fl-norem">
              <div className="fl-chip fl-chip-soft">No remunerativo</div>
              <div className="fl-amount">$ 82.500,00</div>
              <div className="fl-sub">Acuerdos, sumas fijas, etc.</div>
            </div>

            {/* Descuentos */}
            <div className="fl-panel fl-desc">
              <div className="fl-chip fl-chip-warn">Descuentos</div>
              <div className="fl-amount fl-negative">− $ 145.900,32</div>
              <div className="fl-sub">Aportes, obra social, sindicato</div>
            </div>

            {/* Neto */}
            <div className="fl-panel fl-net">
              <div className="fl-chip fl-chip-main">Neto a cobrar</div>
              <div className="fl-amount fl-positive">$ 421.829,83</div>
              <div className="fl-sub">Lo que llega a tu bolsillo</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500">{label}</p>
      </div>

      {/* estilos y animaciones */}
      <style>{`
        .fl-box {
          transform: scale(var(--fl-scale, 1));
          transform-origin: center;
          position: relative;
        }

        .fl-glow {
          background: radial-gradient(circle at 50% 0%, rgba(16,185,129,0.25), transparent 55%);
        }

        .fl-logo-center {
          animation: fl-logo-pulse 1500ms ease-in-out infinite;
        }

        @keyframes fl-logo-pulse {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 10px 25px rgba(15,118,110,0.25);
          }
          50% {
            transform: translateY(-2px) scale(1.03);
            box-shadow: 0 18px 35px rgba(16,185,129,0.45);
          }
        }

        .fl-panel {
          position: absolute;
          width: 52%;
          max-width: 210px;
          padding: 8px 10px;
          border-radius: 14px;
          background: rgba(248,250,252,0.96);
          box-shadow: 0 8px 20px rgba(15,23,42,0.08);
          border: 1px solid rgba(148,163,184,0.45);
          backdrop-filter: blur(10px);
        }

        .fl-chip {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: rgba(15,23,42,0.04);
          color: #0f172a;
        }

        .fl-chip-soft {
          background: rgba(148,163,184,0.12);
          color: #1e293b;
        }

        .fl-chip-warn {
          background: rgba(248,113,113,0.12);
          color: #b91c1c;
        }

        .fl-chip-main {
          background: rgba(16,185,129,0.15);
          color: #047857;
        }

        .fl-amount {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }

        .fl-positive {
          color: #047857;
        }

        .fl-negative {
          color: #b91c1c;
        }

        .fl-sub {
          margin-top: 2px;
          font-size: 10px;
          color: #64748b;
        }

        /* Posiciones base de cada panel alrededor del logo */
        .fl-rem {
          top: 6px;
          left: 10px;
          animation: fl-rem-shift 1800ms ease-in-out infinite;
        }

        .fl-norem {
          top: 6px;
          right: 10px;
          animation: fl-norem-shift 1800ms ease-in-out infinite;
        }

        .fl-desc {
          bottom: 4px;
          left: 4px;
          animation: fl-desc-shift 1800ms ease-in-out infinite;
          animation-delay: 150ms;
        }

        .fl-net {
          bottom: 0;
          right: 0;
          animation: fl-net-shift 1800ms ease-in-out infinite;
          animation-delay: 250ms;
        }

        /* Animaciones: simulan que los paneles “se acomodan” */
        @keyframes fl-rem-shift {
          0%   { transform: translate(-6px, -4px) rotate(-4deg); opacity: 0.7; }
          40%  { transform: translate(0px, 0px) rotate(0deg); opacity: 1; }
          70%  { transform: translate(2px, -2px) rotate(-1deg); }
          100% { transform: translate(-6px, -4px) rotate(-4deg); opacity: 0.75; }
        }

        @keyframes fl-norem-shift {
          0%   { transform: translate(8px, -6px) rotate(4deg); opacity: 0.7; }
          40%  { transform: translate(0px, 0px) rotate(0deg); opacity: 1; }
          70%  { transform: translate(-1px, -3px) rotate(1deg); }
          100% { transform: translate(8px, -6px) rotate(4deg); opacity: 0.75; }
        }

        @keyframes fl-desc-shift {
          0%   { transform: translate(-6px, 8px) rotate(3deg); opacity: 0.65; }
          40%  { transform: translate(0px, 0px) rotate(0deg); opacity: 1; }
          70%  { transform: translate(2px, 2px) rotate(1deg); }
          100% { transform: translate(-6px, 8px) rotate(3deg); opacity: 0.7; }
        }

        @keyframes fl-net-shift {
          0%   { transform: translate(10px, 10px) rotate(-5deg); opacity: 0.7; }
          40%  { transform: translate(0px, 0px) rotate(0deg); opacity: 1; }
          70%  { transform: translate(-1px, 2px) rotate(-1deg); }
          100% { transform: translate(10px, 10px) rotate(-5deg); opacity: 0.75; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fl-logo-center,
          .fl-rem,
          .fl-norem,
          .fl-desc,
          .fl-net {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
