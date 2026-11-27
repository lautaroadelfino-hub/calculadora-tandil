// components/EscalaDeAcuerdo.jsx
// La escala de un acuerdo en su propia página: los básicos por categoría de
// cada mes, qué cambió respecto del mes anterior y, si el convenio los tiene,
// los viáticos del mes. Componente de servidor: es HTML, sin estado.
//
// POR QUÉ EXISTE: la página traía el título y el botón del PDF, y ningún
// número. Lo que la gente busca ("escala salarial camioneros noviembre 2026")
// es la tabla. Qué meses van en cada página lo decide lib/escalasDeAcuerdo.js.
//
// La forma es la de una planilla: categorías a la izquierda, un mes por
// columna, importes a la derecha con los dígitos alineados. Con muchos meses
// en el celular la tabla se desliza y la categoría queda fija. Los importes
// van sin "$": el pie de la tabla dice que son pesos.
import Link from "next/link";
import { nombreDeLosMeses } from "@/lib/escalasDeAcuerdo";

const numero = (minimo, maximo = minimo) => (n) =>
  n === null || n === undefined ? "—" : Number(n).toLocaleString("es-AR", { minimumFractionDigits: minimo, maximumFractionDigits: maximo });

/** "Personal Auxiliar A": la última palabra corta no se queda sola en el renglón de abajo. */
const sinHuerfana = (texto) => String(texto).replace(/ (\S{1,3})$/, "\u00a0$1");

const LINK = "font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

/**
 * Una tabla con una fila por concepto y una columna por mes.
 * @param titulo        el título de la tabla, adentro del recuadro (las tablas
 *                      secundarias; la de básicos lleva el h2 de la sección)
 * @param descripcion   para lectores de pantalla
 * @param encabezado    el nombre de la primera columna
 * @param columnas      [{ id, nombre }] los meses
 * @param grupos        [{ zona|null, filas: [{ nombre, aclaracion?, valores: [] }] }]
 * @param formato       de número a texto
 * @param periodoEnCurso el mes de hoy, si está entre las columnas: se marca
 */
