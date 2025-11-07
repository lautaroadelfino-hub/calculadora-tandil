"use client";
export default function SummaryBar({ neto, money, onShare }) {
  return (
    <div className="fixed bottom-3 inset-x-0 z-30">
      <div className="max-w-6xl mx-auto px-5">
        <div className="bg-white/85 backdrop-blur border border-slate-200 shadow-xl rounded-2xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-slate-500">Líquido a cobrar</div>
            <div className="text-2xl font-bold text-emerald-700 leading-none">
              ${money(neto)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onShare}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800"
            >
              Copiar resultado
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
