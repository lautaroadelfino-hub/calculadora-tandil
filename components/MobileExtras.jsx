"use client";
import React, { useEffect, useRef } from "react";
import SideRailLeft from "./SideRailLeft";
import SideRailRight from "./AppShell";

export default function MobileExtras({ open, onClose, r, money, onReport }) {
  const panelRef = useRef(null);

  // Cerrar con Esc
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      {/* backdrop */}
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* sheet */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 max-h-[85%] rounded-t-2xl bg-white shadow-2xl p-4 overflow-y-auto"
      >
        <div className="mx-auto h-1 w-12 rounded-full bg-slate-300 mb-3" />
        <h3 className="text-base font-semibold text-slate-800 mb-2">Herramientas</h3>

        {/* Reutilizamos el contenido de los rails */}
        <div className="space-y-4">
          <SideRailLeft />
          <SideRailRight r={r} money={money} onReport={onReport} />
        </div>

        <div className="mt-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-800 text-white py-2.5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
