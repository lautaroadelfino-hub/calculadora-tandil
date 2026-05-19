// app/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

import ReportModal from "../components/ReportModal";
import SideRailLeft from "../components/SideRailLeft";
import MobileExtras from "../components/MobileExtras";

const APP_VERSION = "v1.5.0";

export default function Home() {
  const [convenios, setConvenios] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Modal / extras
  const [showReport, setShowReport] = useState(false);
  const reportBtnRef = useRef(null);
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    async function obtenerConveniosActivos() {
      try {
        const q = query(collection(db, "convenios"), where("activo", "==", true));
        const querySnapshot = await getDocs(q);
        
        const lista = [];
        querySnapshot.forEach((doc) => {
          lista.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setConvenios(lista);
      } catch (error) {
        console.error("Error al traer convenios:", error);
      } finally {
        setCargando(false);
      }
    }
    obtenerConveniosActivos();
  }, []);

  // Función para mantener tus colores exactos según el tipo de convenio
  const getEstilosTarjeta = (id, nombre) => {
    const isPublico = id.includes("municipalidad") || nombre.toLowerCase().includes("municipalidad");
    const isGastro = id.includes("fehgra") || id.includes("utghra");

    if (isPublico) {
      return {
        sector: "Sector público",
        border: "border-emerald-200 hover:border-emerald-400",
        textSector: "text-emerald-700",
        textFlecha: "text-emerald-700"
      };
    }
    if (isGastro) {
      return {
        sector: "Sector privado",
        border: "border-slate-200 hover:border-slate-400",
        textSector: "text-amber-700",
        textFlecha: "text-amber-700"
      };
    }
    // Por defecto (Comercio y otros privados)
    return {
      sector: "Sector privado",
      border: "border-slate-200 hover:border-slate-400",
      textSector: "text-sky-700",
      textFlecha: "text-sky-700"
    };
  };

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
                  const estilos = getEstilosTarjeta(conv.id, conv.nombre);
                  return (
                    <Link
                      key={conv.id}
                      href={`/calcular/${conv.id}`}
                      className={`group flex flex-col items-start justify-between rounded-2xl border bg-white/80 px-4 py-3 text-left shadow-sm hover:shadow-md transition-all ${estilos.border}`}
                    >
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${estilos.textSector}`}>
                        {estilos.sector}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {conv.nombre}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                        CCT {conv.cct || "Vigente"} - Liquidación actualizada.
                      </p>
                      <span className={`mt-2 text-[11px] font-medium group-hover:underline ${estilos.textFlecha}`}>
                        Comenzar →
                      </span>
                    </Link>
                  );
                })
              )}

              {/* Card fija: Panel Empleador */}
              <Link
                href="/empleador"
                className="group flex flex-col items-start justify-between rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-emerald-500 transition-all"
              >
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                  Empleadores
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Panel Empleador
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Calculá el costo laboral total de un puesto, con detalle de
                  contribuciones, ART y otros aportes.
                </p>
                <span className="mt-2 text-[11px] font-medium text-emerald-700 group-hover:underline">
                  Abrir panel →
                </span>
              </Link>
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
            <SideRailLeft />
          </div>

          <div className="grid grid-cols-1 min-h-0 gap-8 2xl:gap-12">
            <section className="min-w-0 bg-white/90 backdrop-blur rounded-2xl shadow p-10 border border-slate-100 flex flex-col items-center justify-center text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">¡Todo listo para liquidar!</h2>
              <p className="text-sm text-slate-600 max-w-md">
                Seleccioná uno de los convenios en la parte superior para ingresar a su calculadora específica. Las escalas salariales y retenciones se encuentran actualizadas mediante nuestra base de datos.
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