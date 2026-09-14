import { EncabezadoRecibo } from "liquidar-ui";

export const Normal = () => (
  <div style={{ width: 560 }}>
    <EncabezadoRecibo subtitulo="Camioneros · Agosto 2026" />
  </div>
);

export const Desactualizado = () => (
  <div style={{ width: 560 }}>
    <EncabezadoRecibo subtitulo="Empleados de Comercio · Septiembre 2026" desactualizado />
  </div>
);
