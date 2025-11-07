"use client";
import { useState, useEffect, useMemo } from "react";

import { loadEscalasFromSheets } from "../lib/loadEscalasFromSheets";
import { calcularPublico } from "../lib/calculoPublico";
import { calcularComercio } from "../lib/calculoComercio";

import Parametros from "../components/Parametros";
import Resultados from "../components/Resultados";

export default function Home() {
  const [escalas, setEscalas] = useState(null);

  // Estado UI
  const [sector, setSector] = useState("publico");               // "publico" | "privado"
  const [subRegimen, setSubRegimen] = useState("administracion"); // administracion | sisp | obras
  const [mes, setMes] = useState("");                             // YYYY-MM
  const [categoria, setCategoria] = useState("");                 // clave de categoría
  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35");                   // 35/40/48 (público), 48 (comercio)
  const [titulo, setTitulo] = useState("ninguno");                // ninguno | terciario | universitario
  const [funcion, setFuncion] = useState(0);
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  // CARGAR ESCALAS (Sheets)
  useEffect(() => {
    loadEscalasFromSheets().then((data) => {
      console.log("ESCALAS CARGADAS ▶️", data);
      setEscalas(data);
    });
  }, []);

  // Selección de bloque de escalas según sector/subrégimen
  const escalasSector = useMemo(() => {
    if (!escalas) return null;
    return sector === "publico"
      ? escalas.publico[subRegimen]
      : escalas.privado.comercio;
  }, [sector, subRegimen, escalas]);

  // Reset suave cuando cambia la fuente de datos
  useEffect(() => {
    setMes("");
    setCategoria("");
    setRegimen(sector === "privado" ? "48" : "35");
  }, [sector, subRegimen]);

  // Meses disponibles
  const mesesDisponibles = useMemo(() => {
    if (!escalasSector) return [];
    return Object.keys(escalasSector ?? {}).sort();
  }, [escalasSector]);

  // Si no hay mes seleccionado, usar el primero disponible
  useEffect(() => {
    if (mesesDisponibles.length > 0 && !mes) setMes(mesesDisponibles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesDisponibles]);

  // Categorías disponibles para el mes actual
  const categoriasDisponibles = useMemo(() => {
    if (!mes || !escalasSector?.[mes]?.categoria) return [];
    return Object.keys(escalasSector[mes].categoria);
  }, [mes, escalasSector]);

  // Si no hay categoría seleccionada, usar la primera disponible
  useEffect(() => {
    if (categoriasDisponibles.length > 0 && !categoria) {
      setCategoria(categoriasDisponibles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriasDisponibles]);

  // Revalidar mes/categoría al cambiar data
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
          Cargando escalas salariales desde Google Sheets…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Calculadora de Sueldos – Tandil
          </h1>
          <p className="opacity-90 mt-1 text-sm md:text-base">
            Cálculo para sector público (Adm. Central, SISP, Obras) y Empleados de Comercio.
          </p>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
          {/* Panel de parámetros */}
          <section className="bg-white/90 backdrop-blur rounded-2xl shadow p-5 border border-slate-100">
            <Parametros
              sector={sector}
              setSector={setSector}
              subRegimen={subRegimen}
              setSubRegimen={setSubRegimen}
              categoria={categoria}
              setCategoria={setCategoria}
              mes={mes}
              setMes={setMes}
              mesesDisponibles={mesesDisponibles}
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

          {/* Panel de resultados */}
          <section className="bg-white/90 backdrop-blur rounded-2xl shadow p-5 border border-slate-100">
            <Resultados r={r} money={money} />
          </section>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          * Los valores se calculan con datos de Google Sheets y reglas provistas por vos. Verificá siempre contra la liquidación oficial.
        </p>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} Calculadora Tandil — Next.js + Tailwind.
        </div>
      </footer>
    </div>
  );
}
