// lib/parametrosLaborales.js
// Las constantes de ley que valen para CUALQUIER convenio, en un solo lugar.
//
// POR QUÉ EXISTE: el motor del recibo y el panel del empleador eran dos mundos
// que no compartían ni una constante, y se contradecían sobre la misma ley:
//
//   | Concepto              | motorLiquidacion.js      | calculoEmpleador.js      |
//   |-----------------------|--------------------------|--------------------------|
//   | Topes art. 9          | no los aplicaba          | los aplica y documenta   |
//   | Alícuotas de aportes  | escritas en el código    | en un JSON               |
//   | Divisor de jornada    | 48 semanales / 200 hs    | horas tipeadas a mano    |
//   | Días del mes          | /25 y /150               | /30                      |
//
// Tener dos verdades sobre la misma norma dentro de la misma aplicación es el
// problema; que una esté bien y la otra mal es la consecuencia.

import BASES_IMPONIBLES from "@/data/basesImponibles.json";

/** Aportes personales del trabajador. Son de ley, iguales para todo convenio. */
export const APORTES_PERSONALES = [
  { id: "jubilacion", label: "Jubilación (11%)", porcentaje: 0.11, base: "remunerativo" },
  { id: "pami", label: "Ley 19.032 PAMI (3%)", porcentaje: 0.03, base: "remunerativo" },
  { id: "obra_social", label: "Obra Social (3%)", porcentaje: 0.03, base: "obra_social" },
];

/** Divisores de uso general. Estaban repartidos y sin nombre en los dos módulos. */
export const DIVISORES = {
  // Jornada semanal de referencia para prorratear un sueldo de convenio.
  jornadaSemanalCompleta: 48,
  // Horas mensuales para sacar el valor de la hora extra.
  horasMensuales: 200,
  // Días del mes para el costo diario del puesto (criterio del panel empleador).
  diasDelMes: 30,
  // Un día de vacaciones se paga sobre base/25 en vez de base/30; el "plus"
  // por día equivale entonces a base/150.
  divisorVacaciones: 150,
};

/**
 * Bases mínima y máxima del art. 9 de la Ley 24.241 para un período.
 *
 * A diferencia de antes, cuando el período NO está cargado lo dice en vez de
 * devolver {minima: 0, maxima: 999999999} como si fuera un dato real: el panel
 * llegaba a mostrar "Máx $999.999.999,00" con total naturalidad.
 *
 * @returns {{minima:number, maxima:number, vencido:boolean, periodoUsado:string|null}}
 */
export function basesArt9(periodo) {
  const porPeriodo = BASES_IMPONIBLES?.porPeriodo || {};

  if (periodo && porPeriodo[periodo]) {
    return { ...porPeriodo[periodo], vencido: false, periodoUsado: periodo };
  }

  // Estructura vieja: las bases colgaban de la raíz.
  if (periodo && BASES_IMPONIBLES?.[periodo]?.minima !== undefined) {
    return { ...BASES_IMPONIBLES[periodo], vencido: false, periodoUsado: periodo };
  }

  // No hay dato para ese mes. Se usa el último cargado y se avisa.
  const disponibles = Object.keys(porPeriodo).sort();
  const anterior = periodo
    ? disponibles.filter((p) => p <= periodo).pop()
    : disponibles[disponibles.length - 1];

  if (anterior) {
    return { ...porPeriodo[anterior], vencido: true, periodoUsado: anterior };
  }

  return { minima: 0, maxima: Number.MAX_SAFE_INTEGER, vencido: true, periodoUsado: null };
}

/** El último período con bases cargadas. Sirve para avisar hasta cuándo llega el dato. */
export function ultimoPeriodoConBases() {
  const ps = Object.keys(BASES_IMPONIBLES?.porPeriodo || {}).sort();
  return ps[ps.length - 1] || null;
}

/**
 * Aplica el tope del art. 9 a una base de aportes.
 *
 * DECISIÓN PENDIENTE DEL DUEÑO: hoy el recibo del empleado NO aplica ningún
 * tope a jubilación, PAMI y obra social, mientras que el panel del empleador sí
 * los aplica y hasta lo documenta. Corregirlo es criterio contable, no técnico,
 * así que la capacidad queda lista pero apagada por defecto: ningún número
 * cambia hasta que se encienda a propósito.
 *
 * Con los sueldos cargados hoy no cambiaría nada igual: el bruto más alto de
 * los dos convenios es $1.748.384,87 y la base máxima de julio 2026 es
 * $4.509.567,41. La diferencia aparecería en sueldos altos y en jornadas muy
 * reducidas (por el mínimo).
 */
export function aplicarTopeArt9(base, { minima, maxima }) {
  return Math.min(maxima, Math.max(minima, base));
}

/**
 * Todos los parámetros de un período, juntos.
 * @param {string} periodo  "AAAA-MM"
 */
export function parametrosDelPeriodo(periodo) {
  const bases = basesArt9(periodo);
  return {
    periodo: periodo || null,
    bases,
    aportes: APORTES_PERSONALES,
    divisores: DIVISORES,
    ultimoPeriodoDisponible: ultimoPeriodoConBases(),
  };
}
