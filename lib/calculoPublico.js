export function calcularPublico({
  basico,
  regimen,
  antiguedad,
  categoria,
  titulo,
  funcion,
  horas50,
  horas100,
  noRemunerativo,
  descuentosExtras,
  presentismo,
  subRegimen
}) {
  // Plus horario según régimen (se lee desde hoja como decimal)
  const adicionalHorario = basico * (regimen?.plus || 0);

  // Antigüedad 2% por año
  const antiguedadPesos = basico * 0.02 * antiguedad;

  // Presentismo viene directo desde Google Sheets
  const presentismoPesos = Number(presentismo) || 0;

  // Título
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  // Función
  const adicionalFuncion = basico * (funcion / 100);

  // Horas extras → depende del sub-régimen
  const horasSem = regimen?.hs || 35;
  const baseHoras = basico + presentismoPesos + adicionalHorario;
  const divisor = subRegimen === "obras" ? horasSem * 6 : horasSem * 4.4;
  const valorHora = divisor > 0 ? baseHoras / divisor : 0;

  const horasExtras50 = valorHora * 1.5 * horas50;
  const horasExtras100 = valorHora * 2.0 * horas100;

  // Total remunerativo
  const totalRemunerativo =
    basico +
    adicionalHorario +
    antiguedadPesos +
    presentismoPesos +
    adicionalTitulo +
    adicionalFuncion +
    horasExtras50 +
    horasExtras100;

  // No remunerativo
  const totalNoRemunerativo = noRemunerativo;

  // Deducciones
  const descIPS = totalRemunerativo * 0.14;
  const descIOMA = totalRemunerativo * 0.048;
  const extras = descuentosExtras || 0;

  const totalDeducciones = descIPS + descIOMA + extras;
  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  return {
    basico,
    adicionalHorario,
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
