// app/page.js (estable: sin saltos al scrollear)
"use client";
import { useState, useEffect, useMemo, useRef } from "react";

import { loadEscalasFromSheets } from "../lib/loadEscalasFromSheets";
import { calcularPublico } from "../lib/calculoPublico";
import { calcularComercio } from "../lib/calculoComercio";
import { calculoFEHGRA } from "../lib/calculoFEHGRA";

import Parametros from "../components/Parametros";
import Resultados from "../components/Resultados";
import ReportModal from "../components/ReportModal";
import SideRailLeft from "../components/SideRailLeft";
import MobileExtras from "../components/MobileExtras";
import FunnyEscalasLoader from "../components/FunnyEscalasLoader";

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

  // Vacaciones (controladas en Parámetros)
  const [vacacionesOn, setVacacionesOn] = useState(false);
  const [vacDiasTrabajados, setVacDiasTrabajados] = useState(0);
  const [vacDiasManual, setVacDiasManual] = useState(0);

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

    // si salimos de Privado, apagamos vacaciones
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

  const r = useMemo(() => {
    if (!escalasSector || !mes || !categoria) return null;
    const entry = escalasSector[mes]?.categoria?.[categoria];
    if (!entry) return null;

    // Público municipal
    if (sector === "publico") {
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
    }

    // Privado – Comercio
    if (sector === "privado" && convenio === "comercio") {
      return calcularComercio({
        entry,
        aniosAntiguedad,
        titulo,
        funcion,
        horas50,
        horas100,
        descuentosExtras,
        noRemunerativo,
        cargaHoraria: Number(regimen),

        // Vacaciones integradas (Comercio)
        vacacionesOn,
        vacDiasTrabajados,
        vacDiasManual,
      });
    }

    // Privado – FEHGRA (Hoteles / Gastronomía)
    if (sector === "privado" && convenio === "fehgra") {
      return calculoFEHGRA({
        entry,
        aniosAntiguedad,
        horas50,
        horas100,
        descuentosExtras,
        noRemunerativo,
        cargaHoraria: Number(regimen),

        // Vacaciones también habilitadas para FEHGRA
        vacacionesOn,
        vacDiasTrabajados,
        vacDiasManual,
      });
    }

    return null;
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
    vacacionesOn,
    vacDiasTrabajados,
    vacDiasManual,
  ]);

  const money = (v) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v || 0));

  if (!escalas) return <FunnyEscalasLoader />;

  return (
    // 🔒 Estabilizamos altura de viewport con 100dvh y quitamos variantes "short-*"
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-x-hidden">
      <main className="w-full px-6 py-8 min-h-[100dvh]">
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

          {/* Parámetros arriba, Resultados abajo */}
          <div className="grid grid-cols-1 min-h-0 gap-8 2xl:gap-12">
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
                vacacionesOn={vacacionesOn}
                setVacacionesOn={setVacacionesOn}
                vacDiasTrabajados={vacDiasTrabajados}
                setVacDiasTrabajados={setVacDiasTrabajados}
                vacDiasManual={vacDiasManual}
                setVacDiasManual={setVacDiasManual}
              />
            </section>

            <section className="panel shadow min-h-0">
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
        <div className="w-full px-6 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} LiquidAR.
        </div>
      </footer>
    </div>
  );
}
