// lib/calculoComercio.js
// Motor declarativo – Comercio (CCT 130/75)

export function calculoComercio({
  entry,
  aniosAntiguedad = 0,
  titulo = "ninguno",      // "ninguno" | "terciario" | "universitario"
  funcion = 0,             // %
  horas50 = 0,
  horas100 = 0,
  descuentosExtras = 0,    // $ extras manuales
  noRemunerativo = 0,      // $ NR manual (NO se prorratea)
  cargaHoraria = 48,       // hs/sem reales
  divisorHoras = 200,      // divisor base 48 hs

  // Vacaciones
  vacacionesOn = false,
  vacDiasTrabajados = 0,
  vacDiasManual = 0,

  // Cómo calcular la base de Obra Social:
  // "48" -> solo base 48 (sin extras ni vacaciones)
  // "48+extras+vac" -> base 48 + horas extra + plus de vacaciones  (DEFAULT)
  // "real" -> sobre REM_REAL (todo lo remunerativo real)
  obraSocialBase = "48+extras+vac",
} = {}) {

  // ---- util numérico robusto
  const num = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      let s = v.trim(); if (!s) return 0;
      s = s.replace(/[^0-9,.\-]/g, "");
      const hasC = s.includes(","), hasD = s.includes(".");
      if (hasC && hasD) {
        const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
        s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
      } else if (hasC) { s = s.replace(/,/g, "."); }
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ---- entradas y prorrateos
  const ch = Math.max(1, num(cargaHoraria) || 48);
  const factorCH = ch / 48;

  const basico48 =
    num(entry?.basico48) ||
    num(entry?.basico_48) ||
    num(entry?.basico) || 0;

  const nrEscala48 =
    num(entry?.noRem) ||
    num(entry?.no_rem) ||
    num(entry?.noRemuFijo) || 0;

  // ---- remunerativos base (reales)
  const basico = basico48 * factorCH;
  const antiguedad = basico * 0.01 * num(aniosAntiguedad);
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;
  const adicionalFuncion = basico * (num(funcion) / 100);
  const presentismo = (basico + antiguedad) / 12;

  // ---- horas extra
  const horasMensuales = (num(divisorHoras) > 0 ? num(divisorHoras) : 200) * factorCH;
  const baseHora = basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;
  const valorHora = horasMensuales > 0 ? baseHora / horasMensuales : 0;
  const horasExtras50 = valorHora * 1.5 * num(horas50);
  const horasExtras100 = valorHora * 2.0 * num(horas100);
  const montoHorasExtras = horasExtras50 + horasExtras100;

  // ---- vacaciones
  const diasPorAntiguedad = (a, diasTrab = 0) => {
    const an = num(a);
    if (an < 0.5) return Math.max(0, Math.floor(num(diasTrab) / 20));
    if (an < 5)   return 14;
    if (an < 10)  return 21;
    if (an < 20)  return 28;
    return 35;
  };
  const vacDias = vacacionesOn
    ? (num(vacDiasManual) > 0 ? num(vacDiasManual) : diasPorAntiguedad(aniosAntiguedad, vacDiasTrabajados))
    : 0;
  const baseVacNH = basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;
  const vacacionesPlus = vacDias > 0 ? (baseVacNH * vacDias) / 150 : 0;

  // ---- no remunerativos
  const noRemuFijo = nrEscala48 * factorCH;   // prorrateado
  const noRemuOtros = num(noRemunerativo) || 0; // no prorrateado
  const baseNR = noRemuFijo + noRemuOtros;
  const antiguedadNR = baseNR * 0.01 * num(aniosAntiguedad);
  const presentismoNR = (baseNR + antiguedadNR) / 12;

  // ---- totales REM / NR
  const totalRemunerativo =
    basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion +
    horasExtras50 + horasExtras100 + vacacionesPlus;

  const totalNoRemunerativo = baseNR + antiguedadNR + presentismoNR;

  // ---- BASES
  const bases = {
    // 1) Remunerativo real: para Jubilación y PAMI
    REM_REAL: totalRemunerativo,
    // 2) Total real (REM + NR): para Sindicato y FAECyS
    TOTAL_REAL: totalRemunerativo + totalNoRemunerativo,
    // 3) Base 48 “pura” (sin extras ni vacaciones): para OS cuando se elige "48" o como punto de partida
    OS_48: (() => {
      const antig48 = basico48 * 0.01 * num(aniosAntiguedad);
      const titulo48 =
        titulo === "terciario" ? basico48 * 0.15 :
        titulo === "universitario" ? basico48 * 0.20 : 0;
      const funcion48 = basico48 * (num(funcion) / 100);
      const pres48 = (basico48 + antig48 + titulo48 + funcion48) / 12;
      return basico48 + antig48 + titulo48 + funcion48 + pres48;
    })(),
  };

  // ---- Base de OS según modo
  const extrasYVacaciones = montoHorasExtras + vacacionesPlus;
  const baseOS =
    obraSocialBase === "48"            ? bases.OS_48
    : obraSocialBase === "48+extras+vac" ? bases.OS_48 + extrasYVacaciones
    : /* "real" */                         bases.REM_REAL;

  // ---- deducciones
  const itemsDeduccion = [
    { label: "Jubilación (11%)",       monto: bases.REM_REAL * 0.11,  base: bases.REM_REAL },
    { label: "Ley 19.032 – PAMI (3%)", monto: bases.REM_REAL * 0.03,  base: bases.REM_REAL },
    { label: "Obra social (3%)",       monto: baseOS * 0.03,          base: baseOS },
    { label: "Sindicato (2%)",         monto: bases.TOTAL_REAL * 0.02,  base: bases.TOTAL_REAL },
    { label: "FAECyS (0,5%)",          monto: bases.TOTAL_REAL * 0.005, base: bases.TOTAL_REAL },
    { label: "Aporte fijo OSECAC",     monto: 100 },
  ];

  const otros = num(descuentosExtras) || 0;
  if (otros) itemsDeduccion.push({ label: "Otros descuentos", monto: otros });

  const totalDeducciones = itemsDeduccion.reduce((acc, it) => acc + num(it.monto || 0), 0);
  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  const warnings = [];
  if (num(horas50) + num(horas100) > 30) {
    warnings.push("Advertencia: se superan 30 hs extra en el mes (tope legal sugerido).");
  }

  return {
    // REM
    basico, antiguedad, presentismo, adicionalTitulo, adicionalFuncion,
    horasExtras50, horasExtras100, montoHorasExtras, valorHora, horasMensuales,
    vacacionesPlus, vacacionesDias: vacDias, plusPorDia: baseVacNH / 150,

    // NR
    noRemuFijo, noRemunerativoOtros: noRemuOtros,
    antiguedadNoRemu: antiguedadNR, presentismoNoRemu: presentismoNR,
    totalNoRemunerativo,

    // Totales y deducciones
    totalRemunerativo,
    detalleDeducciones: itemsDeduccion,
    totalDeducciones,
    liquido,

    // Bases (debug)
    bases,
    baseOS,
    obraSocialBaseUsada: obraSocialBase,

    // Prorrateo
    cargaHoraria: ch, factorCH, basico48,

    warnings,
  };
}

// compat con lo que espera app/page.js
export { calculoComercio as calcularComercio };
export default calculoComercio;
