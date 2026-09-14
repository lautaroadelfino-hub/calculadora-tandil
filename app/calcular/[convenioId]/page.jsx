// app/calcular/[convenioId]/page.jsx
// La página de una calculadora se arma en el servidor (edge de Cloudflare):
// lee el convenio y sus tablas por la API REST de Firestore y entrega el HTML
// con el formulario ya listo. El navegador no descarga el SDK de Firebase ni
// espera a que abra el canal: antes, "Cargando las escalas…" duraba dos o tres
// segundos en cada visita. Las lecturas se cachean en el edge un minuto (ver
// lib/firestoreRest.js). El 404 de un convenio inexistente y la metadata los
// resuelve layout.js, con la misma lectura del convenio.
import { notFound } from "next/navigation";
import CalculadoraConvenio from "@/components/calculadora/CalculadoraConvenio";
import {
  cargarDatosDeCalculadora,
  busquedaDesdeSearchParams,
  convenioCacheado,
  LECTOR_REAL,
} from "@/lib/datosCalculadora";

export const runtime = "edge";

export default async function PaginaCalculadora({ params, searchParams }) {
  const [{ convenioId }, busqueda] = await Promise.all([params, searchParams]);
  const consulta = busquedaDesdeSearchParams(busqueda);
  // El documento del convenio ya lo leyó el layout: se reutiliza en vez de pedirlo de nuevo.
  const lector = {
    ...LECTOR_REAL,
    leerDocumento: (ruta) => (ruta === `convenios/${convenioId}` ? convenioCacheado(convenioId) : LECTOR_REAL.leerDocumento(ruta)),
  };
  let inicial;
  try {
    inicial = await cargarDatosDeCalculadora(convenioId, consulta, lector);
  } catch (error) {
    console.error("No se pudieron leer los datos del convenio:", error);
    return <SinDatos destino={`/calcular/${encodeURIComponent(convenioId)}${consulta}`} />;
  }
  if (!inicial) notFound();
  // key: al pasar de un convenio a otro, la calculadora arranca de cero.
  return <CalculadoraConvenio key={convenioId} convenioId={convenioId} inicial={inicial} />;
}

/**
 * Firestore no respondió: se dice, y se ofrece reintentar en la MISMA
 * dirección (con la simulación que traiga la URL). No se indexa: una
 * calculadora sin datos no es la calculadora.
 */
function SinDatos({ destino }) {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
      <meta name="robots" content="noindex, nofollow" />
      <h1 className="text-2xl font-bold text-slate-900">No pudimos traer los datos del convenio</h1>
      <p className="mt-3 text-sm text-slate-600">
        Es un problema de conexión con la base de datos, no de tus datos. Probá recargar la página en unos
        segundos.
      </p>
      <a
        href={destino}
        className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        Recargar
      </a>
    </div>
  );
}
