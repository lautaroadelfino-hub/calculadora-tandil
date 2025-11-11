// lib/calculoComercio.js
// Cálculo Empleados de Comercio (sector privado) con parseo robusto de números (AR/US)
// Devuelve SIEMPRE números (no strings) para evitar NaN en la UI.
export function calcularComercio({
  entry,
  aniosAntiguedad = 0,
  titulo = "ninguno",      // "ninguno" | "terciario" | "universitario"
  funcion = 0,             // %
  horas50 = 0,
  horas100 = 0,
  descuentosExtras = 0,    // $ extras
  noRemunerativo = 0,      // $ otros no rem / acuerdos (input usuario)
  cargaHoraria = 48,       // hs/semana (prorratea básico)

  // Vacaciones
  vacacionesOn = false,
  vacDiasTrabajados = 0,
  vacDiasManual = 0,
}) {
  // --- Parser robusto: "1.234.567,89" | "1,234,567.89" | "1234567.89" | "1234567"
  const num = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      let s = v.trim();
      if (!s) return 0;
      s = s.replace(/[^0-9,.\-]/g, "");
      const hasComma = s.includes(",");
      const hasDot = s.includes(".");
      if (hasComma && hasDot) {
        const lc = s.lastIndexOf(",");
        const ld = s.lastIndexOf(".");
        if (lc > ld) {
          // AR/UE
          s = s.replace(/\./g, "").replace(",", ".");
        } else {
          // US
          s = s.replace(/,/g, "");
        }
      } else if (hasComma) {
        // solo coma => decimal
        s = s.replace(/,/g, ".");
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ——— Básico prorrateado por carga horaria (entrada puede venir con distintos nombres)
  const basico48 =
    num(entry?.basico48) ||
    num(entry?.basico_48) ||
    num(entry?.basico) ||
    0;

  const ch = num(cargaHoraria) || 48;
  const factorCH = ch / 48;
  const basico = basico48 * factorCH;

  // No remunerativo fijo de la escala (si existe) + otros no rem del usuario
  const noRemFijo =
    num(entry?.noRem) ||
    num(entry?.no_rem) ||
    num(entry?.noRemuFijo) ||
    0;

  const otrosNoRem = num(noRemunerativo) || 0;
  const baseNoRemAdic = noRemFijo + otrosNoRem;

  // ——— Antigüedad (1% anual) y Presentismo REMUNERATIVOS (sobre remunerativos)
  const antiguedad = basico * 0.01 * num(aniosAntiguedad);
  const presentismo = (basico + antiguedad) / 12;

  // ——— Antigüedad / Presentismo NO REM (sobre sumas no rem)
  const antiguedadNoRemu = baseNoRemAdic * 0.01 * num(aniosAntiguedad);
  const presentismoNoRemu = (baseNoRemAdic + antiguedadNoRemu) / 12;

  // ——— Adicionales
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  const adicionalFuncion = basico * (num(funcion) / 100);

  // ——— Horas extras (no integran base NH de vacaciones)
  const horasMensuales = ch * 4; // aproximación
  const salarioBaseHoras = basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;
  const valorHora = horasMensuales > 0 ? salarioBaseHoras / horasMensuales : 0;
  const horasExtras50 = valorHora * 1.5 * num(horas50);
  const horasExtras100 = valorHora * 2.0 * num(horas100);

  // ——— Remunerativos del mes (sin vacaciones aún)
  const totalRemunerativoBase =
    basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion +
    horasExtras50 + horasExtras100;

  // ——— No remunerativos del período (incluye antigüedad/presentismo no rem)
  const totalNoRemunerativo = baseNoRemAdic + antiguedadNoRemu + presentismoNoRemu;

  // ——— Vacaciones
  function diasPorAntiguedad(a, diasTrab = 0) {
    const an = num(a);
    if (an < 0.5) return Math.max(0, Math.floor(num(diasTrab) / 20));
    if (an < 5)   return 14;
    if (an < 10)  return 21;
    if (an < 20)  return 28;
    return 35;
  }

  const vacacionesDias = vacacionesOn
    ? (num(vacDiasManual) > 0 ? num(vacDiasManual) : diasPorAntiguedad(aniosAntiguedad, vacDiasTrabajados))
    : 0;

  // Base NH para vacaciones (sin no rem y sin extras)
  const baseVacNH = basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;

  // PLUS vacacional mensual (no duplica sueldo)
  const vacacionesPlus = vacacionesDias > 0 ? (baseVacNH * vacacionesDias) / 150 : 0;

  // ——— Totales remunerativos y deducciones
  const totalRemunerativo = totalRemunerativoBase + vacacionesPlus;

  const baseRem = totalRemunerativo;
  const baseRemNoRem = totalRemunerativo + totalNoRemunerativo;

  const descJubilacion      = baseRem * 0.11;
  const descLey19032        = baseRem * 0.03;
  const descObraSocial      = baseRemNoRem * 0.03;
  const descSindicato       = baseRemNoRem * 0.02;   // 2% Sindicato (aporte solidario)
  const descFAECYS          = baseRemNoRem * 0.005;  // 0,5% FAECyS (aporte solidario)
  const otros               = num(descuentosExtras) || 0;

  const detalleDeducciones = [
    { label: "Jubilación (11%)",       monto: descJubilacion },
    { label: "Ley 19.032 – PAMI (3%)", monto: descLey19032 },
    { label: "Obra social (3%)",       monto: descObraSocial },
    { label: "Sindicato (2%)",         monto: descSindicato },
    { label: "FAECyS (0,5%)",          monto: descFAECYS },
  ];
  if (otros) detalleDeducciones.push({ label: "Otros descuentos", monto: otros });

  const totalDeducciones =
    descJubilacion + descLey19032 + descObraSocial + descSindicato + descFAECYS + otros;

  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  return {
    // Remunerativos (desglose)
    basico,
    antiguedad,
    presentismo,
    adicionalTitulo,
    adicionalFuncion,
    horasExtras50,
    horasExtras100,

    // Vacaciones (PLUS)
    vacacionesPlus,
    vacacionesDias,
    valorDiaBase30: baseVacNH / 30,
    valorDiaBase25: baseVacNH / 25,
    plusPorDia: baseVacNH / 150,

    // No remunerativos
    noRemuFijo: noRemFijo,
    noRemunerativoOtros: otrosNoRem,
    antiguedadNoRemu,
    presentismoNoRemu,
    totalNoRemunerativo,

    // Deducciones
    detalleDeducciones,
    totalDeducciones,

    // Info útil
    cargaHoraria: ch,
    horasMensuales,
    valorHora,

    // Totales finales
    totalRemunerativo,
    liquido,
  };
}
