// app/page.js
// La portada es un DIRECTORIO: el visitante viene a encontrar SU convenio.
//
// QUÉ CAMBIÓ Y POR QUÉ (13/9/2026):
// - Las tarjetas ya no imprimen el sector ("SECTOR PRIVADO", "TRANSPORTE Y
//   LOGÍSTICA"). Era la línea más grande de la tarjeta y no es lo que la
//   persona busca: el protagonista ahora es el nombre del convenio. El sector
//   sobrevive como color del borde y del punto, y como criterio de búsqueda y
//   de agrupado, que es lo que el color y el orden saben hacer bien.
// - Se fue el line-clamp-2. Truncar "Escalas hasta Agosto 2026" con puntos
//   suspensivos escondía justo el dato que dice si el cálculo sirve. Acá no
//   hay ni un line-clamp, ni un truncate, ni un overflow-hidden sobre texto:
//   todo envuelve.
// - La grilla salió del costado del hero (donde tenía media pantalla y cuatro
//   columnas angostas, que es lo que obligaba a recortar) y pasa a ocupar el
//   ancho completo debajo de un hero compacto.
// - Buscador y encabezados por sector aparecen SOLOS cuando hay suficientes
//   convenios (los umbrales viven en lib/directorio.js). Con 3 no hay ningún
//   control que administrar; con 40 la página sigue siendo navegable.
"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import ReportModal from "../components/ReportModal";
import SideRailLeft from "../components/SideRailLeft";
import MobileExtras from "../components/MobileExtras";
import { herramientasDisponibles, estiloDeSector, estiloDeHerramienta } from "@/lib/herramientas";
import {
  ordenarConvenios,
  filtrarConvenios,
  agruparPorSector,
  debeBuscar,
  debeAgrupar,
} from "@/lib/directorio";

const APP_VERSION = "v1.5.0";

// La grilla, escrita entera y dos veces a propósito: Tailwind v4 encuentra las
// clases leyendo el texto del archivo, así que las cadenas tienen que estar
// completas y no armadas por concatenación.
//
// Con pocos convenios la grilla llega hasta 3 columnas, así que los 3 de hoy
// llenan exactamente una fila en un monitor de 1366 px y no queda un hueco al
// costado. Cuando haya muchos pasa a 4 columnas en pantallas grandes, para que
// entren más sin scrollear.
const GRILLA_COMPACTA = "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3";
const GRILLA_AMPLIA =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

const plural = (n, singular, pluralTxt) => (n === 1 ? singular : pluralTxt);

/**
 * Tarjeta de convenio. El nombre es el título; el sector ya no se escribe.
 * Ningún texto se trunca: [overflow-wrap:anywhere] parte una palabra
 * larguísima antes que desbordar, y `h-full` + `mt-auto` emparejan el pie de
 * todas las tarjetas de una misma fila aunque una tenga el nombre más largo.
 */
