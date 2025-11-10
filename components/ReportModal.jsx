"use client";
import React, { useEffect, useRef, useState } from "react";

export default function ReportModal({ open, onClose, triggerRef, context }) {
  const [email, setEmail] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const textareaRef = useRef(null);

  // Cerrar y devolver foco al botón que abrió el modal
  const handleClose = () => {
    onClose?.();
    setTimeout(() => triggerRef?.current?.focus?.(), 0);
  };

  // Cerrar con ESC y foco inicial en textarea
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    // foco inicial
    setTimeout(() => textareaRef.current?.focus?.(), 0);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus trap dentro del modal (Tab y Shift+Tab)
  useEffect(() => {
    if (!open) return;
    const root = panelRef.current;
    if (!root) return;

    const selector =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getNodes = () => Array.from(root.querySelectorAll(selector)).filter((n) => !n.hasAttribute("disabled"));

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const nodes = getNodes();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Click fuera del panel cierra
  const onBackdropClick = (e) => {
    if (e.target === backdropRef.current) handleClose();
  };

  // Enviar a Formspree (JSON)
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setMsg("Por favor, contanos brevemente el problema.");
      textareaRef.current?.focus?.();
      return;
    }

    setSending(true);
    setMsg("");

    try {
      const payload = {
        email: email || undefined,
        descripcion,
        contexto: JSON.stringify(
          {
            sector: context?.sector,
            convenio: context?.convenio,
            subRegimen: context?.subRegimen,
            mes: context?.mes,
            categoria: context?.categoria,
            regimen: context?.regimen,
            aniosAntiguedad: context?.aniosAntiguedad,
            titulo: context?.titulo,
            funcion: context?.funcion,
            horas50: context?.horas50,
            horas100: context?.horas100,
            descuentosExtras: context?.descuentosExtras,
            noRemunerativo: context?.noRemunerativo,
            resultado: context?.r,
          },
          null,
          2
        ),
      };

      const res = await fetch("https://formspree.io/f/manaynzy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo enviar el reporte.");
      }

      setMsg("¡Gracias! Recibimos tu reporte correctamente.");
      setDescripcion("");
      setEmail("");

      // Cerrar tras un respiro y devolver foco
      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (err) {
      setMsg(err.message || "Error al enviar. Probá nuevamente.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onMouseDown={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      aria-describedby="report-desc"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        ref={panelRef}
        role="document"
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5 outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="report-title" className="text-lg font-semibold text-slate-800">
              Reportar error / sugerencia
            </h2>
            <p id="report-desc" className="text-sm text-slate-500 mt-1">
              Contanos qué no funcionó o qué te gustaría mejorar. Incluimos contexto técnico para ayudarte más rápido.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700">Tu email (opcional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none border-slate-200 focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700">Descripción</span>
            <textarea
              ref={textareaRef}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none border-slate-200 focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              placeholder="Ej: El presentismo de SISP en 2025-10 categoría 8 no coincide..."
              required
            />
          </label>

          {/* Contexto como vista previa (solo lectura) */}
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <summary className="cursor-pointer select-none font-medium text-slate-700">
              Ver contexto técnico que se enviará
            </summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
{JSON.stringify(
  {
    sector: context?.sector,
    convenio: context?.convenio,
    subRegimen: context?.subRegimen,
    mes: context?.mes,
    categoria: context?.categoria,
    regimen: context?.regimen,
    aniosAntiguedad: context?.aniosAntiguedad,
    titulo: context?.titulo,
    funcion: context?.funcion,
    horas50: context?.horas50,
    horas100: context?.horas100,
    descuentosExtras: context?.descuentosExtras,
    noRemunerativo: context?.noRemunerativo,
    resultado: context?.r,
  },
  null,
  2
)}
            </pre>
          </details>

          {msg && (
            <p
              className={`text-sm ${
                msg.startsWith("¡Gracias") ? "text-green-700" : "text-amber-700"
              }`}
              role="status"
            >
              {msg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {sending ? "Enviando…" : "Enviar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
