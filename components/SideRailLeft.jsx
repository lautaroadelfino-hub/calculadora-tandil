"use client";
import React from "react";

export default function SideRailLeft() {
  return (
    <aside className="sticky top-24 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Ayuda rápida</h3>
        <ul className="mt-2 text-sm text-slate-600 list-disc pl-4 space-y-1">
          <li>Elegí sector, convenio y sub-régimen.</li>
          <li>Seleccioná mes y categoría.</li>
          <li>Cargá antigüedad, título, función y horas extra.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Notas</h3>
        <p className="mt-2 text-sm text-slate-600">
          Los valores se cargan desde Google Sheets y pueden variar según
          actualización. Contrastá siempre con la liquidación oficial.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4">
        <h3 className="text-sm font-semibold text-slate-700">Links útiles</h3>
        <ul className="mt-2 text-sm text-slate-600 space-y-1">
          <li>
            <a className="text-sky-700 hover:underline" href="https://github.com/lautaroadelfino-hub/calculadora-tandil" target="_blank" rel="noreferrer">
              Código en GitHub
            </a>
          </li>
          <li>
            <a className="text-sky-700 hover:underline" href="https://formspree.io/f/mrbonwdv" target="_blank" rel="noreferrer">
              Bandeja de reportes (Formspree)
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}
