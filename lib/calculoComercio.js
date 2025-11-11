// lib/calculoComercio.js
export function calcularComercio({
  entry,
  aniosAntiguedad = 0,
  titulo = "ninguno",      // "ninguno" | "terciario" | "universitario"
  funcion = 0,             // %
  horas50 = 0,
  horas100 = 0,
  descuentosExtras = 0,    // $ extras
  noRemunerativo = 0,      // $ otros no rem
  cargaHoraria = 48,       // hs/semana (prorratea básico)

  // >>> Vacaciones integradas al cálculo
  vacacionesOn = false,           // activar liquidación de vacaciones
  vacDiasTrabajados = 0,          // si antigüedad < 6 meses: días trabajados para 1 c/20
  vacDiasManual = 0,              // opcional: override de días (si > 0, pisa cálculo automático)
}) {
  // Básico (48 hs) → prorrateado
  const basico48 = Number(entry?.basico ?? entry?.basico48 ?? 0);
  const ch = Number(cargaHoraria) || 48;
  const factorCH = ch / 48;
  const basico = +(basico48 * factorCH);

  const noRemFijo = Number(entry?.noRem || 0);

  // Antigüedad (1% anual) + Presentismo ((básico + antigüedad) / 12)
  const antiguedad = basico * 0.01 * (Number(aniosAntiguedad) || 0);
  const presentismo = (basico + antiguedad) / 12;

  // Título y función
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  const adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

  // Horas extras
  const horasMensuales = ch * 4; // aprox
  const salarioBaseHoras =
    basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;
  const valorHora = horasMensuales > 0 ? salarioBaseHoras / horasMensuales : 0;
  const horasExtras50 = valorHora * 1.5 * (Number(horas50) || 0);
  const horasExtras100 = valorHora * 2.0 * (Number(horas100) || 0);

  // Remunerativos S/ vacaciones (base)
  const totalRemunerativoBase =
    basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion +
    horasExtras50 + horasExtras100;

  // No remunerativos (del período)
  const totalNoRemunerativo = noRemFijo + (Number(noRemunerativo) || 0);

  // >>> Vacaciones: días según antigüedad (o manual), base = (rem base + no rem) / 25
  function diasPorAntiguedad(a, diasTrab = 0) {
    const an = Number(a) || 0;
    if (an < 0.5) return Math.max(0, Math.floor((Number(diasTrab) || 0) / 20));
    if (an < 5)   return 14;
    if (an < 10)  return 21;
    if (an < 20)  return 28;
    return 35;
  }

  let vacacionesDias = 0;
  if (vacacionesOn) {
    vacacionesDias = Number(vacDiasManual) > 0
      ? Number(vacDiasManual)
      : diasPorAntiguedad(aniosAntiguedad, vacDiasTrabajados);
  }

  const brutoRefVac = totalRemunerativoBase + totalNoRemunerativo; // “bruto del período” sin vacaciones
  const vacacionesMonto = vacacionesOn && vacacionesDias > 0
    ? (brutoRefVac / 25) * vacacionesDias
    : 0;

  // Totales remunerativos
  const totalRemunerativo = totalRemunerativoBase + vacacionesMonto;

  // Bases de aportes (vacaciones integran la base REM)
  const baseRem = totalRemunerativo;
  const baseRemNoRem = totalRemunerativo + totalNoRemunerativo;

  // Deducciones (Empleados de Comercio)
  const descJubilacion      = baseRem * 0.11;
  const descLey19032        = baseRem * 0.03;
  const descObraSocial      = baseRemNoRem * 0.03;
  const descFAECYS          = baseRemNoRem * 0.02;
  const descAporteSolidario = baseRemNoRem * 0.005;
  const otros               = Number(descuentosExtras) || 0;

  const detalleDeducciones = [
    { label: "Jubilación (11%)",        monto: descJubilacion },
    { label: "Ley 19032 – PAMI (3%)",   monto: descLey19032 },
    { label: "Obra social (3%)",        monto: descObraSocial },
    { label: "FAECYS (2%)",             monto: descFAECYS },
    { label: "Aporte solidario (0,5%)", monto: descAporteSolidario },
  ];
  if (otros) detalleDeducciones.push({ label: "Otros descuentos", monto: otros });

  const totalDeducciones =
    descJubilacion + descLey19032 + descObraSocial + descFAECYS + descAporteSolidario + otros;

  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  return {
    // desgloses
    basico: +basico.toFixed(2),
    antiguedad: +antiguedad.toFixed(2),
    presentismo: +presentismo.toFixed(2),
    adicionalTitulo: +adicionalTitulo.toFixed(2),
    adicionalFuncion: +adicionalFuncion.toFixed(2),
    horasExtras50: +horasExtras50.toFixed(2),
    horasExtras100: +horasExtras100.toFixed(2),
    vacacionesMonto: +vacacionesMonto.toFixed(2),
    vacacionesDias: +vacacionesDias,

    // totales
    totalRemunerativo: +totalRemunerativo.toFixed(2),
    totalNoRemunerativo: +totalNoRemunerativo.toFixed(2),

    // deducciones
    detalleDeducciones,
    totalDeducciones: +totalDeducciones.toFixed(2),

    // info útil para UI
    noRemuFijo: +noRemFijo.toFixed(2),
    noRemunerativoOtros: +(Number(noRemunerativo) || 0).toFixed(2),
    cargaHoraria: ch,
    horasMensuales,
    valorHora: +valorHora.toFixed(4),

    // final
    liquido: +liquido.toFixed(2),
  };
}
