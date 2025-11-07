// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Calculadora de Sueldos – Tandil",
  description: "Cálculo rápido de remunerativos, no remunerativos y deducciones",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased bg-pattern">{children}</body>
    </html>
  );
}
