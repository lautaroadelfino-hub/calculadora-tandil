// app/layout.js
import "./globals.css";
import { Suspense } from "react";
import AuthNavFloating from "../components/AuthNavFloating";
import Header from "../components/Header";
import Analitica from "../components/Analitica";
import { IMAGEN_PARA_COMPARTIR } from "../lib/metadataConvenio";

// El sitio vive detrás de Cloudflare, así que carga rápido, que es algo que
// Google premia. Lo que faltaba era decirle DE QUÉ se trata: el título era
// "LiquidAR" a secas y la descripción "Cálculo rápido de tu sueldo", que no
// es lo que nadie escribe en el buscador. Un contador busca "calculadora
// sueldo empleados de comercio 2026".
//
// QUÉ CAMBIÓ Y POR QUÉ (10/10/2026): Google tenía indexada UNA sola página,
// la portada. Acá había un canonical "/" y un openGraph con la url de la
// portada que heredaban todas las páginas sin metadata propia: /novedades le
// decía a Google que era una copia de la portada, y al compartir cualquier
// página salía el título general. Ahora cada página declara su canonical y su
// url (lib/metadataConvenio.js, metadataDePagina) y acá queda sólo lo común.
// También se fueron los íconos PNG que no existían en public/brand/ y la
// fuente Inter, que se descargaba y no se usaba (globals.css fija la del
// sistema).
export const metadata = {
  metadataBase: new URL("https://liquidar.ar"),
  title: {
    default: "LiquidAR — Calculadora de sueldos por convenio colectivo",
    template: "%s — LiquidAR",
  },
  description:
    "Calculadora de sueldo por convenio colectivo: Camioneros (CCT 40/89), Empleados de Comercio (CCT 130/75) y Gastronómicos UTHGRA (CCT 389/04). Escalas actualizadas, antigüedad, horas extras, aguinaldo, aportes y costo del empleador. Gratis y sin registro.",
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
  // Los íconos y la imagen para compartir viven en public/brand/ como archivos
  // estáticos: el adaptador de Cloudflare no acepta app/apple-icon.png ni
  // app/opengraph-image.png (los toma como rutas sin runtime edge).
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "LiquidAR",
    images: [IMAGEN_PARA_COMPARTIR],
  },
};

// 👇 Next 16: themeColor va en viewport, no en metadata
export const viewport = {
  themeColor: "#10B981",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased min-h-screen overflow-x-hidden">
        {/* Primera parada del tabulador: saltar la barra e ir al contenido. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Saltar al contenido
        </a>
        {/* 👇 Envuelto en Suspense para que no rompa el /404 */}
        <Suspense fallback={null}>
          <AuthNavFloating />
        </Suspense>

        <Header />
        {/* La barra es sticky y ya ocupa su lugar: acá no se le reserva altura.
            Antes había un pt-[var(--h-header)] que dejaba una banda vacía de
            más de 130 px debajo de la barra (C11 de la auditoría del 23/9/2026). */}
        <div className="relative z-0 w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 print:p-0">
          <main id="contenido" className="space-y-6">{children}</main>
        </div>
        <Analitica />
      </body>
    </html>
  );
}
