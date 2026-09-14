import { LineaRecibo } from "liquidar-ui";

export const Remunerativa = () => (
  <div style={{ width: 520, display: "grid", gap: 6 }}>
    <LineaRecibo concepto="Sueldo Básico" importe={909938.92} explicacion="Escala del convenio: $1.196.632,00 × 36,5/48 hs" />
    <LineaRecibo concepto="Horas Extras 50% (12 hs)" importe={117408.87} explicacion="12 horas × $6.522,72 × 1,5 · valor hora: $1.304.543,60 / 200 hs" />
    <LineaRecibo concepto="SAC (medio aguinaldo)" importe={652271.8} explicacion="50% de $1.304.543,60 (la remuneración habitual del mes)" />
  </div>
);

export const NoRemunerativa = () => (
  <div style={{ width: 520, display: "grid", gap: 6 }}>
    <LineaRecibo tipo="no_remunerativo" concepto="Asignación No Remunerativa Base" importe={120000} explicacion="Escala del convenio: $120.000,00" />
    <LineaRecibo tipo="no_remunerativo" sinIncidencia concepto="Viático por km recorrido (ítem 4.2.4) (8000 km)" importe={688597.52} explicacion="8.000 km × $86,07" />
  </div>
);

export const Retencion = () => (
  <div style={{ width: 520, display: "grid", gap: 6 }}>
    <LineaRecibo tipo="retencion" concepto="Ley 19.032 PAMI (3%)" importe={33891.18} explicacion="3% sobre $1.129.705,96 (remunerativo, con los topes del art. 9)" />
    <LineaRecibo tipo="retencion" concepto="Aporte Fijo OSECAC" importe={100} explicacion="Suma fija" />
    <LineaRecibo tipo="retencion" concepto="Impuesto a las Ganancias (estimado)" importe={84120.33} explicacion="Escala del 27% sobre una base imponible de $310.000,00" />
  </div>
);

export const SinExplicacion = () => (
  <div style={{ width: 520 }}>
    <LineaRecibo concepto="Presentismo" importe={101331.3} />
  </div>
);
