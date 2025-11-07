// lib/calculoPublico.js
export function calcularPublico({
  entry,            // { basico, presentismo? }
  regimen,          // "35" | "40" | "48"
  aniosAntiguedad,
  titulo,           // "ninguno" | "terciario" | "universitario"
  funcion,          // %
  horas50,
  horas100,
  descuentosExtras, // $ adicionales
  noRemunerativo,   // $ (otros no rem)
  subRegimen,       // "administracion" | "sisp" | "obras"
}) {
  const basico = Number(entry?.basico) || 0;

  // Plus horario (si no viene en sheets, usamos mapa fijo)
  const plusMap = { "35": 0, "40": 0.1429, "48": 0.3714 };
  const plusPct = plusMap[String(regimen)] ?? 0;
  const adicionalHorario = basico * plusPct;

  // Antigüedad: 2% anual
  const antiguedad = basico * 0.02 * (Number(aniosAntiguedad) || 0);

  // Presentismo: si viene en la hoja por mes+categoria, lo usamos; si no, 0
  const presentismo = Number(entry?.presentismo) || 0;

  // Adicional por título
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  // Bonificación por función
  const adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

  // Horas extras según sub-régimen
  const horasSem = { "35": 35, "40": 40, "48": 48 }[String(regimen)] || 35;
  const baseHoras = basico + presentismo + adicionalHorario;

  const divisor =
    subRegimen === "obras"
      ? horasSem * 6          // Obras Sanitarias
      : horasSem * 4.4;       // Adm. Central y SISP

  const valorHoraPublico = divisor > 0 ? baseHoras / divisor : 0;
  const horasExtras50 = valorHoraPublico * 1.5 * (Number(horas50) || 0);
  const horasExtras100 = valorHoraPublico * 2.0 * (Number(horas100) || 0);

  // Totales
  const totalRemunerativo =
    basico +
    adicionalHorario +
    antiguedad +
    presentismo +
    adicionalTitulo +
    adicionalFuncion +
    horasExtras50 +
    horasExtras100;

  const totalNoRemunerativo = Number(noRemunerativo) || 0;

  // Deducciones (IPS 14% + IOMA 4,8% + extras)
  const descIPS  = totalRemunerativo * 0.14;
  const descIOMA = totalRemunerativo * 0.048;
  const otros    = Number(descuentosExtras) || 0;

  const detalleDeducciones = [
    { label: "IPS (14%)", monto: descIPS },
    { label: "IOMA (4,8%)", monto: descIOMA },
  ];
  if (otros) detalleDeducciones.push({ label: "Otros descuentos", monto: otros });

  const totalDeducciones = descIPS + descIOMA + otros;

  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  return {
    // desgloses
    basico,
    adicionalHorario,
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

    // utilidades para UI (no rem “otros”)
    noRemuFijo: 0,
    noRemunerativoOtros: totalNoRemunerativo,

    // final
    liquido,
  };
}
