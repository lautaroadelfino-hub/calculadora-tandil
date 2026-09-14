// app/not-found.js
// La página que no existe, con la cara del sitio. Antes salía la pantalla
// negra del framework, en inglés, sin ningún camino de vuelta.
export const metadata = { title: "Página no encontrada" };

export default function NoEncontrada() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Error 404</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">No encontramos esta página</h1>
      <p className="mt-3 text-sm text-slate-600">
        La dirección puede estar mal escrita, o la página se movió. Las calculadoras están todas en la portada.
      </p>
      <a
        href="/"
        className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        Ver las calculadoras
      </a>
    </div>
  );
}
