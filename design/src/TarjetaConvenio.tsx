export interface TarjetaConvenioProps {
  /** El nombre del convenio, título de la tarjeta: "Camioneros", "Empleados de Comercio". */
  nombre: string;
  /** El número del convenio colectivo, sin el prefijo: "40/89". */
  cct?: string;
  /** Hasta qué mes hay escalas cargadas: "Agosto 2026". Si no se sabe, no se muestra nada. */
  escalasHasta?: string;
  /** El color del sector, que aparece sólo como borde y punto (el nombre del sector no se imprime): sky privado, amber gastronomía, teal transporte, lime rural, orange construcción, violet casas particulares. */
  color?: "sky" | "amber" | "teal" | "lime" | "orange" | "violet" | "slate";
  href?: string;
  /** El texto de la llamada a la acción. */
  accion?: string;
}

const COLORES: Record<NonNullable<TarjetaConvenioProps["color"]>, { borde: string; texto: string }> = {
  sky: { borde: "border-sky-200 hover:border-sky-400", texto: "text-sky-700" },
  amber: { borde: "border-amber-200 hover:border-amber-400", texto: "text-amber-700" },
  teal: { borde: "border-teal-200 hover:border-teal-400", texto: "text-teal-700" },
  lime: { borde: "border-lime-200 hover:border-lime-400", texto: "text-lime-700" },
  orange: { borde: "border-orange-200 hover:border-orange-400", texto: "text-orange-700" },
  violet: { borde: "border-violet-200 hover:border-violet-400", texto: "text-violet-700" },
  slate: { borde: "border-slate-200 hover:border-slate-400", texto: "text-slate-700" },
};

/** La tarjeta de un convenio en la portada: nombre como título, chips con el CCT y hasta cuándo llegan las escalas, y "Comenzar →". Toda la tarjeta es el enlace. */
export function TarjetaConvenio({ nombre, cct, escalasHasta, color = "sky", href = "#", accion = "Comenzar" }: TarjetaConvenioProps) {
  const c = COLORES[color];
  return (
    <a
      href={href}
      className={`group flex h-full min-w-0 flex-col rounded-2xl border bg-white/80 p-4 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${c.borde}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span aria-hidden="true" className={`mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-current ${c.texto}`} />
        <h3 className="min-w-0 text-base font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">{nombre}</h3>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {cct ? <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">CCT {cct}</span> : null}
        {escalasHasta ? <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">Escalas hasta {escalasHasta}</span> : null}
      </div>
      <span className={`mt-auto pt-3 text-[13px] font-medium group-hover:underline ${c.texto}`}>{accion} →</span>
    </a>
  );
}
