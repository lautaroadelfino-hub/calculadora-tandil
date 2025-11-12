// lib/calculoComercio.js
// Comercio (CCT 130/75) – versión corregida
// - Básico prorrateado: basico = basico48 * (cargaHoraria/48)
// - OS 3% SIEMPRE sobre base 48 hs (no depende de la carga horaria)
// - PAMI 3% y Jubilación 11% sobre REM reales (incluye extras y plus vacaciones)
// - Sindicato 2% y FAECyS 0,5% sobre TOTAL real (REM + NO REM), incluye extras y plus
// - OSECAC fijo $100
// - NR de escala (48 hs) prorrateado por carga horaria; NR manual NO prorrateado
// - Presentismo 48 para OS se calcula sobre (básico48 + antig48 + título48 + función48)

export function calcularComercio({
  entry,
  aniosAntiguedad = 0,
  titulo = "ninguno",      // "ninguno" | "terciario" | "universitario"
  funcion = 0,             // %
  horas50 = 0,
  horas100 = 0,
  descuentosExtras = 0,    // $ extras manuales
  noRemunerativo = 0,      // $ NR manual (NO se prorratea)
  cargaHoraria = 48,       // hs/sem reales
  divisorHoras = 200,      // divisor base 48 hs (200 recomendado), escala con factorCH

  // Vacaciones
  vacacionesOn = false,
  vacDiasTrabajados = 0,
  vacDiasManual = 0,
}) {
  // ---- parser numérico robusto
  const num = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      let s = v.trim();
      if (!s) return 0;
      s = s.replace(/[^0-9,.\-]/g, "");
      const hasC = s.includes(","), hasD = s.includes(".");
      if (hasC && hasD) {
        const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
        s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
      } else if (hasC) {
        s = s.replace(/,/g, ".");
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ---- Carga horaria y factor de prorrateo
  const ch = num(cargaHoraria) || 48;
  const factorCH = ch / 48;

  // ====== ESCALA 48 hs ======
  const basico48 =
    num(entry?.basico48) ||
    num(entry?.basico_48) ||
    num(entry?.basico) || 0;

  const nrEscala48 =
    num(entry?.noRem) ||
    num(entry?.no_rem) ||
    num(entry?.noRemuFijo) || 0;

  // ====== VALORES REALES (prorrateados por régimen) ======
  const basico = basico48 * factorCH;                // ⬅️ proporcional estricto
  const noRemuFijo = nrEscala48 * factorCH;          // NR escala prorrateado
  const noRemuOtros = num(noRemunerativo) || 0;      // NR manual NO prorrateado
  const baseNR = noRemuFijo + noRemuOtros;

  // Remunerativos reales
  const antiguedad = basico * 0.01 * num(aniosAntiguedad);
  const presentismo = (basico + antiguedad) / 12;    // práctica usual en REM reales
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;
  const adicionalFuncion = basico * (num(funcion) / 100);

  // No remunerativos reales
  const antiguedadNR = baseNR * 0.01 * num(aniosAntiguedad);
  const presentismoNR = (baseNR + antiguedadNR) / 12;

  // Horas extras (divisor base 48 escalado por factorCH → valor hora consistente)
  const horasMensuales = (num(divisorHoras) > 0 ? num(divisorHoras) : 200) * factorCH;
  const baseParaHora = basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;
  const valorHora = horasMensuales > 0 ? baseParaHora / horasMensuales : 0;
  const valorHora50 = valorHora * 1.5;
  const valorHora100 = valorHora * 2.0;
  const montoHoras50 = valorHora50 * num(horas50);
  const montoHoras100 = valorHora100 * num(horas100);

  // Rem sin vacaciones
  const totalRemunerativoBase =
    basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion +
    montoHoras50 + montoHoras100;

  // NR reales
  const totalNoRemunerativo = baseNR + antiguedadNR + presentismoNR;

  // Vacaciones (PLUS: base/150 * días)
  function diasPorAntiguedad(a, diasTrab = 0) {
    const an = num(a);
    if (an < 0.5) return Math.max(0, Math.floor(num(diasTrab) / 20)); // <6m: 1 cada 20
    if (an < 5)   return 14;
    if (an < 10)  return 21;
    if (an < 20)  return 28;
    return 35;
  }
  const vacDias = vacacionesOn
    ? (num(vacDiasManual) > 0 ? num(vacDiasManual) : diasPorAntiguedad(aniosAntiguedad, vacDiasTrabajados))
    : 0;

  const baseVacNH = basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;
  const vacacionesPlus = vacDias > 0 ? (baseVacNH * vacDias) / 150 : 0;

  // Totales reales (del período)
  const totalRemunerativo = totalRemunerativoBase + vacacionesPlus;
  const baseREM   = totalRemunerativo;                        // Jubilación / PAMI
  const baseTOTAL = totalRemunerativo + totalNoRemunerativo;  // Sindicato / FAECyS

  // ====== BASE 48 hs PARA OBRA SOCIAL (NO depende de factorCH) ======
  const antig48 = basico48 * 0.01 * num(aniosAntiguedad);
  const titulo48 =
    titulo === "terciario" ? basico48 * 0.15 :
    titulo === "universitario" ? basico48 * 0.20 : 0;
  const funcion48 = basico48 * (num(funcion) / 100);

  // Presentismo 48 sobre (básico48 + antig48 + título48 + función48)
  const rem48_sinPres = basico48 + antig48 + titulo48 + funcion48;
  const pres48 = rem48_sinPres / 12;

  const rem48_NH_total = rem48_sinPres + pres48; // sin extras ni vacaciones

  // NR de escala 48 + derivados (NO incluye NR manual)
  const antigNR48 = nrEscala48 * 0.01 * num(aniosAntiguedad);
  const presNR48  = (nrEscala48 + antigNR48) / 12;
  const nr48_total = nrEscala48 + antigNR48 + presNR48;

  const baseOS_48 = rem48_NH_total  ;  // ⬅️ ESTA es la base fija de OS

  // ====== DEDUCCIONES ======
  const descJubilacion = baseREM   * 0.11;     // sobre REM reales
  const descPAMI       = baseREM   * 0.03;     // sobre REM reales
  const descOS         = baseOS_48 * 0.03;     // ⬅️ OS SIEMPRE sobre base 48 hs (no proporcional)
  const descSindicato  = baseTOTAL * 0.02;     // TOTAL real (incluye extras y plus)
  const descFAECYS     = baseTOTAL * 0.005;    // TOTAL real
  const descOSECAC     = 100;                  // fijo

  const otros = num(descuentosExtras) || 0;

  const detalleDeducciones = [
    { label: "Jubilación (11%)",       monto: descJubilacion, base: baseREM },
    { label: "Ley 19.032 – PAMI (3%)", monto: descPAMI,       base: baseREM },
    { label: "Obra social (3%)",       monto: descOS,         base: baseOS_48, baseTag: "Base 48 hs" },
    { label: "Sindicato (2%)",         monto: descSindicato,  base: baseTOTAL },
    { label: "FAECyS (0,5%)",          monto: descFAECYS,     base: baseTOTAL },
    { label: "Aporte fijo OSECAC",     monto: descOSECAC },
  ];
  if (otros) detalleDeducciones.push({ label: "Otros descuentos", monto: otros });

  const totalDeducciones =
    descJubilacion + descPAMI + descOS + descSindicato + descFAECYS + descOSECAC + otros;

  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  // Info / Warnings
  const warnings = [];
  const hsMes = num(horas50) + num(horas100);
  if (hsMes > 30) warnings.push("Advertencia: se superan 30 hs extra en el mes (tope legal sugerido).");

  return {
    // Remunerativos reales
    basico,
    antiguedad,
    presentismo,
    adicionalTitulo,
    adicionalFuncion,

    // Extras (expuesto)
    horasExtras50: montoHoras50,
    horasExtras100: montoHoras100,
    valorHora,
    valorHora50,
    valorHora100,
    horasMensuales,

    // Vacaciones
    vacacionesPlus,
    vacacionesDias: vacDias,
    valorDiaBase30: baseVacNH / 30,
    valorDiaBase25: baseVacNH / 25,
    plusPorDia: baseVacNH / 150,

    // No remunerativos reales
    noRemuFijo: noRemuFijo,               // prorrateado
    noRemunerativoOtros: noRemuOtros,     // no prorrateado
    antiguedadNoRemu: antiguedadNR,
    presentismoNoRemu: presentismoNR,
    totalNoRemunerativo,

    // Deducciones y totales
    detalleDeducciones,
    totalDeducciones,
    totalRemunerativo,
    liquido,

    // Debug útil
    cargaHoraria: ch,
    factorCH,
    basico48,           // para verificar prorrateo
    baseOS_48,          // para comprobar que OS no varía con la carga horaria
    warnings,
  };
}
