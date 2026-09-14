export interface EncabezadoReciboProps {
  /** "Simulación de recibo". */
  titulo?: string;
  /** "Camioneros · Agosto 2026": el convenio y el período CON EL QUE SE CALCULÓ. */
  subtitulo: string;
  /** El sello de la derecha. */
  sello?: string;
  /** Si la persona tocó el formulario después de calcular: aparece la franja ámbar con "Recalcular" y quien la muestre atenúa el detalle de abajo. */
  desactualizado?: boolean;
  onRecalcular?: () => void;
}

/** La cabecera oscura del recibo, con el sello "Estimado", y la franja "Cambiaste datos" cuando el recibo ya no corresponde a lo que dice el formulario. */
export function EncabezadoRecibo({ titulo = "Simulación de recibo", subtitulo, sello = "Estimado", desactualizado = false, onRecalcular }: EncabezadoReciboProps) {
  return (
    <div className="rounded-t-2xl overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">{titulo}</h2>
          <p className="text-xs text-slate-300 mt-0.5">{subtitulo}</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 rounded-full px-3 py-1">{sello}</span>
      </div>
      {desactualizado ? (
        <div role="status" className="bg-amber-50 border-b border-amber-300 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
          <span><b>Cambiaste datos.</b> Este recibo es de los datos anteriores.</span>
          <button type="button" onClick={onRecalcular} className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-amber-700">
            Recalcular
          </button>
        </div>
      ) : null}
    </div>
  );
}
