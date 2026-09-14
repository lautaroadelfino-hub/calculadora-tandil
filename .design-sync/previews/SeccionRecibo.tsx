import { SeccionRecibo, LineaRecibo } from "liquidar-ui";

export const Haberes = () => (
  <div style={{ width: 520 }}>
    <SeccionRecibo titulo="Haberes remunerativos">
      <LineaRecibo concepto="Sueldo Básico" importe={1075910.44} explicacion="Escala del convenio: $1.075.910,44" />
      <LineaRecibo concepto="Antigüedad" importe={53795.52} explicacion="1% × 5 años = 5% sobre $1.075.910,44 (el básico)" />
    </SeccionRecibo>
  </div>
);

export const NoRemunerativos = () => (
  <div style={{ width: 520 }}>
    <SeccionRecibo titulo="Haberes no remunerativos" tono="celeste">
      <LineaRecibo tipo="no_remunerativo" sinIncidencia concepto="Comida (ítem 4.1.12) (22 días)" importe={362189.3} explicacion="22 días × $16.463,15" />
      <LineaRecibo tipo="no_remunerativo" sinIncidencia concepto="Viático especial (ítem 4.1.13) (22 días)" importe={181745.96} explicacion="22 días × $8.261,18" />
    </SeccionRecibo>
  </div>
);

export const Descuentos = () => (
  <div style={{ width: 520 }}>
    <SeccionRecibo titulo="Descuentos y retenciones" tono="rosa">
      <LineaRecibo tipo="retencion" concepto="Jubilación (11%)" importe={124267.66} explicacion="11% sobre $1.129.705,96 (remunerativo, con los topes del art. 9)" />
      <LineaRecibo tipo="retencion" concepto="Obra Social (3%)" importe={33891.18} explicacion="3% sobre $1.129.705,96 (remunerativo + no remunerativo con incidencia, con los topes del art. 9)" />
      <LineaRecibo tipo="retencion" concepto="Contribución solidaria (2%, tope Ley 27.802)" importe={22594.12} explicacion="2% sobre $1.129.705,96 (remuneración habitual, sin horas extras, SAC ni vacaciones; sólo no afiliados)" />
    </SeccionRecibo>
  </div>
);

export const ConNota = () => (
  <div style={{ width: 520 }}>
    <SeccionRecibo titulo="Contribuciones a cargo del empleador" tono="indigo" nota="Van antes del bruto, como manda el Decreto 407/2026.">
      <LineaRecibo concepto="SIPA (jubilación)" importe={120915.04} explicacion="10,77% sobre $1.122.702,28 (remunerativo − detracción)" />
    </SeccionRecibo>
  </div>
);
