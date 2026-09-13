// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import { Suspense } from "react";              // 👈 agrega esto
import AuthNavFloating from "../components/AuthNavFloating";
import Header from "../components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// El sitio vive detrás de Cloudflare, así que carga rápido, que es algo que
// Google premia. Lo que faltaba era decirle DE QUÉ se trata: el título era
// "LiquidAR" a secas y la descripción "Cálculo rápido de tu sueldo", que no
// es lo que nadie escribe en el buscador. Un contador busca "calculadora
// sueldo empleados de comercio 2026".
export const metadata = {
  metadataBase: new URL("https://liquidar.ar"),
  title: {
    default: "LiquidAR — Calculadora de sueldos por convenio colectivo",
    template: "%s — LiquidAR",
  },
  description:
    "Calculá tu recibo de sueldo según el convenio colectivo: Empleados de Comercio (CCT 130/75), Gastronómicos (CCT 389/04) y más. Escalas actualizadas, antigüedad, presentismo, SAC, retenciones y estimación de Ganancias. Gratis y sin registrarte.",
  keywords: [
    "calculadora de sueldo",
    "recibo de sueldo",
    "convenio colectivo",
    "empleados de comercio",
    "CCT 130/75",
    "UTHGRA",
    "liquidación de sueldos",
    "paritarias",
    "costo laboral",
    "Argentina",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://liquidar.ar",
    siteName: "LiquidAR",
    title: "LiquidAR — Calculadora de sueldos por convenio colectivo",
    description:
      "Simulá tu recibo de sueldo por convenio, con escalas actualizadas, retenciones y estimación de Ganancias.",
  },
  twitter: {
    card: "summary",
    title: "LiquidAR — Calculadora de sueldos por convenio",
    description: "Simulá tu recibo de sueldo por convenio colectivo argentino.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// 👇 Next 16: themeColor va en viewport, no en metadata
export const viewport = {
  themeColor: "#10B981",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased bg-pattern min-h-screen overflow-x-hidden">
        {/* 👇 Envuelto en Suspense para que no rompa el /404 */}
        <Suspense fallback={null}>
          <AuthNavFloating />
        </Suspense>

        <Header />
        <div className="relative z-0 w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 pt-[var(--h-header)]">
          <main className="space-y-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
