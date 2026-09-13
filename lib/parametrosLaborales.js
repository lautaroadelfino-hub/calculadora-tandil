// lib/parametrosLaborales.js
// Las constantes de ley que valen para CUALQUIER convenio, en un solo lugar.
//
// NO IMPORTA NADA DE data/ (Regla 3 del criterio), y por eso el motor puede
// importarlo. Lo que cambia por período (bases del art. 9, alícuotas de las
// contribuciones, detracción) NO va acá: va a Firestore con su pestaña en
// /admin (colección parametros_contribuciones, el mismo patrón que Ganancias)
// y le llega al motor en la tabla del período. Hasta septiembre de 2026 las
// bases del art. 9 vivían en un JSON del código y este archivo las importaba;
// eso era exactamente lo que impedía que el motor lo usara.
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
 * Aplica los topes mínimo y máximo del art. 9 de la Ley 24.241 a una base de
 * aportes. Las bases son dato del período: vienen en la tabla de contribuciones
 * (`bases_art9`), no de acá.
 *
 * Decidido con el dueño el 13/9/2026: el recibo del empleado SÍ los aplica a
 * jubilación, PAMI y obra social, encendido por defecto con el criterio
 * `tope_art9_en_aportes` de la tabla (se apaga desde /admin, sin desplegar).
 * Con los sueldos de convenio de jornada completa no cambia nada: la
 * diferencia aparece en jornadas muy reducidas (por el mínimo) y en sueldos
 * altos (por el máximo). Las contribuciones del empleador no se topean.
 */
export function aplicarTopeArt9(base, { minima, maxima }) {
  return Math.min(maxima, Math.max(minima, base));
}
