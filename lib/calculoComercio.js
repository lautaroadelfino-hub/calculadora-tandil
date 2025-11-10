// lib/calculoComercio.js
export function calcularComercio({
  entry,                 // { basico (48hs), noRem? }
  aniosAntiguedad = 0,
  titulo = "ninguno",    // "ninguno" | "terciario" | "universitario"
  funcion = 0,           // %
  horas50 = 0,
  horas100 = 0,
  descuentosExtras = 0,  // $
  noRemunerativo = 0,    // $ (otros no rem)
  cargaHoraria = 48      // horas semanales elegidas (base 48)
}) {
  // Básico de 48 hs → prorrateado por la carga elegida
  const basico48 = Number(entry?.basico ?? entry?.basico48 ?? 0);
  const ch = Number(cargaHoraria) || 48;
  const factorCH = ch / 48;
  const basico = +(basico48 * factorCH);

  const noRemFijo = Number(entry?.noRem || 0);

  // Antigüedad (1% anual) y presentismo ( (básico+antigüedad)/12 )
  const antiguedad = basico * 0.01 * (Number(aniosAntiguedad) || 0);
  const presentismo = (basico + antiguedad) / 12;

  // Título y función
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  const adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

  // Horas extras: valor hora según horas mensuales de la carga elegida
  const horasMensuales = ch * 4; // ej. 48*4=192
  const salarioBaseHoras =
    basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;

  const valorHora = horasMensuales > 0 ? salarioBaseHoras / horasMensuales : 0;
  const horasExtras50 = valorHora * 1.5 * (Number(horas50) || 0);
  const horasExtras100 = valorHora * 2.0 * (Number(horas100) || 0);

  // Totales remunerativos y no remunerativos
  const totalRemunerativo =
    basico +
    antiguedad +
    presentismo +
    adicionalTitulo +
    adicionalFuncion +
    horasExtras50 +
    horasExtras100;

  const totalNoRemunerativo = noRemFijo + (Number(noRemunerativo) || 0);

  // Bases de aportes
  const baseRem = totalRemunerativo;
  const baseRemNoRem = totalRemunerativo + totalNoRemunerativo;

  // Deducciones (Comercio)
  const descJubilacion      = baseRem * 0.11;
  const descLey19032        = baseRem * 0.03;
  const descObraSocial      = baseRemNoRem * 0.03;
  const descFAECYS          = baseRemNoRem * 0.02;
  const descAporteSolidario = baseRemNoRem * 0.005;
  const otros               = Number(descuentosExtras) || 0;

  const detalleDeducciones = [
    { label: "Jubilación (11%)", monto: descJubilacion },
    { label: "Ley 19032 – PAMI (3%)", monto: descLey19032 },
    { label: "Obra social (3%)", monto: descObraSocial },
    { label: "FAECYS (2%)", monto: descFAECYS },
    { label: "Aporte solidario (0,5%)", monto: descAporteSolidario },
  ];
  if (otros) detalleDeducciones.push({ label: "Otros descuentos", monto: otros });

  const totalDeducciones =
    descJubilacion +
    descLey19032 +
    descObraSocial +
    descFAECYS +
    descAporteSolidario +
    otros;

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
