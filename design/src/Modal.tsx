import type { ReactNode } from "react";

export interface ModalProps {
  /** Si no está abierto no se dibuja nada. */
  abierto: boolean;
  titulo: string;
  /** La línea gris debajo del título. */
  descripcion?: string;
  onCerrar?: () => void;
  children: ReactNode;
  /** Los botones del pie, alineados a la derecha (Cancelar, Enviar). */
  acciones?: ReactNode;
}

/** El cuadro modal de LiquidAR (el de "Reportar error / sugerencia"): fondo oscurecido, panel blanco redondeado, título con ✕, contenido y acciones. En la app se monta en document.body por encima de la barra. */
export function Modal({ abierto, titulo, descripcion, onCerrar, children, acciones }: ModalProps) {
  if (!abierto) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-titulo" className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div role="document" className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-titulo" className="text-lg font-semibold text-slate-800">{titulo}</h2>
            {descripcion ? <p className="text-sm text-slate-500 mt-1">{descripcion}</p> : null}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        {acciones ? <div className="flex items-center justify-end gap-2 pt-4">{acciones}</div> : null}
      </div>
    </div>
  );
}
