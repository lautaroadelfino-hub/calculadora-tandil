// lib/calculoComercio.js
export function calcularComercio({
  entry,            // { basico, noRem?, presentismo? (no lo usamos) }
  aniosAntiguedad,
  titulo,           // "ninguno" | "terciario" | "universitario"
  funcion,          // %
  horas50,
  horas100,
  descuentosExtras, // $
  noRemunerativo,   // $ (otros no rem)
}) {
  const basico = Number(entry?.basico) || 0;
  const noRemFijo = Number(entry?.noRem) || 0;

  // Antigüedad: 1% anual
  const antiguedad = basico * 0.01 * (Number(aniosAntiguedad) || 0);

  // Presentismo: (básico + antigüedad) / 12 (regla de Comercio)
  const presentismo = (basico + antiguedad) / 12;

  // Adicional por título y función
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  const adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

  // Horas extras (valor hora = salario bruto mensual / 192)
  const salarioBaseHoras =
    basico + antiguedad + presentismo + adicionalTitulo + adicionalFuncion;

  const valorHora = salarioBaseHoras > 0 ? salarioBaseHoras / 192 : 0;
  const horasExtras50 = valorHora * 1.5 * (Number(horas50) || 0);
  const horasExtras100 = valorHora * 2.0 * (Number(horas100) || 0);

  // Totales
  const totalRemunerativo =
    basico +
    antiguedad +
    presentismo +
    adicionalTitulo +
    adicionalFuncion +
    horasExtras50 +
    horasExtras100;

  const totalNoRemunerativo = noRemFijo + (Number(noRemunerativo) || 0);

  // Bases para aportes
  const baseRem = totalRemunerativo;
  const baseRemNoRem = totalRemunerativo + totalNoRemunerativo;

  // Deducciones (Comercio)
  const descJubilacion     = baseRem * 0.11;         // solo remunerativos
  const descLey19032       = baseRem * 0.03;         // solo remunerativos
  const descObraSocial     = baseRemNoRem * 0.03;    // rem + no rem
  const descFAECYS         = baseRemNoRem * 0.02;    // rem + no rem
  const descAporteSolidario= baseRemNoRem * 0.005;   // rem + no rem
  const otros              = Number(descuentosExtras) || 0;

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
    basico,
    antiguedad,
    presentismo,
    adicionalTitulo,
    adicionalFuncion,
    horasExtras50,
    horasExtras100,

    // totales
    totalRemunerativo,
    totalNoRemunerativo,

    // deducciones
    detalleDeducciones,
    totalDeducciones,

    // utilidades para UI
    noRemuFijo: noRemFijo,
    noRemunerativoOtros: Number(noRemunerativo) || 0,

    // final
    liquido,
  };
}
