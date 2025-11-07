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
  const [sector, setSector] = useState("publico");
  const [subRegimen, setSubRegimen] = useState("administracion"); // público
  const [convenio] = useState("municipalidad"); // fijo por ahora
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

  // CARGAR ESCALAS
useEffect(() => {
  loadEscalasFromSheets().then((data) => {
    console.log("ESCALAS CARGADAS ▶️", data);
    setEscalas(data);
  });
}, []);

// SELECCION DE ESCALAS SEGÚN SECTOR
const escalasSector = useMemo(() => {
  if (!escalas) return null;

  return sector === "publico"
    ? escalas.publico[subRegimen]
    : escalas.privado.comercio;
}, [sector, subRegimen, escalas]);

// MESES DISPONIBLES
const mesesDisponibles = useMemo(() => {
  if (!escalasSector) return [];
  return Object.keys(escalasSector ?? {}).sort();
}, [escalasSector]);

useEffect(() => {
  if (mesesDisponibles.length > 0 && !mes) setMes(mesesDisponibles[0]);
}, [mesesDisponibles]);

// CATEGORÍAS DISPONIBLES
const categoriasDisponibles = useMemo(() => {
  if (!mes || !escalasSector?.[mes]?.categoria) return [];
  return Object.keys(escalasSector[mes].categoria);
}, [mes, escalasSector]);

useEffect(() => {
  if (categoriasDisponibles.length > 0 && !categoria) {
    setCategoria(categoriasDisponibles[0]);
  }
}, [categoriasDisponibles]);


  // CALCULAR
  const r = useMemo(() => {
    if (!escalasSector || !mes || !categoria) return null;

    const entry = escalasSector[mes].categoria[categoria];

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
    }).format(v || 0);

  if (!escalas) {
    return (
      <div className="p-6 text-center text-lg text-slate-600">
        Cargando escalas salariales desde Google Sheets…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">
        Calculadora de Sueldos – Tandil
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <Resultados r={r} money={money} />
      </div>
    </div>
  );
}
