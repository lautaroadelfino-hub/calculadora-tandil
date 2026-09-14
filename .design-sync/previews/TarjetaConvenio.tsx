import { TarjetaConvenio } from "liquidar-ui";

export const LosTresDeHoy = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 240px)", gap: 16 }}>
    <TarjetaConvenio nombre="Camioneros" cct="40/89" escalasHasta="Agosto 2026" color="teal" href="/calcular/camioneros-cct-40-89" />
    <TarjetaConvenio nombre="Empleados de Comercio" cct="130/75" escalasHasta="Septiembre 2026" color="sky" href="/calcular/comercio-cct-130-75" />
    <TarjetaConvenio nombre="Gastronómicos (UTHGRA)" cct="389/04" escalasHasta="Septiembre 2026" color="amber" href="/calcular/gastronomicos-cct-389-04" />
  </div>
);

export const NombreLargo = () => (
  <div style={{ width: 240 }}>
    <TarjetaConvenio nombre="Trabajadores de Casas Particulares (Ley 26.844)" cct="—" escalasHasta="Septiembre 2026" color="violet" />
  </div>
);

export const SinEscalas = () => (
  <div style={{ width: 240 }}>
    <TarjetaConvenio nombre="Construcción (UOCRA)" cct="76/75" color="orange" accion="Ver" />
  </div>
);
