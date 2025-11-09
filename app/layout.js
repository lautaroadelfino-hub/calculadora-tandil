// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import AuthNavFloating from "../components/AuthNavFloating";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Calculadora de Sueldos – Tandil",
  description: "Cálculo rápido de remunerativos, no remunerativos y deducciones",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased bg-pattern min-h-screen">
        <AuthNavFloating />

        {/* FULL-WIDTH: sin max-width ni centrado */}
        <div className="relative z-0 w-full px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <main className="space-y-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
