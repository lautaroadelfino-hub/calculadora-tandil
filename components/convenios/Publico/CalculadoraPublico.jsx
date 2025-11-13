"use client";

import { useEffect, useState } from "react";
import ConvenioLayout from "@/components/core/ConvenioLayout";
import ParametrosPublico from "./ParametrosPublico";
import ResultadoPublico from "./ResultadoPublico";
import { calcularPublico } from "@/lib/calculoPublico";
import { loadEscalasFromSheets } from "@/lib/loadEscalasFromSheets";

/**
 * CalculadoraPublico
 * ------------------
 * Conecta:
 * - Escalas de Municipalidad de Tandil (Adm. Central, SISP, Obras)
 * - Motor de cálculo (calcularPublico)
 * - Formulario (ParametrosPublico)
 * - Resultados (ResultadoPublico)
 */

export default function CalculadoraPublico() {
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
        console.error("Error cargando escalas público:", err);
        if (!cancelled) {
          setError("No se pudieron cargar las escalas de la Municipalidad de Tandil.");
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
        Cargando escalas de la Municipalidad de Tandil…
      </section>
    );
  }

  const publicoEscalas = escalas?.publico || {};
  const subRegimenes = Object.keys(publicoEscalas);

  if (subRegimenes.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No se encontraron escalas de la Municipalidad en los datos cargados.
      </section>
    );
  }

  const defaultSub =
    subRegimenes.includes("administracion") ? "administracion" : subRegimenes[0];

  // Armar meses y categorías por sub-régimen
  const mesesPorSubRegimen = {};
  const categoriasPorSubRegimen = {};

  for (const sub of subRegimenes) {
    const escSub = publicoEscalas[sub] || {};
    const meses = Object.keys(escSub).sort().reverse();
    mesesPorSubRegimen[sub] = meses;

    const catPorMes = {};
    for (const m of meses) {
      const catObj = escSub[m]?.categoria || {};
      catPorMes[m] = Object.keys(catObj);
    }
    categoriasPorSubRegimen[sub] = catPorMes;
  }

  const mesesDefault = mesesPorSubRegimen[defaultSub] || [];
  const mesDefault = mesesDefault[0] || "";
  const catsDefault =
    (categoriasPorSubRegimen[defaultSub] || {})[mesDefault] || [];
  const categoriaDefault = catsDefault[0] || "";

  const estadoInicial = {
    subRegimen: defaultSub,
    mesesPorSubRegimen,
    categoriasPorSubRegimen,

    mes: mesDefault,
    categoria: categoriaDefault,

    aniosAntiguedad: 0,
    regimen: "35",
    titulo: "ninguno",
    funcion: 0,
    horas50: 0,
    horas100: 0,
    descuentosExtras: 0,
    noRemunerativo: 0,
  };

  const calcular = (params) => {
    const sub = params.subRegimen || defaultSub;
    const meses = mesesPorSubRegimen[sub] || [];
    const escSub = publicoEscalas[sub] || {};

    const mes =
      params.mes && meses.includes(params.mes) ? params.mes : meses[0] || "";

    const catsPorMes = categoriasPorSubRegimen[sub] || {};
    const cats = catsPorMes[mes] || [];
    const categoria =
      params.categoria && cats.includes(params.categoria)
        ? params.categoria
        : cats[0] || "";

    const entryRaw = escSub[mes]?.categoria?.[categoria];

    if (!entryRaw) {
      return null;
    }

    const entry = {
      basico: Number(entryRaw.basico || 0),
      presentismo: Number(entryRaw.presentismo || 0),
    };

    return calcularPublico({
      entry,
      regimen: params.regimen || "35",
      aniosAntiguedad: Number(params.aniosAntiguedad || 0),
      titulo: params.titulo || "ninguno",
      funcion: Number(params.funcion || 0),
      horas50: Number(params.horas50 || 0),
      horas100: Number(params.horas100 || 0),
      descuentosExtras: Number(params.descuentosExtras || 0),
      noRemunerativo: Number(params.noRemunerativo || 0),
      subRegimen: sub,
    });
  };

  return (
    <ConvenioLayout
      titulo="Municipalidad de Tandil"
      Parametros={ParametrosPublico}
      Resultado={ResultadoPublico}
      estadoInicial={estadoInicial}
      calcular={calcular}
    />
  );
}
