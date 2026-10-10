// app/calcular/[convenioId]/page.jsx
// La página de una calculadora se arma en el servidor (edge de Cloudflare):
// lee el convenio y sus tablas por la API REST de Firestore y entrega el HTML
// con el formulario ya listo. El navegador no descarga el SDK de Firebase ni
// espera a que abra el canal: antes, "Cargando las escalas…" duraba dos o tres
// segundos en cada visita. Las lecturas se cachean en el edge un minuto (ver
// lib/firestoreRest.js). El 404 de un convenio inexistente y la metadata los
// resuelve layout.js, con la misma lectura del convenio.
//
// Desde el 10/10/2026 la página lleva también un encabezado con palabras
// clave ("Calculadora de sueldo de Camioneros") y, debajo de la calculadora,
// un texto con qué calcula y preguntas frecuentes, todo armado acá, en el
// servidor, desde los datos cargados (lib/textoConvenio.js): es lo que Google
// lee, y se actualiza solo cuando el dueño carga un mes nuevo.
import { notFound } from "next/navigation";
import CalculadoraConvenio from "@/components/calculadora/CalculadoraConvenio";
import TextoDeCalculadora from "@/components/calculadora/TextoDeCalculadora";
import EncabezadoConvenio from "@/components/EncabezadoConvenio";
import JsonLd from "@/components/JsonLd";
import {
  cargarDatosDeCalculadora,
  busquedaDesdeSearchParams,
  convenioCacheado,
  acuerdosCacheados,
  LECTOR_REAL,
} from "@/lib/datosCalculadora";
import { acuerdosPublicados } from "@/lib/acuerdosPublicados";
import { parrafoDeConvenio, preguntasFrecuentes } from "@/lib/textoConvenio";
import { jsonLdFaq, jsonLdMigas } from "@/lib/jsonLd";

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
  let acuerdos;
  try {
    // Los acuerdos sólo alimentan el texto: si no se pueden leer, la calculadora sale igual.
    [inicial, acuerdos] = await Promise.all([cargarDatosDeCalculadora(convenioId, consulta, lector), acuerdosCacheados().catch(() => [])]);
  } catch (error) {
    console.error("No se pudieron leer los datos del convenio:", error);
    return <SinDatos destino={`/calcular/${encodeURIComponent(convenioId)}${consulta}`} />;
  }
  if (!inicial) notFound();

  const { convenio, periodos, periodoInicial } = inicial;
  const escala = inicial.escalas[periodoInicial] || null;
  const periodoNombre = (periodos.find((p) => p.id === periodoInicial) || {}).nombre || "";
  const ultimoAcuerdo = acuerdosPublicados(acuerdos, { convenioId, limite: 1 })[0] || null;
  const parrafo = parrafoDeConvenio({ convenio, escala, periodoNombre, periodos, ultimoAcuerdo });
  const preguntas = preguntasFrecuentes({ convenio, escala, periodoNombre });
  const titulo = `Calculadora de sueldo de ${convenio.nombre}`;

  return (
    <>
      <JsonLd datos={jsonLdMigas([{ nombre: "Inicio", url: "/" }, { nombre: titulo, url: `/calcular/${encodeURIComponent(convenioId)}` }])} />
      {preguntas.length ? <JsonLd datos={jsonLdFaq(preguntas)} /> : null}
      {/* key: al pasar de un convenio a otro, la calculadora arranca de cero. */}
      <CalculadoraConvenio
        key={convenioId}
        convenioId={convenioId}
        inicial={inicial}
        encabezado={<EncabezadoConvenio convenio={convenio} convenioId={convenioId} activa="calcular" titulo={titulo} />}
        pie={<TextoDeCalculadora convenio={convenio} convenioId={convenioId} parrafo={parrafo} preguntas={preguntas} />}
      />
    </>
  );
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
      <a
        href={destino}
        className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        Recargar
      </a>
    </div>
  );
}
