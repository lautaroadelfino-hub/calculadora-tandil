// components/SinDatos.jsx
// Firestore no respondió: se dice, y se ofrece reintentar en la MISMA
// dirección. No se indexa: una página sin datos no es la página. Lo usan las
// páginas de acuerdos y de novedades por convenio (la calculadora tiene el suyo
// en app/calcular/[convenioId]/page.jsx, con la simulación en la URL).
export default function SinDatos({ titulo, destino }) {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
      <meta name="robots" content="noindex, nofollow" />
      <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
      <a
        href={destino}
        className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        Recargar
      </a>
    </div>
  );
}
