import { Chip } from "liquidar-ui";

export const EnUnaTarjeta = () => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    <Chip>CCT 40/89</Chip>
    <Chip tono="verde">Escalas hasta Agosto 2026</Chip>
  </div>
);

export const Tonos = () => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    <Chip tono="neutro">CCT 130/75</Chip>
    <Chip tono="verde">Escalas hasta Septiembre 2026</Chip>
    <Chip tono="indigo">Empleador</Chip>
    <Chip tono="celeste">sin incidencia</Chip>
    <Chip tono="ambar">Estimada</Chip>
    <Chip tono="rosa">Descuento</Chip>
  </div>
);
