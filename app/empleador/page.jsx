// app/empleador/page.jsx
//
// El Panel Empleador se retiró el 13/9/2026. Desde el Decreto 407/2026 el
// costo laboral total tiene que figurar en el recibo (art. 140 inc. j) LCT,
// Ley 27.802), así que lo que este panel calculaba pasó a ser una sección del
// recibo de cada convenio, en /calcular/<convenio>, con la tabla de
// contribuciones del período cargada desde /admin.
//
// La URL se conserva para no romper los links que ya circulan (novedades,
// buscadores, gente que la guardó): redirige a la portada con un 308.
import { permanentRedirect } from "next/navigation";

export const runtime = "edge";

export default function PanelEmpleadorRetirado() {
  permanentRedirect("/");
}
