"use client";

import { useEffect, useState } from "react";
import ConvenioLayout from "@/components/core/ConvenioLayout";
import ParametrosUtghra from "./ParametrosUtghra";
import ResultadoUtghra from "./ResultadoUtghra";
import { calculoFEHGRA } from "@/lib/calculoFEHGRA";
import { loadEscalasFromSheets } from "@/lib/loadEscalasFromSheets";

/**
 * CalculadoraUtghra
 * -----------------
 * Conecta:
 * - Escalas de Hoteles / Gastronomía (FEHGRA) desde Google Sheets
 * - Motor de cálculo (calculoFEHGRA)
 * - Formulario de parámetros (ParametrosUtghra)
 * - UI de resultados (ResultadoUtghra)
 */

export default function CalculadoraUtghra() {
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
        console.error("Error cargando escalas FEHGRA:", err);
        if (!cancelled) {
          setError("No se pudieron cargar las escalas de Hoteles y Gastronomía.");
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
        Cargando escalas de Hoteles y Gastronomía…
      </section>
    );
  }

  const fehgraEscalas = escalas?.privado?.fehgra || {};
  const mesesDisponibles = Object.keys(fehgraEscalas).sort().reverse();

  if (mesesDisponibles.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No se encontraron escalas de Hoteles y Gastronomía en los datos cargados.
      </section>
    );
  }

  const mesDefault = mesesDisponibles[0];

  const categoriasPorMes = Object.fromEntries(
    mesesDisponibles.map((m) => {
      const catObj = fehgraEscalas[m]?.categoria || {};
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

    // adicionales del convenio
    asistenciaPerfecta: true,
    complementoServicio: true,
    tipoAporteSindical: "ninguno",

    // vacaciones
    vacacionesOn: false,
    vacDiasTrabajados: 0,
    vacDiasManual: 0,

    // obra social
    obraSocialBase: "real",
  };

  const calcular = (params) => {
    const mes = params.mes || mesDefault;
    const categoria = params.categoria || categoriaDefault;

    const escalaMes = fehgraEscalas[mes];
    const entryRaw = escalaMes?.categoria?.[categoria];

    if (!entryRaw) {
      return null;
    }

    // Adaptar la estructura de la escala a lo que espera el motor:
    // entry: { basico, noRem, presentismo }
    const entry = {
      basico: Number(entryRaw.basico || 0),
      noRem: Number(entryRaw.noRem || 0),
      presentismo: Number(entryRaw.presentismo || 0),
    };

    return calculoFEHGRA({
      entry,
      aniosAntiguedad: Number(params.aniosAntiguedad || 0),
      horas50: Number(params.horas50 || 0),
      horas100: Number(params.horas100 || 0),
      descuentosExtras: Number(params.descuentosExtras || 0),
      noRemunerativo: Number(params.noRemunerativo || 0),
      cargaHoraria: Number(params.regimen || 48),
      divisorHoras: 200,
      asistenciaPerfecta: !!params.asistenciaPerfecta,
      complementoServicio: !!params.complementoServicio,
      tipoAporteSindical: params.tipoAporteSindical || "ninguno",
      vacacionesOn: !!params.vacacionesOn,
      vacDiasTrabajados: Number(params.vacDiasTrabajados || 0),
      vacDiasManual: Number(params.vacDiasManual || 0),
      obraSocialBase: params.obraSocialBase || "real",
    });
  };

  return (
    <ConvenioLayout
      titulo="Hoteles y Gastronomía (UTGHRA–FEHGRA)"
      Parametros={ParametrosUtghra}
      Resultado={ResultadoUtghra}
      estadoInicial={estadoInicial}
      calcular={calcular}
    />
  );
}
