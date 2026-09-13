// app/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import ReportModal from "../components/ReportModal";
import SideRailLeft from "../components/SideRailLeft";
import MobileExtras from "../components/MobileExtras";
import { herramientasDisponibles, estiloDeSector, estiloDeHerramienta } from "@/lib/herramientas";

const APP_VERSION = "v1.5.0";

export default function Home() {
  const [convenios, setConvenios] = useState([]);
  // Los convenios inactivos son los que se están preparando: se muestran en
  // "Próximas actualizaciones" en vez de estar escritos a mano en el código.
  const [enPreparacion, setEnPreparacion] = useState([]);
  const [cargando, setCargando] = useState(true);

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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-x-hidden">
      <main className="w-full px-6 py-8 min-h-[100dvh]">
        
        {/* HERO / LANDING (Tu diseño original intacto) */}
        <section className="mb-8 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
            <div className="flex-1 space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-[11px] font-medium text-emerald-900">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Calculadora de sueldos
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Simulá tu recibo de sueldo en segundos.
              </h1>
              <p className="text-sm sm:text-base text-slate-700 max-w-xl">
                Elegí tu convenio, completá algunos datos básicos y obtené una
                liquidación estimada, con detalle de remunerativos, no
                remunerativos y descuentos.
              </p>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Tarjetas Dinámicas de Firebase */}
              {cargando ? (
                <div className="col-span-full text-center text-sm text-emerald-700 py-4 font-medium animate-pulse">
                  Cargando calculadoras...
                </div>
              ) : (
                convenios.map((conv) => {
                  const estilos = estiloDeSector(conv.sector);
                  return (
                    <Link
                      key={conv.id}
                      href={`/calcular/${conv.id}`}
                      className={`group flex flex-col items-start justify-between rounded-2xl border bg-white/80 px-4 py-3 text-left shadow-sm hover:shadow-md transition-all ${estilos.border}`}
                    >
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${estilos.texto}`}>
                        {estilos.sector}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {conv.nombre}
                      </div>
                      {/* Antes decía "Liquidación actualizada" para todos, siempre,
                          incluso con las escalas congeladas hace dos meses. Ahora
                          dice hasta cuándo llegan de verdad. */}
                      <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                        CCT {conv.cct || "Vigente"}
                        {conv.ultimo_periodo_nombre ? ` · Escalas hasta ${conv.ultimo_periodo_nombre}` : ""}
                      </p>
                      <span className={`mt-2 text-[11px] font-medium group-hover:underline ${estilos.texto}`}>
                        Comenzar →
                      </span>
                    </Link>
                  );
                })
              )}

              {/* Herramientas: salen de lib/herramientas.js. Antes la del Panel
                  Empleador era un <Link> escrito a mano acá, así que sumar una
                  calculadora nueva implicaba editar la portada. */}
              {herramientasDisponibles().map((h) => {
                const estilo = estiloDeHerramienta(h.color);
                return (
                  <Link
                    key={h.id}
                    href={h.href}
                    className={`group flex flex-col items-start justify-between rounded-2xl border bg-white/80 px-4 py-3 text-left shadow-sm hover:shadow-md transition-all ${estilo.border}`}
                  >
                    <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${estilo.texto}`}>
                      {h.etiqueta}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{h.nombre}</div>
                    <p className="mt-1 text-[11px] text-slate-600">{h.descripcion}</p>
                    <span className={`mt-2 text-[11px] font-medium group-hover:underline ${estilo.texto}`}>
                      {h.accion} →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* GRID INFERIOR: SideRailLeft fijo + Panel de Novedades */}
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

          <div className="grid grid-cols-1 min-h-0 gap-8 2xl:gap-12">
            <section className="min-w-0 bg-white/90 backdrop-blur rounded-2xl shadow p-10 border border-slate-100 flex flex-col items-center justify-center text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">¡Todo listo para liquidar!</h2>
              <p className="text-sm text-slate-600 max-w-md">
                Elegí un convenio de arriba para entrar a su calculadora. Cada tarjeta
                indica hasta qué mes están cargadas sus escalas salariales, y el recibo
                avisa si alguna tabla que usó no es la del período que estás liquidando.
              </p>
            </section>

            <section className="panel shadow min-h-0">
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

        <ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          triggerRef={reportBtnRef}
          context={{ pagina: "Home Principal" }}
        />
      </main>

      <MobileExtras
        open={showExtras}
        onClose={() => setShowExtras(false)}
        onReport={() => setShowReport(true)}
      />
      <footer className="border-t border-slate-200 mt-10">
        <div className="w-full px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center gap-2">
          <span>© {new Date().getFullYear()} LiquidAR.ar.</span>
          <span className="text-slate-400">Versión {APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}