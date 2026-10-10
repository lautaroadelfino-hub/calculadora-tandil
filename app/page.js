// app/page.js
// La portada se arma en el servidor (edge de Cloudflare): lee los convenios y
// los acuerdos por la API REST de Firestore y entrega el HTML con las tarjetas
// puestas. El navegador no baja el SDK de Firebase para pintarla. Las
// lecturas se cachean en el edge un minuto (ver lib/firestoreRest.js).
import Portada from "@/components/Portada";
import { listarColeccion } from "@/lib/firestoreRest";
import { ultimoAcuerdoPorConvenio } from "@/lib/acuerdosPublicados";

export const runtime = "edge";

// Lo que la tarjeta y el buscador usan de cada convenio; el resto del
// documento (reglas, inputs) pesa treinta veces más y acá no hace falta.
const CAMPOS_DE_TARJETA = ["nombre", "cct", "sector", "activo", "descripcion", "ultimo_periodo", "ultimo_periodo_nombre"];
// De los acuerdos, sólo lo que hace falta para el chip "Último acuerdo".
const CAMPOS_DE_ACUERDO = ["convenioId", "fecha", "published"];

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
      <Portada
        convenios={convenios.filter((c) => c.activo !== false)}
        ultimosAcuerdos={ultimosAcuerdos}
        fallo={fallo}
      />
    </>
  );
}
