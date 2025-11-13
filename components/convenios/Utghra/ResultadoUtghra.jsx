import Resultados from "@/components/Resultados";

/**
 * ResultadoUtghra
 * ---------------
 * Wrapper que reutiliza tu componente Resultados.jsx,
 * forzando formato numérico de Argentina.
 */

const money = (v) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

export default function ResultadoUtghra({ resultados }) {
  if (!resultados) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 text-slate-600">
        Completá los parámetros para ver el resultado.
      </section>
    );
  }

  return <Resultados r={resultados} money={money} />;
}
