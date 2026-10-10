// components/JsonLd.jsx
// Un bloque de datos estructurados en la página. Es un <script> nativo, no
// next/script: tiene que estar en el HTML del servidor tal cual, que es lo
// que lee Google.
import { serializarJsonLd } from "@/lib/jsonLd";

export default function JsonLd({ datos }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarJsonLd(datos) }} />;
}
