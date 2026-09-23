"use client";
// components/calculadora/ReciboOficial.jsx
// El recibo con el formato del Anexo III del Decreto 407/2026 (copia en
// docs/decreto-407-2026-anexo-III.pdf): encabezado de casillas, "Costo total
// empleador" con su tabla, "Sub total contribuciones" y "Sueldo bruto", la
// tabla del trabajador con haberes y aportes, la composición salarial, el
// neto, el "Detalle de la composición salarial" y la torta del costo total.
//
// Sólo dibuja: las celdas las arma lib/reciboOficial.js, que es puro y tiene
// tests. Las casillas que la simulación no conoce (empresa, CUIT, nombre,
// legajo, CUIL, fecha de ingreso, lugar y fecha de pago) quedan en blanco.

import { nombreDePeriodo } from "@/lib/periodos";
import {
  money,
  encabezado,
  filasEmpleador,
  filasTrabajador,
  bloquesComposicion,
  porcionesDelCosto,
  lineasPorTipo,
} from "@/lib/reciboOficial";

// Los colores de la torta, uno por porción y siempre el mismo (validados con
// el chequeo de daltonismo y de contraste sobre fondo claro).
const COLOR_PORCION = {
  neto: "#059669",
  seguridad_social: "#4f46e5",
  sindical: "#e11d48",
  obra_social: "#0284c7",
  inssjp: "#d97706",
  art: "#7c3aed",
  otros: "#db2777",
  ganancias: "#b45309",
};

const NEGRO = "border-slate-900";
const ROTULO = `bg-slate-200 text-[10px] font-bold uppercase text-center text-slate-800 px-1 py-0.5 border ${NEGRO}`;
const CASILLA = `text-[12px] text-slate-900 px-1.5 h-7 border ${NEGRO} [overflow-wrap:anywhere]`;
const CELDA = `px-1.5 py-0.5 border-l border-r ${NEGRO} align-top`;

/** Una casilla del encabezado que la simulación no tiene: en blanco, y el lector de pantalla lo dice. */
const SinCompletar = () => <span className="sr-only">sin completar</span>;

/** Una franja gris de total: título centrado en negrita e importe a la derecha, como en el modelo. */
function Franja({ titulo, importe, grande = false }) {
  return (
    <div className={`flex items-center gap-2 border ${NEGRO} bg-slate-200 px-2 ${grande ? "py-1.5 text-[14px]" : "py-1 text-[13px]"} font-bold text-slate-900 -mt-px`}>
      <span className="flex-1 text-center uppercase">{titulo}</span>
      <span className="tabular-nums whitespace-nowrap">{importe}</span>
    </div>
  );
}

