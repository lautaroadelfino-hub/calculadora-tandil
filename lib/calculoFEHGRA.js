// lib/calculoFEHGRA.js
// Motor declarativo – Hoteles, Gastronomía y Turismo (UTGHRA–FEHGRA)

export function porcAntiguedadFEHGRA(anios) {
  const a = Number.isFinite(anios) ? anios : Number(anios) || 0;
  if (a < 1) return 0;
  if (a < 3) return 0.01;
  if (a < 5) return 0.02;
  if (a < 7) return 0.04;
  if (a < 9) return 0.05;
  if (a < 11) return 0.06;
  if (a < 13) return 0.07;
  if (a < 15) return 0.08;
  if (a < 17) return 0.10;
  if (a < 19) return 0.12;
  return 0.14;
}

export function calculoFEHGRA({
  entry,
  aniosAntiguedad = 0,
  horas50 = 0,
  horas100 = 0,
  descuentosExtras = 0,   // $ extras manuales
  noRemunerativo = 0,     // $ NR manual (NO se prorratea)
  cargaHoraria = 48,      // hs/sem reales
  divisorHoras = 200,     // divisor mensual base convenio (200 hs)

  // Adicionales propios del convenio
  asistenciaPerfecta = true,   // 10% sobre básico
  complementoServicio = true,  // 12% sobre básico

  // Aporte sindical UTHGRA
  // "ninguno"    -> no descuenta
  // "afiliado"   -> 2,5% cuota sindical
  // "noAfiliado" -> 2% contribución solidaria
  tipoAporteSindical = "ninguno",

  // Vacaciones
  vacacionesOn = false,
  vacDiasTrabajados = 0,
  vacDiasManual = 0,

  // Base de Obra Social:
  // "48"            -> solo base 48 (sin extras ni vacaciones)
  // "48+extras+vac" -> base 48 + horas extra + plus de vacaciones
  // "real"          -> sobre REM_REAL (todo lo remunerativo real)
  obraSocialBase = "real",
} = {}) {
  // util numérico robusto
  const num = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      let s = v.trim();
      if (!s) return 0;
      s = s.replace(/[^0-9,.\-]/g, "");
      const hasC = s.includes(","), hasD = s.includes(".");
      if (hasC && hasD) {
        const lc = s.lastIndexOf(",");
        const ld = s.lastIndexOf(".");
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

  // entradas y prorrateos
  const ch = Math.max(1, num(cargaHoraria) || 48);
  const factorCH = ch / 48;

  const basicoBase = num(entry?.basico) || num(entry?.basico48) || 0;
  const nrEscalaBase = num(entry?.noRem) || num(entry?.no_rem) || num(entry?.noRemuFijo) || 0;

  // remunerativos base (reales)
  const basico = basicoBase * factorCH;
  const porcAnt = porcAntiguedadFEHGRA(num(aniosAntiguedad));
  const antiguedad = basico * porcAnt;

  const adicionalAsistencia = asistenciaPerfecta ? basico * 0.10 : 0;
  const adicionalComplementoServicio = complementoServicio ? basico * 0.12 : 0;

  // para mantener compat con la UI actual, usamos "presentismo" como alias del adicional de asistencia perfecta
  const presentismo = adicionalAsistencia;

  // horas extra
  const horasMensuales = (num(divisorHoras) > 0 ? num(divisorHoras) : 200) * factorCH;
  const baseHora = basico + antiguedad + adicionalAsistencia + adicionalComplementoServicio;
  const valorHora = horasMensuales > 0 ? baseHora / horasMensuales : 0;

  const horasExtras50 = valorHora * 1.5 * num(horas50);
  const horasExtras100 = valorHora * 2.0 * num(horas100);
  const montoHorasExtras = horasExtras50 + horasExtras100;

  // vacaciones
  const diasPorAntiguedad = (a, diasTrab = 0) => {
    const an = num(a);
    if (an < 0.5) return Math.max(0, Math.floor(num(diasTrab) / 20));
    if (an < 5) return 14;
    if (an < 10) return 21;
    if (an < 20) return 28;
    return 35;
  };

  const vacDias = vacacionesOn
    ? (num(vacDiasManual) > 0 ? num(vacDiasManual) : diasPorAntiguedad(aniosAntiguedad, vacDiasTrabajados))
    : 0;

  const baseVacNH = basico + antiguedad + adicionalAsistencia + adicionalComplementoServicio;

  const valorDiaBase25 = baseVacNH / 25;
  const valorDiaBase30 = baseVacNH / 30;
  const plusPorDia = baseVacNH / 150;
  const vacacionesPlus = vacDias > 0 ? plusPorDia * vacDias : 0;

  // no remunerativos
  const noRemuFijo = nrEscalaBase * factorCH;
  const noRemuOtros = num(noRemunerativo) || 0;
  const baseNR = noRemuFijo + noRemuOtros;

  const antiguedadNR = baseNR * porcAnt;
  const presentismoNR = 0;

  // totales REM / NR
  const totalRemunerativo =
    basico +
    antiguedad +
    presentismo +
    adicionalComplementoServicio +
    horasExtras50 +
    horasExtras100 +
    vacacionesPlus;

  const totalNoRemunerativo = baseNR + antiguedadNR + presentismoNR;

  // bases
  const OS_48 = (() => {
    const antig48 = basicoBase * porcAnt;
    const asis48 = asistenciaPerfecta ? basicoBase * 0.10 : 0;
    const comp48 = complementoServicio ? basicoBase * 0.12 : 0;
    const rem48_total = basicoBase + antig48 + asis48 + comp48;

    const nr48 = nrEscalaBase;
    const antigNR48 = nr48 * porcAnt;
    const nr48_total = nr48 + antigNR48;

    return rem48_total + nr48_total;
  })();

  const bases = {
    REM_REAL: totalRemunerativo,
    TOTAL_REAL: totalRemunerativo + totalNoRemunerativo,
    OS_48,
  };

  const extrasYVacaciones = montoHorasExtras + vacacionesPlus;

  const baseOS =
    obraSocialBase === "48"
      ? bases.OS_48
      : obraSocialBase === "48+extras+vac"
      ? bases.OS_48 + extrasYVacaciones
      : bases.REM_REAL;

  // deducciones
  const itemsDeduccion = [
    { label: "Jubilación (11%)", monto: bases.REM_REAL * 0.11, base: bases.REM_REAL },
    { label: "Ley 19.032 – PAMI (3%)", monto: bases.REM_REAL * 0.03, base: bases.REM_REAL },
    { label: "Obra social (3%)", monto: baseOS * 0.03, base: baseOS },
  ];

  let porcSindicato = 0;
  if (tipoAporteSindical === "afiliado") porcSindicato = 0.025;
  else if (tipoAporteSindical === "noAfiliado") porcSindicato = 0.02;

  if (porcSindicato > 0) {
    itemsDeduccion.push({
      label:
        tipoAporteSindical === "afiliado"
          ? "Cuota sindical UTHGRA (2,5%)"
          : "Aporte solidario UTHGRA (2%)",
      monto: bases.TOTAL_REAL * porcSindicato,
      base: bases.TOTAL_REAL,
    });
  }

  // Seguro de vida y sepelio 1%
  itemsDeduccion.push({
    label: "Seguro de vida y sepelio (1%)",
    monto: bases.TOTAL_REAL * 0.01,
    base: bases.TOTAL_REAL,
  });

  const otros = num(descuentosExtras) || 0;
  if (otros) {
    itemsDeduccion.push({ label: "Otros descuentos", monto: otros, base: otros });
  }

  const totalDeducciones = itemsDeduccion.reduce((acc, it) => acc + num(it.monto || 0), 0);
  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  const warnings = [];
  if (num(horas50) + num(horas100) > 30) {
    warnings.push(
      "Advertencia: se superan 30 hs extra en el mes (tope legal sugerido)."
    );
  }

  return {
    // Remunerativos
    basico,
    antiguedad,
    presentismo,
    adicionalAsistencia,
    adicionalComplementoServicio,
    horasExtras50,
    horasExtras100,
    montoHorasExtras,
    valorHora,
    horasMensuales,
    vacacionesPlus,
    vacacionesDias: vacDias,
    plusPorDia,
    valorDiaBase25,
    valorDiaBase30,

    // No remunerativos
    noRemuFijo,
    noRemunerativoOtros: noRemuOtros,
    antiguedadNoRemu: antiguedadNR,
    presentismoNoRemu: presentismoNR,
    totalNoRemunerativo,

    // Totales
    totalRemunerativo,
    detalleDeducciones: itemsDeduccion,
    totalDeducciones,
    liquido,

    // Bases
    bases,
    baseOS,
    obraSocialBaseUsada: obraSocialBase,

    // Prorrateo
    cargaHoraria: ch,
    factorCH,
    basico48: basicoBase,

    warnings,
  };
}

// compat con lo que pueda esperar la app
export { calculoFEHGRA as calcularFEHGRA };
export default calculoFEHGRA;
