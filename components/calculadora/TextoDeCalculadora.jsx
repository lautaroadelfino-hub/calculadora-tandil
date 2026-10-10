// components/calculadora/TextoDeCalculadora.jsx
// El bloque de texto debajo de la calculadora: qué calcula y las preguntas
// frecuentes, armados en el servidor desde los datos (lib/textoConvenio.js).
// Las preguntas van en <details> cerrados: el texto está en el HTML igual,
// que es lo que lee Google, y no estorba a quien viene a calcular. No se
// imprime.
import Link from "next/link";
import { fechaCorta } from "@/lib/fechas";

/**
 * @param parrafo    { texto, ultimoAcuerdo } de parrafoDeConvenio()
 * @param preguntas  [{ id, pregunta, respuesta }] de preguntasFrecuentes()
 * @param convenioId para el link al último acuerdo
 */
export default function TextoDeCalculadora({ convenio, convenioId, parrafo, preguntas }) {
  const ua = parrafo.ultimoAcuerdo;
  return (
    <section aria-labelledby="que-calcula" className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-5 sm:p-6 print:hidden">
      <h2 id="que-calcula" className="text-lg font-bold text-slate-900">Qué calcula</h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        {parrafo.texto}
        {ua ? (
          <>
            {" "}Último acuerdo cargado:{" "}
            <Link href={`/acuerdos/${encodeURIComponent(convenioId)}/${ua.slug}`} className="font-medium text-emerald-700 hover:underline">
              {ua.titulo}
            </Link>{" "}
            ({fechaCorta(ua.fecha)}).
          </>
        ) : null}
      </p>

      {preguntas.length ? (
        <>
          <h2 className="mt-6 text-lg font-bold text-slate-900">Preguntas frecuentes sobre el sueldo de {convenio.nombre}</h2>
          <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
            {preguntas.map((p) => (
              <details key={p.id} className="group py-3">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block text-emerald-600 transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                  {p.pregunta}
                </summary>
                <p className="mt-2 pl-5 text-sm leading-relaxed text-slate-700">{p.respuesta}</p>
              </details>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
