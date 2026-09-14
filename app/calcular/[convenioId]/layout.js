// app/calcular/[convenioId]/layout.js
// Un layout de servidor sólo para el título de la pestaña: la página es un
// componente de cliente y no puede exportar metadata. El nombre del convenio se
// lee por la API REST pública de Firestore (las reglas permiten leer
// convenios sin sesión) y se cachea una hora.
import { convenioDesdeRest, metadataDeConvenio } from "@/lib/metadataConvenio";

export const runtime = "edge";

export async function generateMetadata({ params }) {
  const { convenioId } = await params;
  let convenio = null;
  try {
    const proyecto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const url = `https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents/convenios/${encodeURIComponent(convenioId)}`;
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (r.ok) convenio = convenioDesdeRest(await r.json());
  } catch {
    // Sin red o sin documento: queda "Calculadora", que es verdad igual.
  }
  return metadataDeConvenio(convenio, convenioId);
}

export default function LayoutCalculadora({ children }) {
  return children;
}
