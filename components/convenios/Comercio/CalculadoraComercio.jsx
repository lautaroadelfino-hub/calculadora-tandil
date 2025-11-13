"use client";

import { useEffect, useState } from "react";
import ConvenioLayout from "@/components/core/ConvenioLayout";
import ParametrosComercio from "./ParametrosComercio";
import ResultadoComercio from "./ResultadoComercio";
import { calculoComercio } from "@/lib/calculoComercio";
import { loadEscalasFromSheets } from "@/lib/loadEscalasFromSheets";

/**
 * CalculadoraComercio
 * -------------------
 * Conecta:
 * - Escalas de Comercio desde Google Sheets (loadEscalasFromSheets)
 * - Motor de cálculo (calculoComercio)
 * - Formulario de parámetros (ParametrosComercio)
 * - UI de resultados (ResultadoComercio)
 */

export default function CalculadoraComercio() {
  const [escalas, setEscalas] = useState(null);
  const [error, setError] = useState(null);

  // Carga inicial de escalas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadEscalasFromSheets();
        if (!cancelled) {
          setEscalas(data);
        }
      } catch (err) {
        console.error("Error cargando escalas:", err);
        if (!cancelled) {
          setError("No se pudieron cargar las escalas de Comercio.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </section>
    );
  }

  if (!escalas) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
        Cargando escalas de Comercio…
      </section>
    );
  }

  const comercioEscalas = escalas?.privado?.comercio || {};
  const mesesDisponibles = Object.keys(comercioEscalas).sort().reverse();

  if (mesesDisponibles.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No se encontraron escalas de Comercio en los datos cargados.
      </section>
    );
  }

  const mesDefault = mesesDisponibles[0];

  const categoriasPorMes = Object.fromEntries(
    mesesDisponibles.map((m) => {
      const catObj = comercioEscalas[m]?.categoria || {};
      return [m, Object.keys(catObj)];
    })
  );

  const categoriasDefault = categoriasPorMes[mesDefault] || [];
  const categoriaDefault = categoriasDefault[0] || "";

  // Estado inicial que usará ConvenioLayout
  const estadoInicial = {
    // selección de escala
    mes: mesDefault,
    mesesDisponibles,
    categoria: categoriaDefault,
    categoriasPorMes,

    // parámetros de cálculo
    aniosAntiguedad: 0,
    regimen: "48",
    horas50: 0,
    horas100: 0,
    descuentosExtras: 0,
    noRemunerativo: 0,

    // vacaciones
    vacacionesOn: false,
    vacDiasTrabajados: 0,
    vacDiasManual: 0,

    // obra social
    obraSocialBase: "48+extras+vac",
  };

  const calcular = (params) => {
    const mes = params.mes || mesDefault;
    const categoria = params.categoria || categoriaDefault;

    const escalaMes = comercioEscalas[mes];
    const entryRaw = escalaMes?.categoria?.[categoria];

    if (!entryRaw) {
      return null;
    }

    // Adaptar la estructura de la escala a lo que espera el motor:
    // entry: { basico48, noRem, presentismo }
    const entry = {
      basico48: Number(entryRaw.basico || 0),
      noRem: Number(entryRaw.noRem || 0),
      presentismo: Number(entryRaw.presentismo || 0),
    };

    return calculoComercio({
      entry,
      aniosAntiguedad: Number(params.aniosAntiguedad || 0),
      horas50: Number(params.horas50 || 0),
      horas100: Number(params.horas100 || 0),
      descuentosExtras: Number(params.descuentosExtras || 0),
      noRemunerativo: Number(params.noRemunerativo || 0),
      cargaHoraria: Number(params.regimen || 48),
      divisorHoras: 200,
      vacacionesOn: !!params.vacacionesOn,
      vacDiasTrabajados: Number(params.vacDiasTrabajados || 0),
      vacDiasManual: Number(params.vacDiasManual || 0),
      obraSocialBase: params.obraSocialBase || "48+extras+vac",
    });
  };

  return (
    <ConvenioLayout
      titulo="Empleados de Comercio (CCT 130/75)"
      Parametros={ParametrosComercio}
      Resultado={ResultadoComercio}
      estadoInicial={estadoInicial}
      calcular={calcular}
    />
  );
}