function TarjetaConvenio({ convenio }) {
  const estilos = estiloDeSector(convenio.sector);
  return (
    <Link
      href={`/calcular/${convenio.id}`}
      className={`group flex h-full min-w-0 flex-col rounded-2xl border bg-white/80 p-4 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${estilos.border}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          aria-hidden="true"
          className={`mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-current ${estilos.texto}`}
        />
        <h3 className="min-w-0 text-base font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">
          {convenio.nombre}
        </h3>
      </div>

      {/* CCT y hasta cuándo llegan las escalas: dos chips que envuelven en
          varias líneas si hace falta. Antes todas las tarjetas decían
          "Liquidación actualizada", incluso con las escalas congeladas hace
          dos meses; acá se dice hasta dónde llegan de verdad, y si el
          documento no lo trae, el chip no aparece: no se inventa un mes. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {convenio.cct ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 [overflow-wrap:anywhere]">
            CCT {convenio.cct}
          </span>
        ) : null}
        {convenio.ultimo_periodo_nombre ? (
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 [overflow-wrap:anywhere]">
            Escalas hasta {convenio.ultimo_periodo_nombre}
          </span>
        ) : null}
      </div>

      <span className={`mt-auto pt-3 text-[13px] font-medium group-hover:underline ${estilos.texto}`}>
        Comenzar →
      </span>
    </Link>
  );
}

/** Misma tarjeta para las herramientas de lib/herramientas.js. */
function TarjetaHerramienta({ herramienta }) {
  const estilo = estiloDeHerramienta(herramienta.color);
  return (
    <Link
      href={herramienta.href}
      className={`group flex h-full min-w-0 flex-col rounded-2xl border bg-white/80 p-4 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${estilo.border}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          aria-hidden="true"
          className={`mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-current ${estilo.texto}`}
        />
        <h3 className="min-w-0 text-base font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">
          {herramienta.nombre}
        </h3>
      </div>
      {herramienta.descripcion ? (
        <p className="mt-2 text-[13px] leading-snug text-slate-600 [overflow-wrap:anywhere]">
          {herramienta.descripcion}
        </p>
      ) : null}
      <span className={`mt-auto pt-3 text-[13px] font-medium group-hover:underline ${estilo.texto}`}>
        {herramienta.accion || "Abrir"} →
      </span>
    </Link>
  );
}

/** Tarjetas grises mientras Firestore responde, con la forma final. */
function TarjetasCargando({ clases }) {
  return (
    <div className={clases} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[9.5rem] animate-pulse rounded-2xl border border-slate-200 bg-white/60"
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [convenios, setConvenios] = useState([]);
  // Los convenios inactivos son los que se están preparando: se muestran en
  // "Próximas actualizaciones" en vez de estar escritos a mano en el código.
  const [enPreparacion, setEnPreparacion] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Un error de red no es lo mismo que "todavía no hay convenios publicados", y
  // el visitante tiene que poder distinguirlos: en un caso recarga, en el otro
  // no tiene nada que hacer.
  const [fallo, setFallo] = useState(false);

  // Buscador. Aparece solo cuando hay muchos convenios; ver lib/directorio.js.
  const [consulta, setConsulta] = useState("");
  // Quien llega desde /empleador (un link viejo) recibe una explicación en vez
  // de una redirección muda.
  const [vieneDelEmpleador, setVieneDelEmpleador] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("desde") === "empleador") {
      setVieneDelEmpleador(true);
    }
  }, []);

  // Modal / extras
  const [showReport, setShowReport] = useState(false);
  const reportBtnRef = useRef(null);
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    async function obtenerConveniosActivos() {
      try {
        const querySnapshot = await getDocs(collection(db, "convenios"));

        const lista = [];
        querySnapshot.forEach((doc) => {
          lista.push({
            id: doc.id,
            ...doc.data()
          });
        });

        setConvenios(lista.filter((c) => c.activo !== false));
        setEnPreparacion(lista.filter((c) => c.activo === false));
      } catch (error) {
        console.error("Error al traer convenios:", error);
        setFallo(true);
      } finally {
        setCargando(false);
      }
    }
    obtenerConveniosActivos();
  }, []);

  // El sector y el color salen del campo `sector` del documento, elegible
  // desde el panel. Antes se adivinaban buscando palabras dentro del id
  // ("fehgra", "utghra"): el id gastronómico no contenía ninguna, así que su
  // tarjeta ya caía al estilo genérico, y cualquier convenio cuyo id no
  // coincidiera quedaba etiquetado mal en la portada.

  // Orden alfabético siempre: el orden en que Firestore devuelve los
  // documentos no significa nada para quien busca el suyo.
  const activos = useMemo(() => ordenarConvenios(convenios), [convenios]);

  const herramientas = herramientasDisponibles();

  const hayBuscador = debeBuscar(activos.length);
  const buscando = hayBuscador && consulta.trim().length > 0;

  const visibles = useMemo(
    () => (hayBuscador ? filtrarConvenios(activos, consulta) : activos),
    [activos, consulta, hayBuscador]
  );

  // Agrupar por sector recién cuando la lista deja de leerse de un vistazo. Y
  // nunca mientras hay una búsqueda activa: ahí importa el resultado, no la
  // taxonomía, y una lista corta se lee mejor de corrido.
  const agrupado = !buscando && debeAgrupar(activos.length);
  const grupos = useMemo(() => (agrupado ? agruparPorSector(visibles) : []), [agrupado, visibles]);

  // Con pocos convenios, hasta 3 columnas; con muchos, 4 en pantallas grandes.
  const GRILLA = activos.length > 6 ? GRILLA_AMPLIA : GRILLA_COMPACTA;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-x-hidden">
      {/* El layout ya pone un gutter lateral (px-4 = 16 px en móvil), así que
          acá alcanza con px-4: en una pantalla de 400 px quedan 32 px de
          margen por lado y nada se sale hacia el costado. */}
      {/* <div>, no <main>: el <main> lo pone el layout. Dos "principal" anidados
          confundían al lector de pantalla y al salto al contenido. */}
      <div className="w-full px-4 sm:px-6 py-6 sm:py-8 min-h-[100dvh]">

        {/* HERO COMPACTO: el mensaje sigue entero, pero en una franja al ancho
            completo y baja, para que el directorio empiece arriba de todo. */}
        <section className="mb-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 px-5 py-6 sm:px-8 sm:py-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-[11px] font-medium text-emerald-900">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Calculadora de sueldos
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
            Simulá tu recibo de sueldo en segundos.
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-slate-700">
            Elegí tu convenio, completá algunos datos básicos y obtené una
            liquidación estimada, con detalle de remunerativos, no
            remunerativos y descuentos.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            Sirve para el empleado y para el empleador: el mismo recibo muestra lo que paga la empresa
            y el costo laboral total, como exige el recibo desde junio de 2026.
          </p>
        </section>

        {vieneDelEmpleador && (
          <div role="status" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <b>El panel del empleador ya no es una sección aparte.</b> Cada calculadora muestra, en el mismo recibo,
            lo que paga el empleador y el costo laboral total. Elegí el convenio y calculá.
          </div>
        )}

        {/* DIRECTORIO: el producto principal de la portada. */}
        <section aria-labelledby="titulo-convenios" className="mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 id="titulo-convenios" className="text-xl font-bold text-slate-900">
                Elegí tu convenio
              </h2>
              <p className="mt-1 text-sm text-slate-600" aria-live="polite">
                {cargando
                  ? "Buscando las calculadoras disponibles..."
                  : fallo
                  ? "No pudimos cargar el listado."
                  : buscando
                  ? `${visibles.length} de ${activos.length} ${plural(activos.length, "convenio", "convenios")} coinciden con tu búsqueda.`
                  : `${activos.length} ${plural(activos.length, "convenio", "convenios")} con escalas cargadas.`}
              </p>
            </div>

            {/* El buscador aparece recién cuando hay muchos convenios: con 3
                sería un control de más para una grilla que se lee de un
                vistazo. */}
            {hayBuscador ? (
              <div className="w-full sm:w-80">
                <label htmlFor="buscar-convenio" className="sr-only">
                  Buscar convenio por nombre, número de CCT o sector
                </label>
                <input
                  id="buscar-convenio"
                  type="search"
                  value={consulta}
                  onChange={(e) => setConsulta(e.target.value)}
                  placeholder="Buscar: camioneros, comercio, 40/89..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            ) : null}
          </div>

          {cargando ? (
            <TarjetasCargando clases={GRILLA} />
          ) : fallo ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-sm text-amber-900">
              No pudimos cargar los convenios. Revisá tu conexión y volvé a
              cargar la página; si sigue igual, contanos con el botón de abajo.
            </div>
          ) : activos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600">
              Todavía no hay convenios publicados. Los que están en preparación
              figuran en &quot;Próximas actualizaciones&quot;.
            </div>
          ) : visibles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600">
              <p className="[overflow-wrap:anywhere]">
                No encontramos ningún convenio para{" "}
                <span className="font-semibold text-slate-900">{consulta}</span>.
                Probá con el número de CCT o con una sola palabra del nombre.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConsulta("")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Ver los {activos.length} convenios
                </button>
                {/* Una búsqueda fallida es el mejor momento para pedir un
                    convenio: el término buscado viaja en el reporte. */}
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-slate-900"
                >
                  Pedir este convenio
                </button>
              </div>
            </div>
          ) : agrupado ? (
            /* Con muchos convenios la grilla se parte por sector: el
               encabezado va UNA vez arriba del grupo, no repetido en cada
               tarjeta como estaba antes. */
            <div className="space-y-7">
              {grupos.map((grupo) => (
                <div key={grupo.value}>
                  <div className="mb-3 flex items-baseline gap-2 border-b border-slate-200 pb-1.5">
                    <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                      {grupo.label}
                    </h3>
                    <span className="text-xs text-slate-500">{grupo.convenios.length}</span>
                  </div>
                  <div className={GRILLA}>
                    {grupo.convenios.map((conv) => (
                      <TarjetaConvenio key={conv.id} convenio={conv} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={GRILLA}>
              {visibles.map((conv) => (
                <TarjetaConvenio key={conv.id} convenio={conv} />
              ))}
            </div>
          )}

          {/* Con tres convenios la lista es corta, y esta línea la cierra sin
              que parezca que falta algo: se puede pedir el que no está. */}
          {!cargando && !fallo && activos.length > 0 ? (
            <p className="mt-4 text-[13px] text-slate-600">
              ¿No está tu convenio?{" "}
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
              >
                Pedinos que lo agreguemos
              </button>
              .
            </p>
          ) : null}
        </section>

        {/* Herramientas: salen de lib/herramientas.js. Antes la del Panel
            Empleador era un <Link> escrito a mano acá, así que sumar una
            calculadora nueva implicaba editar la portada. Hoy no hay ninguna
            disponible, así que esta sección directamente no se dibuja: no
            queda un título huérfano. */}
        {herramientas.length > 0 ? (
          <section aria-labelledby="titulo-herramientas" className="mb-8">
            <h2 id="titulo-herramientas" className="mb-4 text-xl font-bold text-slate-900">
              Otras herramientas
            </h2>
            <div className={GRILLA}>
              {herramientas.map((h) => (
                <TarjetaHerramienta key={h.id} herramienta={h} />
              ))}
            </div>
          </section>
        ) : null}

        {/* GRID INFERIOR: SideRailLeft (novedades + próximas actualizaciones)
            y el panel de ayuda con el botón de reporte. */}
        <div
          className="
            grid grid-cols-1 min-h-0
            xl:grid-cols-[320px_minmax(0,1fr)]
            2xl:grid-cols-[360px_minmax(0,1fr)]
            gap-8 2xl:gap-12
          "
        >
          <div className="hidden xl:block min-h-0">
            <SideRailLeft enPreparacion={enPreparacion} />
          </div>

          <div className="min-w-0">
            {/* Clases escritas a mano en vez de la utilidad .panel: .panel
                incluye overflow-hidden, y acá adentro hay texto que tiene que
                poder crecer sin que se le corte nada. */}
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow backdrop-blur sm:p-8">
              <h2 className="text-lg font-bold text-slate-800">Antes de liquidar</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Cada tarjeta indica hasta qué mes están cargadas sus escalas
                salariales, y el recibo avisa si alguna tabla que usó no es la
                del período que estás liquidando.
              </p>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                ¿Falta tu convenio, o algún número no cuadra? Contanos: es la
                vía por la que se priorizan los que vienen.
              </p>
              <div className="mt-5">
                <button
                  ref={reportBtnRef}
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                >
                  Reportar error / sugerencia
                </button>
              </div>
            </section>
          </div>
        </div>

        <div className="xl:hidden mt-4">
          <button
            type="button"
            onClick={() => setShowExtras(true)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-800"
          >
            Novedades / Actualizaciones
          </button>
        </div>

        {/* `convenio` viaja sólo si la persona venía buscando algo: así, cuando
            el pedido sale de una búsqueda sin resultados, el reporte ya dice
            cuál era. (ReportModal reenvía una lista fija de campos y `pagina`
            no está en esa lista; se deja igual que antes para no cambiarle el
            contrato al modal.) */}
        <ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          triggerRef={reportBtnRef}
          context={{ pagina: "Home Principal", convenio: consulta.trim() || undefined }}
        />
      </div>

      <MobileExtras
        open={showExtras}
        onClose={() => setShowExtras(false)}
        onReport={() => setShowReport(true)}
      />
      <footer className="border-t border-slate-200 mt-10">
        <div className="w-full px-4 sm:px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center gap-2">
          <span>© {new Date().getFullYear()} LiquidAR.ar.</span>
          <span className="text-slate-500">Versión {APP_VERSION}</span>
          <span className="basis-full sm:basis-auto sm:ml-auto text-slate-500">
            Herramienta independiente de simulación, hecha por un contador. Consultas y errores: el botón
            &quot;Reportar error / sugerencia&quot;.
          </span>
        </div>
      </footer>
    </div>
  );
}