function Planilla({ titulo, descripcion, encabezado, columnas, grupos, formato, periodoEnCurso }) {
  // La raya vertical sólo hace falta cuando la tabla puede deslizarse: separa
  // la categoría fija de los importes que pasan por debajo.
  const fija = columnas.length > 3 ? " shadow-[1px_0_0_0_#e2e8f0]" : "";
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* El título va adentro del recuadro: así dos tablas lado a lado empiezan a la misma altura. */}
      {titulo ? <h3 className="border-b border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-900 sm:px-4">{titulo}</h3> : null}
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] sm:text-sm">
        <caption className="sr-only">{descripcion}</caption>
        <thead>
          <tr className="border-b border-slate-300 text-xs text-slate-600">
            <th scope="col" className={`sticky left-0 z-10 min-w-[6.75rem] bg-white px-2 py-2.5 text-left font-semibold sm:px-4${fija}`}>
              {encabezado}
            </th>
            {columnas.map((c) => (
              <th
                key={c.id}
                scope="col"
                // El nombre del mes puede partirse en dos renglones ("Noviembre" / "2026"):
                // en el celular es lo que deja entrar tres meses sin deslizar.
                className={`px-2 py-2.5 text-right align-bottom font-semibold sm:px-4 sm:whitespace-nowrap ${c.id === periodoEnCurso ? "bg-emerald-50 text-emerald-900" : ""}`}
              >
                {c.nombre}
                {c.id === periodoEnCurso ? <span className="block text-[11px] font-medium text-emerald-700">este mes</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        {grupos.map((g) => (
          <tbody key={g.zona || "todas"}>
            {g.zona ? (
              <tr>
                <th scope="rowgroup" colSpan={columnas.length + 1} className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold text-slate-700 sm:px-4">
                  {g.zona}
                </th>
              </tr>
            ) : null}
            {g.filas.map((f) => (
              <tr key={f.nombre} className="group border-b border-slate-100 last:border-b-0">
                <th scope="row" className={`sticky left-0 bg-white px-2 py-2 text-left font-normal text-slate-800 group-hover:bg-slate-50 sm:px-4${fija}`}>
                  {sinHuerfana(f.nombre)}
                  {f.aclaracion ? <span className="block text-xs text-slate-500">{f.aclaracion}</span> : null}
                </th>
                {f.valores.map((v, i) => (
                  <td
                    key={columnas[i].id}
                    className={`px-2 py-2 text-right tabular-nums whitespace-nowrap text-slate-900 sm:px-4 ${
                      columnas[i].id === periodoEnCurso ? "bg-emerald-50/70 font-medium" : "group-hover:bg-slate-50"
                    }`}
                  >
                    {formato(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      </div>
    </div>
  );
}

/**
 * @param vista        lo que arma vistaDeEscalas(), o null si esta página no muestra escalas
 * @param enOtraPagina [{ acuerdo, periodos }] los meses de la vigencia que se ven en otro acuerdo
 * @param convenio     { nombre, cct }
 * @param convenioId   el id de la URL
 */
export default function EscalaDeAcuerdo({ vista, enOtraPagina = [], convenio, convenioId }) {
  if (!vista && !enOtraPagina.length) return null;
  const id = encodeURIComponent(convenioId);
  const deConvenio = convenio && convenio.nombre ? ` de ${convenio.nombre}` : "";
  const otrosMeses = nombreDeLosMeses(enOtraPagina.flatMap((o) => o.periodos).sort());
  const otros = enOtraPagina.length ? (
    <ul className="mt-2 space-y-1.5 text-sm">
      {enOtraPagina.map(({ acuerdo }) => (
        <li key={acuerdo.id}>
          <Link href={`/acuerdos/${id}/${acuerdo.slug}`} className={LINK}>{acuerdo.titulo}</Link>
        </li>
      ))}
    </ul>
  ) : null;

  if (!vista) {
    return (
      <section aria-labelledby="escalas-del-acuerdo" className="mt-6">
        <h2 id="escalas-del-acuerdo" className="text-lg font-semibold text-slate-900">Dónde están los básicos</h2>
        <p className="mt-1 text-sm text-slate-600">Los de {otrosMeses} están en:</p>
        {otros}
      </section>
    );
  }

  const { tabla, resumen, valores, periodoEnCurso } = vista;
  const unMes = tabla.periodos.length === 1;
  const conFrases = resumen.filter((r) => r.frases.length);
  const basicos = tabla.grupos.map((g) => ({ zona: g.zona, filas: g.filas.map((f) => ({ nombre: f.categoria, valores: f.basico })) }));
  const noRemunerativos = tabla.grupos.map((g) => ({ zona: g.zona, filas: g.filas.map((f) => ({ nombre: f.categoria, valores: f.noRemunerativo })) }));
  // Con varios meses, lo de cada uno va después de la tabla: primero los
  // números, que es a lo que se viene. Con uno solo es un renglón y va arriba.
  const mesPorMes = !unMes && conFrases.length ? (
    <div>
      <h3 className="text-base font-semibold text-slate-900">Mes por mes</h3>
      <ul className="mt-2 max-w-prose space-y-2 text-sm leading-relaxed text-slate-600">
        {conFrases.map((r) => (
          <li key={r.periodo}>
            <span className="font-semibold text-slate-800">{r.nombre}.</span> {r.frases.join(" ")}
          </li>
        ))}
      </ul>
    </div>
  ) : null;
  const viaticos = valores.length ? (
    <Planilla
      titulo="Viáticos y adicionales"
      descripcion={`Viáticos y adicionales${deConvenio}, ${vista.meses}, en pesos`}
      encabezado="Concepto"
      columnas={tabla.periodos}
      grupos={[{ zona: null, filas: valores.map((v) => ({ nombre: v.nombre, aclaracion: v.unidad, valores: v.valores })) }]}
      formato={numero(2, 5)}
      periodoEnCurso={periodoEnCurso}
    />
  ) : null;
  // En la compu, hasta cuatro meses dejan lugar al costado para los viáticos y
  // el detalle de cada mes; con más, la tabla necesita todo el ancho. En el
  // celular va todo en una columna, en este mismo orden.
  const alCostado = tabla.periodos.length <= 4 && (mesPorMes || viaticos);

  return (
    <section aria-labelledby="escalas-del-acuerdo" className="mt-6">
      <h2 id="escalas-del-acuerdo" className="text-lg font-semibold text-slate-900">Básicos de {vista.meses}</h2>
      {unMes && conFrases.length ? <p className="mt-1 max-w-prose text-sm text-slate-600">{conFrases[0].frases.join(" ")}</p> : null}

      <div className={alCostado ? "mt-3 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start" : "mt-3 space-y-6"}>
        <div className={`space-y-6 ${!alCostado && tabla.periodos.length <= 2 ? "max-w-2xl" : ""}`}>
          <div>
            <Planilla
              descripcion={`Básico mensual por categoría${deConvenio}, ${vista.meses}, en pesos`}
              encabezado="Categoría"
              columnas={tabla.periodos}
              grupos={basicos}
              formato={numero(tabla.decimales)}
              periodoEnCurso={periodoEnCurso}
            />
            <p className="mt-2 max-w-prose text-xs leading-relaxed text-slate-500">
              Básico mensual de jornada completa, en pesos. Son los importes con los que liquida la calculadora: pueden diferir en centavos del documento
              por redondeo y, ante una diferencia, vale el documento.
            </p>
          </div>
          {tabla.noRemunerativoPorCategoria ? (
            <Planilla
              titulo="Suma no remunerativa por categoría"
              descripcion={`Suma no remunerativa por categoría${deConvenio}, ${vista.meses}, en pesos`}
              encabezado="Categoría"
              columnas={tabla.periodos}
              grupos={noRemunerativos}
              formato={numero(tabla.decimales)}
              periodoEnCurso={periodoEnCurso}
            />
          ) : null}
        </div>
        {alCostado ? (
          <div className="space-y-6">
            {viaticos}
            {mesPorMes}
          </div>
        ) : (
          <>
            {viaticos}
            {mesPorMes}
          </>
        )}
      </div>

      {otros ? (
        <div className="mt-5">
          <p className="text-sm text-slate-600">Los básicos de {otrosMeses} están en:</p>
          {otros}
        </div>
      ) : null}
    </section>
  );
}
