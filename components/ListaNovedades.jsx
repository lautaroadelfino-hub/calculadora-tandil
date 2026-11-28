// components/ListaNovedades.jsx
// Las novedades armadas como la tapa de un diario: la más nueva va grande y
// las demás en recuadros, todos adentro de una misma grilla separada por
// líneas finas. Cada recuadro lleva su sección arriba (el convenio), la
// fecha, el título (con link si lo tiene) y el detalle. Componente de
// servidor; lo usan /novedades y /novedades/<convenio>.
//
// POR QUÉ EXISTE: /novedades se armaba en el navegador con el SDK de Firebase
// (150 KB) y el HTML del servidor traía sólo tres bloques grises: Google no
// veía ninguna novedad. Y el tag se mostraba crudo ("release"), cosa que marcó
// la auditoría del 5/10/2026.
//
// La forma de tapa es del 27/11/2026: el dueño la pidió "tipo diario, con
// cuadrados" cuando vio las primeras once en una lista. El diseño está en
// Claude Design ("Novedades tipo diario — LiquidAR").
//
// Los títulos con link no van subrayados, como en la tapa de un diario: con
// casi todos enlazados, once subrayados eran ruido. Se subrayan al pasar el
// mouse o al llegar con el teclado. (En la lista anterior sí iban subrayados,
// para distinguir el que llevaba a algún lado del que no.)
import Link from "next/link";
import { fechaLarga } from "@/lib/fechas";

export const ETIQUETA_DE_TAG = { release: "Novedad", acuerdo: "Acuerdo paritario", aviso: "Aviso" };
// "Novedad" no se pinta: en esta página todo lo es. Los otros dos sí dicen algo.
const CHIP_DE_TAG = {
  acuerdo: "border-sky-200 bg-sky-50 text-sky-800",
  aviso: "border-amber-200 bg-amber-50 text-amber-800",
};
const TITULAR = "decoration-emerald-600 decoration-2 underline-offset-4 hover:text-emerald-800 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";
const SECCION = "text-xs font-bold uppercase tracking-wide";
/** La sección de lo que no es de ningún convenio: los cambios del sitio y de la calculadora. */
const SECCION_GENERAL = "El sitio";

// Las clases van escritas enteras: Tailwind sólo genera las que encuentra así.
const EN_TABLET = { 1: "md:col-span-1", 2: "md:col-span-2" };
const EN_COMPU = { 1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3" };

/**
 * "$ 50.000" y "1,7 %" como los escriba el dueño, pero sin que el signo quede
 * en un renglón y el número en el siguiente: el espacio pasa a ser uno que no
 * se corta.
 */
const sinCortes = (texto) => String(texto || "").replace(/\$ (?=\d)/g, "$\u00a0").replace(/(\d) %/g, "$1\u00a0%");

/**
 * El lugar del recuadro `i` entre `total`: cuántas columnas ocupa en la tablet
 * (dos columnas) y en la compu (tres).
 *
 * La nota principal ocupa dos columnas y la que sigue va a su derecha. El
 * resto va de a tres por fila (de a dos en la tablet, debajo de la principal).
 * El último recuadro se estira hasta el borde: una grilla con líneas no puede
 * terminar en un hueco.
 *
 * La principal no toma dos filas. Se probó, con las dos siguientes apiladas a
 * su derecha: sin foto, le quedaba medio recuadro en blanco, que parecía una
 * imagen que no había cargado.
 */
export function lugarEnLaTapa(i, total) {
  if (i === 0) return { principal: true, tablet: 2, compu: total === 1 ? 3 : 2 };
  if (i !== total - 1) return { principal: false, tablet: 1, compu: 1 };
  // En la tablet, debajo de la principal van todos los demás de a dos.
  const tablet = (total - 1) % 2 === 1 ? 2 : 1;
  // En la compu, debajo de la principal y su vecina va el resto de a tres.
  const sobran = total > 2 ? (total - 2) % 3 : 0;
  return { principal: false, tablet, compu: sobran === 1 ? 3 : sobran === 2 ? 2 : 1 };
}

/**
 * @param novedades        ya filtradas y ordenadas (lib/novedadesPublicadas.js): la primera es la principal
 * @param nombresDeConvenio { convenioId: nombre }, en la página general: cada recuadro
 *                          dice de qué convenio es y lleva a sus novedades. En la página
 *                          de un convenio no se pasa, y la sección no se repite.
 */
export default function ListaNovedades({ novedades, nombresDeConvenio = {} }) {
  const conSeccion = Object.keys(nombresDeConvenio).length > 0;
  const total = novedades.length;
  return (
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-3">
      {novedades.map((n, i) => {
        const { principal, tablet, compu } = lugarEnLaTapa(i, total);
        const tag = String(n.tag || "").toLowerCase();
        const externa = n.url ? /^https?:\/\//i.test(n.url) : false;
        const nombre = n.convenioId ? nombresDeConvenio[n.convenioId] : null;
        const titulo = sinCortes(n.title);
        const detalle = sinCortes(n.detalle).trim();
        return (
          <li
            key={n.id}
            // La principal reparte lo suyo entre arriba y abajo: si la vecina es
            // más alta, el titular queda apoyado en el piso del recuadro y el
            // aire va arriba, no suelto debajo del texto.
            className={`flex flex-col bg-white ${principal ? "justify-between gap-6 p-5 sm:p-7" : "gap-2.5 p-5 md:min-h-48"} ${EN_TABLET[tablet]} ${EN_COMPU[compu]}`}
          >
            {/* Arriba, la sección a la izquierda y la fecha a la derecha. Sin
                sección ni aviso (la página de un convenio), la fecha queda
                sola y va a la izquierda, como la data de una nota. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
              {(conSeccion && (nombre || !n.convenioId)) || CHIP_DE_TAG[tag] ? (
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
                  {conSeccion && nombre ? (
                    <Link href={`/novedades/${encodeURIComponent(n.convenioId)}`} className={`${SECCION} text-emerald-700 hover:underline`}>
                      {nombre}
                    </Link>
                  ) : null}
                  {conSeccion && !n.convenioId ? <span className={`${SECCION} text-slate-600`}>{SECCION_GENERAL}</span> : null}
                  {CHIP_DE_TAG[tag] ? (
                    <span className={`rounded-md border px-1.5 py-px text-xs font-semibold ${CHIP_DE_TAG[tag]}`}>{ETIQUETA_DE_TAG[tag]}</span>
                  ) : null}
                </span>
              ) : null}
              <span className="text-xs text-slate-500">{fechaLarga(n.date)}</span>
            </div>
            <div className={`flex flex-col ${principal ? "gap-3.5" : "gap-2.5"}`}>
              <h2
                className={`text-slate-900 [overflow-wrap:anywhere] ${
                  principal ? "text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl" : "text-lg font-bold leading-snug tracking-tight"
                }`}
              >
                {n.url ? (
                  <a href={n.url} {...(externa ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={TITULAR}>
                    {titulo}
                  </a>
                ) : (
                  titulo
                )}
              </h2>
              {detalle ? (
                <p
                  className={`max-w-prose whitespace-pre-line [overflow-wrap:anywhere] ${
                    principal ? "text-base leading-relaxed text-slate-700 lg:text-lg" : "text-sm leading-relaxed text-slate-600"
                  }`}
                >
                  {detalle}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
