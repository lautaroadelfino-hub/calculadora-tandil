// app/page.js
"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

import { loadEscalasFromSheets } from "../lib/loadEscalasFromSheets";
import { calcularPublico } from "../lib/calculoPublico";

import ReportModal from "../components/ReportModal";
import SideRailLeft from "../components/SideRailLeft";
import MobileExtras from "../components/MobileExtras";
import FunnyEscalasLoader from "../components/FunnyEscalasLoader";

// Calculadoras específicas
import CalculadoraComercio from "../components/convenios/Comercio/CalculadoraComercio";
import CalculadoraUtghra from "../components/convenios/Utghra/CalculadoraUtghra";
import CalculadoraPublico from "../components/convenios/Publico/CalculadoraPublico";

const APP_VERSION = "v1.5.0";

export default function Home() {
  const [escalas, setEscalas] = useState(null);

  // Estado UI
  const [sector, setSector] = useState("publico");
  const [convenio, setConvenio] = useState("municipalidad");
  const [subRegimen, setSubRegimen] = useState("administracion");

  const [mes, setMes] = useState("");
  const [categoria, setCategoria] = useState("");

  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35"); // horas/semana
  const [titulo, setTitulo] = useState("ninguno");
  const [funcion, setFuncion] = useState(0);
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  const [vacacionesOn, setVacacionesOn] = useState(false);
  const [vacDiasTrabajados, setVacDiasTrabajados] = useState(0);
  const [vacDiasManual, setVacDiasManual] = useState(0);

  // 🔸 Control para mostrar u ocultar calculadoras
  const [showCalculator, setShowCalculator] = useState(false);

  // Modal / extras
  const [showReport, setShowReport] = useState(false);
  const reportBtnRef = useRef(null);
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    loadEscalasFromSheets().then((data) => setEscalas(data));
  }, []);

  // Defaults al cambiar sector
  useEffect(() => {
    if (sector === "publico") {
      setConvenio("municipalidad");
      setRegimen("35");
    } else {
      setConvenio("comercio");
      setRegimen("48");
      setSubRegimen("administracion");
    }
    setMes("");
    setCategoria("");

    if (sector !== "privado") {
      setVacacionesOn(false);
      setVacDiasTrabajados(0);
      setVacDiasManual(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const escalasSector = useMemo(() => {
    if (!escalas) return null;

    if (sector === "publico" && convenio === "municipalidad") {
      return escalas.publico[subRegimen];
    }

    if (sector === "privado" && convenio === "comercio") {
      return escalas.privado?.comercio;
    }

    if (sector === "privado" && convenio === "fehgra") {
      return escalas.privado?.fehgra;
    }

    return null;
  }, [escalas, sector, convenio, subRegimen]);

  const mesesDisponibles = useMemo(() => {
    if (!escalasSector) return [];
    return Object.keys(escalasSector ?? {}).sort();
  }, [escalasSector]);

  useEffect(() => {
    if (mesesDisponibles.length > 0 && !mes) setMes(mesesDisponibles[0]);
  }, [mesesDisponibles, mes]);

  const categoriasDisponibles = useMemo(() => {
    if (!mes || !escalasSector?.[mes]?.categoria) return [];
    return Object.keys(escalasSector[mes].categoria);
  }, [mes, escalasSector]);

  useEffect(() => {
    if (categoriasDisponibles.length > 0 && !categoria) {
      setCategoria(categoriasDisponibles[0]);
    }
  }, [categoriasDisponibles, categoria]);

  useEffect(() => {
    if (!escalasSector) return;
    const meses = Object.keys(escalasSector);
    if (meses.length === 0) return;

    let mesOK = mes;
    if (!meses.includes(mesOK)) {
      mesOK = meses[0];
      if (mesOK !== mes) setMes(mesOK);
    }

    const cats = Object.keys(escalasSector[mesOK]?.categoria || {});
    if (cats.length === 0) {
      if (categoria !== "") setCategoria("");
      return;
    }
    if (!cats.includes(categoria)) setCategoria(cats[0]);
  }, [escalasSector, mes, categoria]);

  // r solo para público/municipalidad (para contexto en reportes / mobile)
  const r = useMemo(() => {
    if (sector !== "publico" || convenio !== "municipalidad") return null;
    if (!escalasSector || !mes || !categoria) return null;

    const entry = escalasSector[mes]?.categoria?.[categoria];
    if (!entry) return null;

    return calcularPublico({
      entry,
      regimen,
      aniosAntiguedad,
      titulo,
      funcion,
      horas50,
      horas100,
      descuentosExtras,
      noRemunerativo,
      subRegimen,
    });
  }, [
    escalasSector,
    mes,
    categoria,
    sector,
    convenio,
    regimen,
    aniosAntiguedad,
    titulo,
    funcion,
    horas50,
    horas100,
    descuentosExtras,
    noRemunerativo,
    subRegimen,
  ]);

  const money = (v) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v || 0));

  if (!escalas) return <FunnyEscalasLoader />;

  // Handlers hero
  const empezarMunicipalidad = () => {
    setSector("publico");
    setConvenio("municipalidad");
    setShowCalculator(true);
  };

  const empezarComercio = () => {
    setSector("privado");
    setConvenio("comercio");
    setShowCalculator(true);
  };

  const empezarUtghra = () => {
    setSector("privado");
    setConvenio("fehgra");
    setShowCalculator(true);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-x-hidden">
      <main className="w-full px-6 py-8 min-h-[100dvh]">
        {/* HERO / LANDING */}
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
              <button
                type="button"
                onClick={empezarMunicipalidad}
                className="group flex flex-col items-start justify-between rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-emerald-400 transition-all"
              >
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                  Sector público
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Municipalidad de Tandil
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Administración central, Obras Sanitarias y SISP.
                </p>
                <span className="mt-2 text-[11px] font-medium text-emerald-700 group-hover:underline">
                  Comenzar →
                </span>
              </button>

              <button
                type="button"
                onClick={empezarComercio}
                className="group flex flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-slate-400 transition-all"
              >
                <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">
                  Sector privado
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Empleados de Comercio
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  CCT 130/75 – Jornada completa o parcial.
                </p>
                <span className="mt-2 text-[11px] font-medium text-sky-700 group-hover:underline">
                  Comenzar →
                </span>
              </button>

              <button
                type="button"
                onClick={empezarUtghra}
                className="group flex flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-slate-400 transition-all"
              >
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                  Sector privado
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Hoteles y Gastronomía
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  UTGHRA – FEHGRA, con adicionales del convenio.
                </p>
                <span className="mt-2 text-[11px] font-medium text-amber-700 group-hover:underline">
                  Comenzar →
                </span>
              </button>

              {/* Nueva card: Panel Empleador */}
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

        {/* Selector global de sector / convenio SOLO cuando ya hay calculadora */}
        {showCalculator && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {/* Sector */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSector("publico")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  sector === "publico"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sector público
              </button>
              <button
                type="button"
                onClick={() => setSector("privado")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  sector === "privado"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sector privado
              </button>
            </div>

            {/* Convenio dentro de Privado */}
            {sector === "privado" && (
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setConvenio("comercio")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                    convenio === "comercio"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Empleados de Comercio
                </button>
                <button
                  type="button"
                  onClick={() => setConvenio("fehgra")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                    convenio === "fehgra"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hoteles y Gastronomía (UTGHRA)
                </button>
              </div>
            )}
          </div>
        )}

        {/* GRID SIEMPRE: SideRailLeft fijo + panel central */}
        <div
          className="
            grid grid-cols-1 min-h-0
            xl:grid-cols-[320px_minmax(0,1fr)]
            2xl:grid-cols-[360px_minmax(0,1fr)]
            gap-8 2xl:gap-12
          "
        >
          {/* Panel de novedades fijo (desktop) */}
          <div className="hidden xl:block min-h-0">
            <SideRailLeft />
          </div>

          {/* Panel principal + botón de reporte (si hay calculadora) */}
          <div className="grid grid-cols-1 min-h-0 gap-8 2xl:gap-12">
            {/* Calculadora o placeholder */}
            <section className="min-w-0 bg-white/90 backdrop-blur rounded-2xl shadow p-6 border border-slate-100">
              {showCalculator ? (
                <>
                  {sector === "publico" && convenio === "municipalidad" && (
                    <CalculadoraPublico />
                  )}

                  {sector === "privado" && convenio === "comercio" && (
                    <CalculadoraComercio />
                  )}

                  {sector === "privado" && convenio === "fehgra" && (
                    <CalculadoraUtghra />
                  )}
                </>
              ) : (
                <div className="text-sm text-slate-600">
                  Elegí un convenio en la parte superior para iniciar una
                  simulación de recibo de sueldo.
                </div>
              )}
            </section>

            {/* Botón de reporte solo cuando hay calculadora */}
            {showCalculator && (
              <section className="panel shadow min-h-0">
                <div className="mt-5">
                  <button
                    ref={reportBtnRef}
                    type="button"
                    onClick={() => setShowReport(true)}
                    className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900"
                  >
                    Reportar error / sugerencia
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Botón mobile para novedades: SIEMPRE visible */}
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
          context={{
            sector,
            convenio,
            subRegimen,
            mes,
            categoria,
            regimen,
            aniosAntiguedad,
            titulo,
            funcion,
            horas50,
            horas100,
            descuentosExtras,
            noRemunerativo,
            r,
          }}
        />
      </main>

      <MobileExtras
        open={showExtras}
        onClose={() => setShowExtras(false)}
        r={r}
        money={money}
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
