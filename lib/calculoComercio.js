export function calcularComercio({
  basico,
  antiguedad,
  titulo,
  funcion,
  horas50,
  horas100,
  noRemunerativo,
  noRemuFijo,
  descuentosExtras
}) {
  // Antigüedad: 1% del básico por año
  const antiguedadPesos = basico * 0.01 * antiguedad;

  // Presentismo: (básico + antigüedad) / 12  (SIEMPRE así, ignoramos presentismo de Google)
  const presentismoPesos = (basico + antiguedadPesos) / 12;

  // Adicional por título
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  // Bonificación por función (%)
  const adicionalFuncion = basico * (funcion / 100);

  // Horas extras (base: básico), 48hs semanales → divisor 192 hs/mes
  const valorHora = basico / 192;
  const horasExtras50 = valorHora * 1.5 * horas50;
  const horasExtras100 = valorHora * 2.0 * horas100;

  // Totales remunerativos / no remunerativos
  const totalRemunerativo =
    basico +
    antiguedadPesos +
    presentismoPesos +
    adicionalTitulo +
    adicionalFuncion +
    horasExtras50 +
    horasExtras100;

  const totalNoRemunerativo = (noRemuFijo || 0) + (noRemunerativo || 0);

  // Bases de cálculo para descuentos
  const baseRem = totalRemunerativo;
  const baseRemNoRem = totalRemunerativo + totalNoRemunerativo;

  // Deducciones Comercio
  const descJubilacion = baseRem * 0.11;
  const descLey19032 = baseRem * 0.03;
  const descObraSocial = baseRemNoRem * 0.03;
  const descFAECYS = baseRemNoRem * 0.02;
  const descAporteSolidario = baseRemNoRem * 0.005;
  const otrosDesc = descuentosExtras || 0;

  const totalDeducciones =
    descJubilacion +
    descLey19032 +
    descObraSocial +
    descFAECYS +
    descAporteSolidario +
    otrosDesc;

  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  return {
    basico,
    antiguedadPesos,
    presentismoPesos,
    adicionalTitulo,
    adicionalFuncion,
    horasExtras50,
    horasExtras100,
    totalRemunerativo,
    totalNoRemunerativo,
    totalDeducciones,
    liquido
  };
}
