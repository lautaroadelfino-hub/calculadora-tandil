import { ComposicionCargas } from "liquidar-ui";

const rubros = [
  { id: "sindical", label: "Sindical", total: 87976.04, porcentaje: 14.4, porcentajeDelCosto: 4.29, empleador: 48415.97, trabajador: 39560.07 },
  { id: "seguridad_social", label: "Seguridad social", total: 342506.42, porcentaje: 56.1, porcentajeDelCosto: 16.7, empleador: 184347.72, trabajador: 158158.7 },
  { id: "obra_social", label: "Obra social", total: 101673.54, porcentaje: 16.65, porcentajeDelCosto: 4.96, empleador: 67782.36, trabajador: 33891.18 },
  { id: "inssjp", label: "I.N.S.S.J.P.", total: 51629.88, porcentaje: 8.46, porcentajeDelCosto: 2.52, empleador: 17738.7, trabajador: 33891.18 },
  { id: "art", label: "A.R.T. + FFEP", total: 58109.3, porcentaje: 9.52, porcentajeDelCosto: 2.83, empleador: 58109.3, trabajador: 0 },
  { id: "camaras", label: "Cámaras y entidades empresariales", total: 0, porcentaje: 0, porcentajeDelCosto: 0, empleador: 0, trabajador: 0 },
  { id: "otros", label: "Otros", total: 424.62, porcentaje: 0.07, porcentajeDelCosto: 0.02, empleador: 424.62, trabajador: 0 },
];

export const Camioneros = () => (
  <div style={{ width: 560 }}>
    <ComposicionCargas rubros={rubros} totalCargas={610319.8} costoLaboral={2050459.88} />
  </div>
);

export const SinPorcentajeDelCosto = () => (
  <div style={{ width: 560 }}>
    <ComposicionCargas rubros={rubros.slice(1, 4).map((r) => ({ ...r, porcentajeDelCosto: null }))} totalCargas={495809.84} costoLaboral={2050459.88} />
  </div>
);
