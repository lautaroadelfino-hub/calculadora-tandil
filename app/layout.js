// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import { Suspense } from "react";              // 👈 agrega esto
import AuthNavFloating from "../components/AuthNavFloating";
import Header from "../components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: { default: "LiquidAR", template: "%s — LiquidAR" },
  description: "Cálculo rápido de tu sueldo",
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
