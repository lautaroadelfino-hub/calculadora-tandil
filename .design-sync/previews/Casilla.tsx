import { Casilla } from "liquidar-ui";

export const PreguntaDelConvenio = () => (
  <div style={{ width: 360, display: "grid", gap: 12 }}>
    <Casilla id="larga" label="Sí, aplicar" checked conMarco />
    <Casilla id="combustibles" label="Sí, aplicar" checked={false} conMarco />
  </div>
);

export const OpcionSuelta = () => (
  <div style={{ width: 360, display: "grid", gap: 12 }}>
    <Casilla id="sac" label="Incluir SAC (medio aguinaldo)" checked descripcion="También sube las contribuciones del empleador." />
    <Casilla id="conyuge" label="Cónyuge / conviviente a cargo" checked={false} />
  </div>
);
