import { TablaEmpleador } from "liquidar-ui";

const filas = [
  { concepto: "SIPA (jubilación)", base: 1122702.28, baseLabel: "Remunerativo − detracción", unidad: "porcentaje" as const, alicuota: 0.1077, importe: 120915.04 },
  { concepto: "INSSJP (PAMI)", base: 1122702.28, baseLabel: "Remunerativo − detracción", unidad: "porcentaje" as const, alicuota: 0.0158, importe: 17738.7 },
  { concepto: "Asignaciones familiares", base: 1122702.28, baseLabel: "Remunerativo − detracción", unidad: "porcentaje" as const, alicuota: 0.047, importe: 52767.01 },
  { concepto: "Fondo Nacional de Empleo", base: 1122702.28, baseLabel: "Remunerativo − detracción", unidad: "porcentaje" as const, alicuota: 0.0095, importe: 10665.67 },
  { concepto: "Obra social (contribución 6%)", base: 1129705.96, baseLabel: "Remunerativo + no remunerativo con incidencia", unidad: "porcentaje" as const, alicuota: 0.06, importe: 67782.36 },
  { concepto: "FFEP (Fondo Fiduciario de Enfermedades Profesionales)", base: null, baseLabel: "Suma fija por trabajador", unidad: "suma_fija" as const, importe: 1624 },
  { concepto: "Seguro Colectivo de Vida Obligatorio", base: null, baseLabel: "Suma fija por trabajador", unidad: "suma_fija" as const, importe: 424.62 },
  { concepto: "ART (estimada)", base: 1129705.96, baseLabel: "Remunerativo", unidad: "porcentaje" as const, alicuota: 0.05, importe: 56485.3 },
  { concepto: "Aporte empresario actividades sociales y culturales (2% del básico, ítem 8.1.2)", base: 1075910.44, baseLabel: "Sueldo básico", unidad: "porcentaje" as const, alicuota: 0.02, importe: 21518.21 },
];

export const Escritorio = () => (
  <div style={{ width: 640 }}>
    <TablaEmpleador
      filas={filas}
      subtotal={376818.66}
      brutoMasNoRemunerativo={1673641.22}
      costoLaboral={2050459.88}
      nota="Detracción Ley 27.541 aplicada: $7.003,68. La ART es estimada: cada empleador negocia su alícuota."
    />
  </div>
);


export const ArtSinDato = () => (
  <div style={{ width: 640 }}>
    <TablaEmpleador
      filas={[filas[0], { concepto: "ART (estimada)", base: 1129705.96, baseLabel: "Remunerativo", unidad: "porcentaje", alicuota: null, importe: 0, pendiente: true }]}
      subtotal={120915.04}
      brutoMasNoRemunerativo={1673641.22}
      costoLaboral={1794556.26}
      nota="No se informó la alícuota de ART: la fila queda pendiente y el costo sale sin ella."
    />
  </div>
);
