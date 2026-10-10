// app/page.js
// La portada se arma en el servidor (edge de Cloudflare): lee los convenios y
// los acuerdos por la API REST de Firestore y entrega el HTML con las tarjetas
// puestas. El navegador no baja el SDK de Firebase para pintarla. Las
// lecturas se cachean en el edge un minuto (ver lib/firestoreRest.js).
import Portada from "@/components/Portada";
import JsonLd from "@/components/JsonLd";
import { listarColeccion } from "@/lib/firestoreRest";
import { ultimoAcuerdoPorConvenio } from "@/lib/acuerdosPublicados";
import { ordenarConvenios } from "@/lib/directorio";
import { metadataDePagina, tituloDeConvenio } from "@/lib/metadataConvenio";
import { jsonLdSitio } from "@/lib/jsonLd";

export const runtime = "edge";

// Lo que la tarjeta y el buscador usan de cada convenio; el resto del
// documento (reglas, inputs) pesa treinta veces más y acá no hace falta.
const CAMPOS_DE_TARJETA = ["nombre", "cct", "sector", "activo", "descripcion", "ultimo_periodo", "ultimo_periodo_nombre"];
// De los acuerdos, sólo lo que hace falta para el chip "Último acuerdo".
const CAMPOS_DE_ACUERDO = ["convenioId", "fecha", "published"];

const DESCRIPCION_FIJA =
  "Calculadora de sueldo por convenio colectivo: Camioneros (CCT 40/89), Empleados de Comercio (CCT 130/75) y Gastronómicos UTHGRA (CCT 389/04). Escalas actualizadas, antigüedad, horas extras, aguinaldo, aportes y costo del empleador. Gratis y sin registro.";

/**
 * La descripción nombra los convenios que hay cargados, en vez de una lista
 * escrita a mano que envejece. Misma lectura (misma máscara) que la página,
 * así Next no la repite.
 */
export async function generateMetadata() {
  let description = DESCRIPCION_FIJA;
  try {
    const convenios = ordenarConvenios((await listarColeccion("convenios", { campos: CAMPOS_DE_TARJETA })).filter((c) => c.activo !== false));
    if (convenios.length) {
      const nombres = convenios.map((c) => tituloDeConvenio(c)).join(", ");
      const mes = convenios.find((c) => c.ultimo_periodo_nombre)?.ultimo_periodo_nombre;
      description = `Calculadora de sueldo por convenio colectivo: ${nombres}. Escalas ${mes ? `de ${mes}` : "actualizadas"}, antigüedad, horas extras, aguinaldo, aportes y costo del empleador. Gratis y sin registro.`;
    }
  } catch {
    // Sin red: queda la descripción fija.
  }
  return metadataDePagina({ description, canonical: "/" });
}

export default async function Home() {
  let convenios = [];
  let ultimosAcuerdos = {};
  let fallo = false;
  try {
    const [lista, acuerdos] = await Promise.all([
      listarColeccion("convenios", { campos: CAMPOS_DE_TARJETA }),
      // Si los acuerdos no se pueden leer, la portada sale igual, sin el chip.
      listarColeccion("acuerdos", { campos: CAMPOS_DE_ACUERDO }).catch(() => []),
    ]);
    convenios = lista;
    ultimosAcuerdos = ultimoAcuerdoPorConvenio(acuerdos);
  } catch (error) {
    // Un error de red no es lo mismo que "todavía no hay convenios publicados":
    // la portada lo distingue y ofrece recargar.
    console.error("No se pudieron leer los convenios:", error);
    fallo = true;
  }
  return (
    <>
      {/* Una portada sin datos por un fallo de red no es la portada: que Google no la indexe. */}
      {fallo ? <meta name="robots" content="noindex, nofollow" /> : null}
      <JsonLd datos={jsonLdSitio()} />
      <Portada
        convenios={convenios.filter((c) => c.activo !== false)}
        ultimosAcuerdos={ultimosAcuerdos}
        fallo={fallo}
      />
    </>
  );
}
