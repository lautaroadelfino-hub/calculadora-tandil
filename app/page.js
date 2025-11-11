"use client";
import { useState, useEffect, useMemo, useRef } from "react";

import { loadEscalasFromSheets } from "../lib/loadEscalasFromSheets";
import { calcularPublico } from "../lib/calculoPublico";
import { calcularComercio } from "../lib/calculoComercio";

import Parametros from "../components/Parametros";
import Resultados from "../components/Resultados";
import ReportModal from "../components/ReportModal";
import SideRailLeft from "../components/SideRailLeft";
import MobileExtras from "../components/MobileExtras";
import FunnyEscalasLoader from "../components/FunnyEscalasLoader";
import VacacionesModal from "../components/VacacionesModal"; // <<< NUEVO

export default function Home() {
  const [escalas, setEscalas] = useState(null);

  // Estado UI
  const [sector, setSector] = useState("publico");
  const [convenio, setConvenio] = useState("municipalidad");
  const [subRegimen, setSubRegimen] = useState("administracion");

  const [mes, setMes] = useState("");
  const [categoria, setCategoria] = useState("");

  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35"); // sigue usándose como horas/semana
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

  // Vacaciones (Comercio)
  const [showVac, setShowVac] = useState(false);                 // <<< NUEVO
  const [vac, setVac] = useState({ dias: 0, brutoRef: 0 });      // <<< NUEVO

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
      setRegimen("48"); // por defecto full-time comercio
      setSubRegimen("administracion");
    }
    setMes("");
    setCategoria("");
  }, [sector]);

  // Si salimos de Privado/Comercio, reseteamos vacaciones
  useEffect(() => {
    if (!(sector === "privado" && convenio === "comercio")) {
      setVac({ dias: 0, brutoRef: 0 });
      setShowVac(false);
    }
  }, [sector, convenio]);

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

  const mesesDisponibles = useMemo(() => {
    if (!escalasSector) return [];
    return Object.keys(escalasSector ?? {}).sort();
  }, [escalasSector]);

  useEffect(() => {
    if (mesesDisponibles.length > 0 && !mes) setMes(mesesDisponibles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesDisponibles]);

  const categoriasDisponibles = useMemo(() => {
    if (!mes || !escalasSector?.[mes]?.categoria) return [];
    return Object.keys(escalasSector[mes].categoria);
  }, [mes, escalasSector]);

  useEffect(() => {
    if (categoriasDisponibles.length > 0 && !categoria) {
      setCategoria(categoriasDisponibles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriasDisponibles]);

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

  const r = useMemo(() => {
    if (!escalasSector || !mes || !categoria) return null;
    const entry = escalasSector[mes]?.categoria?.[categoria];
    if (!entry) return null;

    return sector === "publico"
      ? calcularPublico({
          entry,
          regimen, // lo que ya usabas para público (35/…)
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
          // el mismo "regimen" como horas/semana para Comercio
          cargaHoraria: Number(regimen),
          // <<< NUEVO: vacaciones integradas al cálculo
          vacacionesDias:
            sector === "privado" && convenio === "comercio" ? vac.dias : 0,
          vacacionesBrutoRef:
            sector === "privado" && convenio === "comercio" ? vac.brutoRef : 0,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    vac, // <<< NUEVO (recalcula cuando se aplican vacaciones)
  ]);

  const money = (v) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v || 0));

  if (!escalas) return <FunnyEscalasLoader />;

  // Sugerimos como bruto de referencia el rem+no rem del resultado actual (editable en el modal)
  const brutoMensualSugerido = r
    ? Number(r.totalRemunerativo || 0) + Number(r.totalNoRemunerativo || 0)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white">
      {/* padding y altura seguros en todas las vistas, incluida 1280×720 */}
      <main className="w-full px-6 py-8 short-xl:py-4 min-h-[calc(100svh-var(--h-header))]">
        <div
          className="
            grid grid-cols-1 min-h-0
            xl:grid-cols-[320px_minmax(0,1fr)]
            2xl:grid-cols-[360px_minmax(0,1fr)]
            gap-8 2xl:gap-12 short-xl:gap-6
          "
        >
          <div className="hidden xl:block min-h-0">
            <SideRailLeft />
          </div>

          {/* Siempre apilado (Parámetros arriba, Resultados abajo) */}
          <div
            className="
              grid grid-cols-1 min-h-0
              gap-8 2xl:gap-12 short-xl:gap-6
            "
          >
            <section className="min-w-0 bg-white/90 backdrop-blur rounded-2xl shadow p-6 short-xl:p-4 border border-slate-100">
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
                setRegimen={setRegimen} // el mismo control maneja las horas
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

            {/* panel de resultados debajo de parámetros */}
            <section className="panel shadow min-h-0">
              <Resultados r={r} money={money} />

              <div className="mt-5 short-xl:mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  ref={reportBtnRef}
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900"
                >
                  Reportar error / sugerencia
                </button>

                {/* Botón: Liquidar vacaciones (solo Comercio) */}
                {sector === "privado" && convenio === "comercio" && r && (
                  <button
                    type="button"
                    onClick={() => setShowVac(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  >
                    Liquidar vacaciones (base 25)
                  </button>
                )}
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

        <p className="text-xs text-slate-500 mt-6">
          * Los valores se calculan con datos publicados y reglas vigentes. Verificá siempre con la liquidación oficial.
        </p>

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

        {/* Modal de vacaciones */}
        <VacacionesModal
          open={showVac}
          onClose={() => setShowVac(false)}
          aniosAntiguedad={aniosAntiguedad}
          brutoMensual={brutoMensualSugerido}
          money={money}
          onConfirm={({ dias, brutoRef }) => setVac({ dias, brutoRef })}
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
          © {new Date().getFullYear()} Calculadora de Sueldos.
        </div>
      </footer>
    </div>
  );
}
