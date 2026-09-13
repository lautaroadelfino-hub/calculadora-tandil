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

/**
 * Aportes personales del trabajador. Son de ley (Ley 24.241, Ley 19.032, Ley
 * 23.660), iguales para todo convenio. Cada uno dice sobre qué base va
 * (`remunerativo` = la remuneración sujeta a aportes; `obra_social` = la base
 * propia de la obra social, que incluye lo no remunerativo) y a qué rubro del
 * Decreto 407/2026 pertenece, para la composición del costo laboral.
 *
 * Lo que un convenio NO puede hacer todavía es declarar otros (una caja
 * provincial, una obra social con otro porcentaje): está anotado en la tabla
 * de deuda de docs/criterio.md.
 */
export const APORTES_PERSONALES = [
  { id: "jubilacion", label: "Jubilación (11%)", porcentaje: 0.11, base: "remunerativo", rubro: "seguridad_social" },
  { id: "pami", label: "Ley 19.032 PAMI (3%)", porcentaje: 0.03, base: "remunerativo", rubro: "inssjp" },
  { id: "obra_social", label: "Obra Social (3%)", porcentaje: 0.03, base: "obra_social", rubro: "obra_social" },
];

/** El medio aguinaldo (arts. 121 y 122 LCT): la mitad de la mejor remuneración mensual del semestre. */
export const AGUINALDO = { proporcionDeLaMejorRemuneracion: 0.5 };

/**
 * Los recargos de la hora extra (art. 201 LCT): 50% en días comunes y 100% en
 * sábados después de las 13, domingos y feriados. Son el piso legal; hay
 * convenios que pagan más, y todavía no pueden declararlo (docs/criterio.md).
 */
export const RECARGOS_HORA_EXTRA = { al50: 1.5, al100: 2.0 };

/**
 * Divisores de uso general. La jornada completa y el divisor de horas NO están
 * acá: son del convenio (`reglas_calculo.jornada`), con el valor más común en
 * `POR_DEFECTO` del vocabulario.
 */
export const DIVISORES = {
  // Días del mes para el costo diario informativo del empleador. No es de ley:
  // es el criterio que usaba el panel del empleador y se conservó.
  diasDelMes: 30,
  // Un día de vacaciones se paga sobre base/25 en vez de base/30 (art. 155
  // LCT); el "plus" por día equivale entonces a base/150.
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
