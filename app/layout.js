export const metadata = {
  title: "Calculadora de Sueldos - Tandil",
  description: "Cálculo detallado de remuneraciones para administración central, obras sanitarias, SISP y comercio.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-slate-100 min-h-screen text-slate-800">{children}</body>
    </html>
  );
}

