"use client";
import { useState, useEffect, useMemo, useRef } from "react";

import { loadEscalasFromSheets } from "../lib/loadEscalasFromSheets";
import { calcularPublico } from "../lib/calculoPublico";
import { calcularComercio } from "../lib/calculoComercio";

import Parametros from "../components/Parametros";
import Resultados from "../components/Resultados";
import ReportModal from "../components/ReportModal";
import SideRailLeft from "../components/SideRailLeft";
import SideRailRight from "../components/SideRailRight";
import MobileExtras from "../components/MobileExtras";

export default function Home() {
  const [escalas, setEscalas] = useState(null);

  // Estado UI
  const [sector, setSector] = useState("publico");
  const [convenio, setConvenio] = useState("municipalidad");
  const [subRegimen, setSubRegimen] = useState("administracion");

  const [mes, setMes] = useState("");
  const [categoria, setCategoria] = useState("");

  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35");
  const [titulo, setTitulo] = useState("ninguno");
  const [funcion, setFuncion] = useState(0);
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  // Modal / extras
  const [showReport, setShowReport] = useState(false);
  const reportBtnRef = useRef(null);
  const [showExtras, setShowExtras] = useState(false);

  // Cargar escalas
  useEffect(() => {
    loadEscalasFromSheets().then((data) => {
      console.log("ESCALAS CARGADAS ▶️", data);
      setEscalas(data);
    });
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
  }, [sector]);

  // Selección de bloque de escalas
  const escalasSector = useMemo(() => {
    if (!escalas) return null;
    if (sector === "publico" && convenio === "municipalidad") {
      return escalas.publico[subRegimen];
    }
    if (sector === "privado" && convenio === "comercio") {
      return escalas.privado.comercio;
    }
    return null;
  }, [escalas, sector, convenio, subRegimen]);

  // Meses disponibles
  const mesesDisponibles = useMemo(() => {
    if (!escalasSector) return [];
    return Object.keys(escalasSector ?? {}).sort();
  }, [escalasSector]);

  // Auto-selección de mes
  useEffect(() => {
    if (mesesDisponibles.length > 0 && !mes) setMes(mesesDisponibles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesDisponibles]);

  // Categorías disponibles
  const categoriasDisponibles = useMemo(() => {
    if (!mes || !escalasSector?.[mes]?.categoria) return [];
    return Object.keys(escalasSector[mes].categoria);
  }, [mes, escalasSector]);

  // Auto-selección de categoría
  useEffect(() => {
    if (categoriasDisponibles.length > 0 && !categoria) {
      setCategoria(categoriasDisponibles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriasDisponibles]);

  // Revalidar mes/categoría si cambia la fuente
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalasSector, mes, categoria]);

  // Cálculo
  const r = useMemo(() => {
    if (!escalasSector || !mes || !categoria) return null;
    const entry = escalasSector[mes]?.categoria?.[categoria];
    if (!entry) return null;

    return sector === "publico"
      ? calcularPublico({
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
        })
      : calcularComercio({
          entry,
          aniosAntiguedad,
          titulo,
          funcion,
          horas50,
          horas100,
          descuentosExtras,
          noRemunerativo,
        });
  }, [
    escalasSector,
    mes,
    categoria,
    sector,
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

  if (!escalas) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="p-6 text-center text-lg text-slate-700 bg-white shadow rounded-xl">
          Cargando escalas salariales…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white">
        <div
          className="w-full mx-auto px-6 py-10"
          style={{ maxWidth: "min(98vw, 2000px)" }}
        >
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Calculadora de Sueldos
          </h1>
          <p className="opacity-90 mt-1 text-sm md:text-base">
            Cálculo para sector público y privado.
          </p>
        </div>
      </header>

      {/* CONTENIDO */}
      <main
        className="w-full mx-auto px-6 py-8"
        style={{ maxWidth: "min(98vw, 2000px)" }}
      >
        {/* Grilla 3 columnas (rail izq / contenido / rail der) */}
        <div className="
          grid grid-cols-1
          xl:grid-cols-[280px_minmax(0,1fr)_300px]
          2xl:grid-cols-[320px_minmax(0,1.8fr)_360px]
          gap-8 2xl:gap-12
        ">
          {/* Izquierda */}
          <div className="hidden xl:block">
            <SideRailLeft />
          </div>

          {/* Contenido principal */}
          <div className="
  grid grid-cols-1
  lg:grid-cols-2
  xl:grid-cols-[1.25fr_1.25fr]
  2xl:grid-cols-[1.3fr_1.4fr]
  gap-8 2xl:gap-12
">

            <section className="min-w-0 bg-white/90 backdrop-blur rounded-2xl shadow p-6 border border-slate-100">
              <Parametros
                sector={sector}
                setSector={setSector}
                convenio={convenio}
                setConvenio={setConvenio}
                subRegimen={subRegimen}
                setSubRegimen={setSubRegimen}
                mes={mes}
                setMes={setMes}
                mesesDisponibles={mesesDisponibles}
                categoria={categoria}
                setCategoria={setCategoria}
                categoriasDisponibles={categoriasDisponibles}
                aniosAntiguedad={aniosAntiguedad}
                setAniosAntiguedad={setAniosAntiguedad}
                regimen={regimen}
                setRegimen={setRegimen}
                titulo={titulo}
                setTitulo={setTitulo}
                funcion={funcion}
                setFuncion={setFuncion}
                horas50={horas50}
                setHoras50={setHoras50}
                horas100={horas100}
                setHoras100={setHoras100}
                descuentosExtras={descuentosExtras}
                setDescuentosExtras={setDescuentosExtras}
                noRemunerativo={noRemunerativo}
                setNoRemunerativo={setNoRemunerativo}
              />
            </section>

            <section className="min-w-0 bg-white/90 backdrop-blur rounded-2xl shadow p-6 border border-slate-100">
              <Resultados r={r} money={money} />
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
          </div>

          {/* Derecha */}
          <div className="hidden xl:block">
            <SideRailRight r={r} money={money} onReport={() => setShowReport(true)} />
          </div>
        </div>

        {/* Botón móvil para abrir extras (drawer) */}
        <div className="xl:hidden mt-4">
          <button
            type="button"
            onClick={() => setShowExtras(true)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-800"
          >
            Ver herramientas y resumen
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          * Los valores se calculan con datos publicados y reglas vigentes. Verificá siempre con la liquidación oficial.
        </p>

        {/* Modal de reportes */}
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

      {/* Drawer móvil con extras */}
      <MobileExtras
        open={showExtras}
        onClose={() => setShowExtras(false)}
        r={r}
        money={money}
        onReport={() => setShowReport(true)}
      />

      {/* FOOTER */}
      <footer className="border-t border-slate-200 mt-10">
        <div
          className="w-full mx-auto px-6 py-4 text-xs text-slate-500"
          style={{ maxWidth: "min(98vw, 2000px)" }}
        >
          © {new Date().getFullYear()} Calculadora de Sueldos.
        </div>
      </footer>
    </div>
  );
}