/** La tabla CONCEPTO / UNIDAD / BASE / MONTO, común al empleador y al trabajador. */
function Tabla({ filas, titulo, vacio }) {
  return (
    <table className={`w-full table-fixed border-collapse border ${NEGRO} -mt-px text-[12px] text-slate-900`}>
      <caption className="sr-only">{titulo}</caption>
      <colgroup>
        <col className="w-[38%]" />
        <col className="w-[13%]" />
        <col className="w-[23%]" />
        <col className="w-[26%]" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={ROTULO}>Concepto</th>
          <th scope="col" className={ROTULO}>Unidad</th>
          <th scope="col" className={ROTULO}>Base</th>
          <th scope="col" className={ROTULO}>Monto</th>
        </tr>
      </thead>
      <tbody>
        {filas.length === 0 && (
          <tr>
            <td colSpan={4} className={`${CELDA} py-2 text-[11px] text-amber-800 bg-amber-50`}>{vacio}</td>
          </tr>
        )}
        {filas.map((f, i) => {
          if (f.clase === "subtitulo") {
            return (
              <tr key={i}>
                <td colSpan={4} className={`${CELDA} pt-2 font-medium`}>{f.texto}</td>
              </tr>
            );
          }
          if (f.clase === "separador") {
            return (
              <tr key={i} aria-hidden="true">
                <td className={`${CELDA} h-4`} />
                <td className={`${CELDA} h-4`} />
                <td className={`${CELDA} h-4`} />
                <td className={`${CELDA} h-4`} />
              </tr>
            );
          }
          const { linea, celdas } = f;
          const tono = linea.pendiente ? "text-amber-700" : linea.tipo === "no_remunerativo" ? "text-sky-800" : "";
          return (
            <tr key={i} className={tono}>
              <td className={`${CELDA} [overflow-wrap:anywhere]`} title={f.explicacion || undefined}>
                {linea.concepto}
                {linea.tipo === "no_remunerativo" && (
                  <span className="ml-1 text-[9px] uppercase tracking-wide text-sky-600">
                    no rem.{linea.sinIncidencia ? " · sin incidencia" : ""}
                  </span>
                )}
              </td>
              <td className={`${CELDA} text-right tabular-nums whitespace-nowrap`}>{celdas.unidad}</td>
              <td className={`${CELDA} text-right tabular-nums`}>
                <span className="whitespace-nowrap">{celdas.base}</span>
                {celdas.baseNota && <span className="block text-[9px] leading-tight text-slate-500 whitespace-normal">{celdas.baseNota}</span>}
              </td>
              <td className={`${CELDA} text-right tabular-nums whitespace-nowrap`}>{money(linea.monto)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Un bloque del "Detalle de la composición salarial": total en negrita y lo que pone cada lado. */
function Bloque({ bloque }) {
  return (
    <div className="text-[11px] text-slate-900">
      <div className="flex justify-between gap-2 font-bold">
        <span>{bloque.titulo}</span>
        <span className="tabular-nums whitespace-nowrap">{money(bloque.total)}</span>
      </div>
      {bloque.partes.map((p) => (
        <div key={p.lado} className="flex justify-between gap-2 text-slate-700">
          <span>{p.lado}</span>
          <span className="tabular-nums whitespace-nowrap">{money(p.monto)}</span>
        </div>
      ))}
    </div>
  );
}

/** La torta "Costo total empleador" del modelo, en SVG, con leyenda arriba y una tabla para el lector de pantalla. */
function Torta({ porciones, total }) {
  const R = 46;
  const cx = 50;
  const cy = 50;
  let angulo = -Math.PI / 2;
  const sectores = porciones.map((p) => {
    const abre = angulo;
    const barrido = (p.monto / total) * 2 * Math.PI;
    angulo += barrido;
    const punto = (a, r = R) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x1, y1] = punto(abre);
    const [x2, y2] = punto(angulo);
    const [lx, ly] = punto(abre + barrido / 2, R * 0.62);
    const completo = porciones.length === 1;
    const d = completo
      ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} Z`
      : `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${R} ${R} 0 ${barrido > Math.PI ? 1 : 0} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
    return { ...p, d, lx, ly, color: COLOR_PORCION[p.id] || "#475569" };
  });

  return (
    <figure className="m-0">
      <figcaption className="text-center text-[13px] text-slate-900">Costo total empleador</figcaption>
      <ul className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] leading-tight text-slate-700" aria-hidden="true">
        {sectores.map((s) => (
          <li key={s.id} className="flex items-start gap-1 min-w-0">
            <span className="mt-0.5 inline-block h-2 w-2 shrink-0" style={{ background: s.color }} />
            <span className="[overflow-wrap:anywhere]">{s.label}</span>
          </li>
        ))}
      </ul>
      <svg viewBox="0 0 100 100" className="mx-auto mt-1.5 block h-40 w-40" role="img" aria-labelledby="torta-costo-titulo">
        <title id="torta-costo-titulo">Costo total empleador: cómo se reparte</title>
        {sectores.map((s) => (
          <g key={s.id}>
            <path d={s.d} fill={s.color} stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round">
              <title>{`${s.label}: ${money(s.monto)} (${s.porcentaje.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%)`}</title>
            </path>
            {s.porcentaje >= 6 && (
              <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fontSize="6.5" fontWeight="700" fill="#ffffff">
                {Math.round(s.porcentaje)}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Costo total empleador por componente</caption>
        <thead>
          <tr><th scope="col">Componente</th><th scope="col">Importe</th><th scope="col">Porcentaje</th></tr>
        </thead>
        <tbody>
          {sectores.map((s) => (
            <tr key={s.id}>
              <th scope="row">{s.label}</th>
              <td>{money(s.monto)}</td>
              <td>{s.porcentaje.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default function ReciboOficial({ resultado, entradas, periodoId }) {
  const cabecera = encabezado(resultado, entradas, periodoId);
  const empleador = resultado.costoEmpleador;
  const totales = resultado.totales;
  const { desconocidas } = lineasPorTipo(resultado.detalle);
  const composicion = bloquesComposicion(resultado);
  const torta = porcionesDelCosto(resultado);
  const mesSinTabla = nombreDePeriodo(resultado.metodo && resultado.metodo.periodo);

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div className="min-w-[520px] print:min-w-0 bg-white text-slate-900 border border-slate-900">

        {/* Empresa: tres renglones, como el modelo. Nada de esto lo sabe la simulación. */}
        <div className="px-1.5 py-1 text-[12px] leading-5">
          <div>EMPRESA <SinCompletar /></div>
          <div aria-hidden="true">&nbsp;</div>
          <div>C.U.I.T. EMPRESA : <SinCompletar /></div>
        </div>

        {/* Casillas, fila 1 */}
        <table className={`w-full table-fixed border-collapse border ${NEGRO} -mt-px`}>
          <caption className="sr-only">Datos del recibo</caption>
          <colgroup>
            <col className="w-[4%]" /><col className="w-[13%]" /><col className="w-[8%]" /><col className="w-[25%]" />
            <col className="w-[13%]" /><col className="w-[21%]" /><col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={ROTULO}>Q.</th>
              <th scope="col" className={ROTULO}>Mes</th>
              <th scope="col" className={ROTULO}>Año</th>
              <th scope="col" className={ROTULO}>Apellido y nombre</th>
              <th scope="col" className={ROTULO}>N°Legajo</th>
              <th scope="col" className={ROTULO}>Sueldo bruto</th>
              <th scope="col" className={ROTULO}>Antigüedad</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={CASILLA}><SinCompletar /></td>
              <td className={`${CASILLA} capitalize text-[11px] whitespace-nowrap`}>{cabecera.mes}</td>
              <td className={`${CASILLA} tabular-nums`}>{cabecera.año}</td>
              <td className={CASILLA}><SinCompletar /></td>
              <td className={CASILLA}><SinCompletar /></td>
              <td className={`${CASILLA} text-right tabular-nums whitespace-nowrap`}>{cabecera.sueldoBruto}</td>
              <td className={`${CASILLA} text-center tabular-nums`}>{cabecera.antiguedad}</td>
            </tr>
          </tbody>
        </table>

        {/* Casillas, fila 2 */}
        <table className={`w-full table-fixed border-collapse border ${NEGRO} -mt-px`}>
          <caption className="sr-only">Datos del puesto</caption>
          <colgroup>
            <col className="w-[30%]" /><col className="w-[28%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[14%]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={ROTULO}>Fecha ingreso</th>
              <th scope="col" className={ROTULO}>Categoría laboral</th>
              <th scope="col" className={ROTULO}>C.U.I.L</th>
              <th scope="col" className={ROTULO}>Lugar de pago</th>
              <th scope="col" className={ROTULO}>F.Pago aportes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={CASILLA}><SinCompletar /></td>
              <td className={`${CASILLA} h-auto py-1 text-[11px] leading-tight`}>{cabecera.categoria || <SinCompletar />}</td>
              <td className={CASILLA}><SinCompletar /></td>
              <td className={CASILLA}><SinCompletar /></td>
              <td className={CASILLA}><SinCompletar /></td>
            </tr>
          </tbody>
        </table>

        {/* Lo que paga el empleador, antes del bruto: es el punto de la norma */}
        <Franja titulo="Costo total empleador" importe={empleador ? money(empleador.costoLaboral) : "—"} grande />
        <Tabla
          titulo="Contribuciones a cargo del empleador"
          filas={empleador ? filasEmpleador(resultado.detalle) : []}
          vacio={`Para ${mesSinTabla} todavía no hay tabla de contribuciones cargada, así que este recibo no muestra la sección del empleador.`}
        />
        <Franja titulo="Sub total contribuciones empleador" importe={empleador ? money(empleador.totalContribuciones) : "—"} />
        <Franja titulo="Sueldo bruto" importe={money(totales.bruto + totales.noRemunerativo)} />

        {/* Haberes y aportes del trabajador */}
        <Tabla titulo="Haberes y descuentos del trabajador" filas={filasTrabajador(resultado.detalle)} vacio="El recibo no tiene líneas." />

        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 border ${NEGRO} bg-slate-200 px-2 py-1 text-[12px] font-bold text-slate-900 -mt-px`}>
          <span className="uppercase">Composicion salarial:</span>
          <span className="flex-1 text-center whitespace-nowrap">Remunerativo: <span className="tabular-nums">{money(totales.bruto)}</span></span>
          <span className="flex-1 text-center whitespace-nowrap">No Remunerativo: <span className="tabular-nums">{money(totales.noRemunerativo)}</span></span>
          <span className="flex-1 text-right whitespace-nowrap">Descuentos: <span className="tabular-nums ml-2">{money(totales.retenciones)}</span></span>
        </div>
        <Franja titulo="Sueldo neto $" importe={money(totales.neto)} grande />

        {/* Detalle de la composición salarial y torta */}
        {composicion && torta && (
          <div className={`grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] border ${NEGRO} -mt-px`}>
            <div className="px-1.5 py-1.5 border-r border-slate-300">
              <h4 className="text-center text-[12px] font-bold underline underline-offset-2 text-slate-900 mb-1.5">Detalle de la composición salarial</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {composicion.bloques.map((b) => <Bloque key={b.id} bloque={b} />)}
              </div>
              <p className="mt-2 text-[9px] text-slate-700">{composicion.nota}</p>
            </div>
            <div className="px-1.5 py-1.5">
              <Torta porciones={torta.porciones} total={torta.total} />
            </div>
          </div>
        )}
      </div>

      {desconocidas.length > 0 && (
        <div className="mt-2 text-[11px] text-rose-800 bg-rose-50 border border-rose-300 rounded-lg px-2.5 py-2">
          El recibo tiene {desconocidas.length} línea(s) de un tipo que esta pantalla no sabe mostrar:{" "}
          {desconocidas.map((l) => `${l.concepto} (${l.tipo})`).join(", ")}. No están sumadas en ninguna sección de arriba.
        </div>
      )}
    </div>
  );
}
