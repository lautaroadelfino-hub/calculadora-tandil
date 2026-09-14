// app/calcular/[convenioId]/layout.js
// Decide, ANTES de empezar a mandar la página, si el convenio existe: el 404
// de un id inventado tiene que ser un 404 de verdad (código HTTP), y una vez
// que el servidor empezó a transmitir la página (loading.js la envuelve en
// una frontera de Suspense) el código ya no se puede cambiar. Acá también va
// la metadata, que usa la misma lectura. Si Firestore no responde, no se
// decide nada: la página muestra su aviso y ofrece recargar.
import { notFound } from "next/navigation";
import { convenioCacheado, esIdDeConvenio } from "@/lib/datosCalculadora";
import { metadataDeConvenio } from "@/lib/metadataConvenio";

export const runtime = "edge";

export async function generateMetadata({ params }) {
  const { convenioId } = await params;
  let convenio = null;
  try {
    if (esIdDeConvenio(convenioId)) convenio = await convenioCacheado(convenioId);
  } catch {
    // Sin red: queda "Calculadora", que es verdad igual.
  }
  return metadataDeConvenio(convenio, convenioId);
}

export default async function LayoutCalculadora({ params, children }) {
  const { convenioId } = await params;
  if (!esIdDeConvenio(convenioId)) notFound();
  try {
    const convenio = await convenioCacheado(convenioId);
    if (!convenio) notFound();
  } catch (error) {
    // notFound() se implementa lanzando: hay que dejarlo pasar. Lo demás es
    // Firestore que no respondió, y de eso se encarga la página.
    if (error && typeof error.digest === "string" && error.digest.startsWith("NEXT_")) throw error;
  }
  return children;
}
