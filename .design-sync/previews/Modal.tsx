import { Modal, Boton } from "liquidar-ui";

const campo = "mt-1 w-full rounded-lg border px-3 py-2 outline-none border-slate-200";

export const ReportarError = () => (
  <div style={{ position: "relative", width: 720, height: 520 }}>
    <Modal
      abierto
      titulo="Reportar error / sugerencia"
      descripcion="Contanos qué no funcionó o qué te gustaría mejorar. Va junto con los datos de la cuenta que tenés en pantalla."
      acciones={
        <>
          <Boton variante="secundario" tamano="sm">Cancelar</Boton>
          <Boton tamano="sm">Enviar reporte</Boton>
        </>
      }
    >
      <label className="block">
        <span className="block text-sm font-medium text-slate-700">Tu email (opcional)</span>
        <input type="email" className={campo} placeholder="tu@email.com" readOnly />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700">Descripción</span>
        <textarea className={`${campo} min-h-[100px]`} placeholder="Ej: la antigüedad de Vendedor B con 5 años no coincide con mi recibo de agosto 2026…" readOnly />
      </label>
    </Modal>
  </div>
);
