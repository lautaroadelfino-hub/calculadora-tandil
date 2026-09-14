import { BandaResumen } from "liquidar-ui";

export const Completa = () => (
  <div style={{ width: 640 }}>
    <BandaResumen
      neto={1442051.5}
      brutoMasNoRemunerativo={1673641.22}
      costoLaboral={2050459.88}
      notaCosto="Lo que paga el empleador por mes. Al año, unos $26.655.978,44 (12 meses más el aguinaldo)."
    />
  </div>
);

export const SinTablaDeContribuciones = () => (
  <div style={{ width: 640 }}>
    <BandaResumen neto={1166309.23} brutoMasNoRemunerativo={1426346.94} costoLaboral={null} />
  </div>
);

