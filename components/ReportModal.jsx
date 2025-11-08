"use client";
import { useState, useMemo } from "react";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mrbonwdv";

export default function ReportModal({ open, onClose, context }) {
  const [email, setEmail] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [adjuntarCtx, setAdjuntarCtx] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // "ok" | "err" | null

  const resumen = useMemo(() => {
    if (!adjuntarCtx || !context) return "";
    const {
      sector, subRegimen, mes, categoria, regimen, aniosAntiguedad,
      titulo, funcion, horas50, horas100, descuentosExtras, noRemunerativo, r
    } = context;

    const money = (v)=>
      new Intl.NumberFormat("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v||0);

    return [
      `URL: ${typeof window !== "undefined" ? window.location.href : "-"}`,
      `Sector: ${sector}`,
      `Sub-régimen: ${subRegimen || "-"}`,
      `Mes: ${mes || "-"}`,
      `Categoría: ${categoria || "-"}`,
      `Régimen: ${regimen || "-"}`,
      `Antigüedad: ${aniosAntiguedad || 0}`,
      `Título: ${titulo || "-"}`,
      `Función %: ${funcion || 0}`,
      `Horas 50%: ${horas50 || 0}`,
      `Horas 100%: ${horas100 || 0}`,
      `Descuentos extra: ${descuentosExtras || 0}`,
      `No remunerativo: ${noRemunerativo || 0}`,
      r ? `>>> Resultado: Rem=${money(r.totalRemunerativo)} | NoRem=${money(r.totalNoRemunerativo)} | Deducciones=${money(r.totalDeducciones)} | Líquido=${money(r.liquido)}` : ""
    ].join("\n");
  }, [adjuntarCtx, context]);

  if (!open) return null;

  async function enviar(e) {
    e?.preventDefault?.();
    if (!descripcion.trim()) {
      setStatus("err");
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const body = {
        email: email || undefined,
        message: descripcion,
        contexto: resumen || undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "-",
      };
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Formspree error");
      setStatus("ok");
      setDescripcion("");
      setEmail("");
    } catch (err) {
      setStatus("err");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">Reportar error / sugerencia</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>

        <form onSubmit={enviar} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Tu email (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              className="w-full rounded-lg border px-3 py-2 outline-none bg-white/80 border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Descripción (qué pasó, categoría/mes, etc.)
            </label>
            <textarea
              value={descripcion}
              onChange={(e)=>setDescripcion(e.target.value)}
              placeholder="Ej: En Obras Sanitarias, categoría 3, mes 2025-10 el presentismo no coincide..."
              className="w-full min-h-[120px] rounded-lg border px-3 py-2 outline-none bg-white/80 border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={adjuntarCtx}
              onChange={(e)=>setAdjuntarCtx(e.target.checked)}
            />
            Adjuntar parámetros y resultados al reporte
          </label>

          {adjuntarCtx && (
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-auto max-h-40 whitespace-pre-wrap">
              {resumen}
            </pre>
          )}

          {status==="ok" && (
            <p className="text-green-600 text-sm">¡Gracias! Tu reporte fue enviado.</p>
          )}
          {status==="err" && (
            <p className="text-red-600 text-sm">⚠️ Error al enviar. Revisá la descripción o probá de nuevo.</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {sending ? "Enviando…" : "Enviar reporte"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              Cerrar
            </button>
          </div>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Se envía a Formspree; tu email es opcional y no se muestra públicamente.
        </p>
      </div>
    </div>
  );
}
