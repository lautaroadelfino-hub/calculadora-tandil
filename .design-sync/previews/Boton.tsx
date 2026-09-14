import { Boton } from "liquidar-ui";

export const Primario = () => (
  <div style={{ width: 360 }}>
    <Boton ancho>Calcular liquidación</Boton>
  </div>
);

export const Variantes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <Boton tamano="sm">Recalcular</Boton>
    <Boton variante="secundario" tamano="sm">Descargar CSV de este mes</Boton>
    <Boton variante="enlace">Copiar link de esta simulación</Boton>
    <Boton variante="peligro" tamano="sm">Quitar</Boton>
  </div>
);

export const Deshabilitado = () => (
  <div style={{ display: "flex", gap: 12 }}>
    <Boton disabled>Enviando…</Boton>
    <Boton variante="secundario" tamano="sm" disabled>Guardar cambios</Boton>
  </div>
);
