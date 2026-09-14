// app/calcular/[convenioId]/loading.js
// Lo que se ve mientras el servidor arma la calculadora: al tocar una tarjeta
// de la portada, la pantalla responde en el acto en vez de quedarse muda hasta
// que el edge termine de leer Firestore. Es la silueta del formulario y del
// recibo, sin texto que después haya que reemplazar.
export default function CargandoCalculadora() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la calculadora…</span>
      <div className="h-8 w-72 max-w-full rounded-lg bg-slate-200" />
      <div className="mt-2 h-4 w-96 max-w-full rounded bg-slate-200" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="h-[28rem] rounded-2xl border border-slate-200 bg-white" />
        <div className="hidden h-[28rem] rounded-2xl border border-slate-200 bg-white lg:block" />
      </div>
    </div>
  );
}
