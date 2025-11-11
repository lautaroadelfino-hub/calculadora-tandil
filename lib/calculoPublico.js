// lib/calculoPublico.js
// Cálculo para sector público (Municipalidad). Expone valorHora para la UI.
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
  const presentismo = Number(entry?.presentismo) || 0;

  // Adicional por horario según régimen
  const plusMap = { "35": 0, "40": 0.1429, "48": 0.3714 };
  const plusPct = plusMap[String(regimen)] ?? 0;
  const adicionalHorario = basico * plusPct;

  // Antigüedad 2% anual
  const antiguedad = basico * 0.02 * (Number(aniosAntiguedad) || 0);

  // Título
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 :
    titulo === "universitario" ? basico * 0.20 : 0;

  // Función (porcentaje sobre básico)
  const adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

  // Valor hora: depende de sub-régimen
  const horasSem = { "35": 35, "40": 40, "48": 48 }[String(regimen)] || 35;
  const baseHoras = basico + presentismo + adicionalHorario;

  // Divisor: OS = hsSem*6 | Adm/SISP = hsSem*4.4
  const divisor =
    subRegimen === "obras"
      ? horasSem * 6
      : horasSem * 4.4;

  const valorHoraPublico = divisor > 0 ? baseHoras / divisor : 0;

  // Horas extra
  const qty50  = Number(horas50)  || 0;
  const qty100 = Number(horas100) || 0;
  const horasExtras50  = valorHoraPublico * 1.5 * qty50;
  const horasExtras100 = valorHoraPublico * 2.0 * qty100;

  // Totales remunerativos
  const totalRemunerativo =
    basico +
    adicionalHorario +
    antiguedad +
    presentismo +
    adicionalTitulo +
    adicionalFuncion +
    horasExtras50 +
    horasExtras100;

  // No remunerativos (otros)
  const totalNoRemunerativo = Number(noRemunerativo) || 0;

  // Deducciones (IPS 14% + IOMA 4.8% + extras)
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
    // Desgloses
    basico,
    presentismo,
    adicionalHorario,
    antiguedad,
    adicionalTitulo,
    adicionalFuncion,
    horasExtras50,
    horasExtras100,

    // Claves para UI (coherentes con Comercio)
    valorHoraPublico: +valorHoraPublico.toFixed(4),
    valorHora: +valorHoraPublico.toFixed(4),    // alias para Resultados.jsx
    valorHora50: +(valorHoraPublico * 1.5).toFixed(4),
    valorHora100: +(valorHoraPublico * 2.0).toFixed(4),

    // Totales
    totalRemunerativo,
    totalNoRemunerativo,

    // Deducciones
    detalleDeducciones,
    totalDeducciones,

    // No rem “otros” para mantener interfaz
    noRemuFijo: 0,
    noRemunerativoOtros: totalNoRemunerativo,

    // Final
    liquido,
  };
}
