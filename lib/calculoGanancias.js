// lib/calculoGanancias.js
// Estimación MENSUAL simplificada del Impuesto a las Ganancias (4ta categoría,
// relación de dependencia). NO reemplaza la liquidación anual acumulada de ARCA:
// es una aproximación mes a mes, útil para simular un recibo.
//
// Los parámetros (escala del art. 94 y deducciones personales) NO están en el
// código: se cargan desde Firestore y los administra el usuario desde /admin.
// La forma esperada del objeto `params` está documentada en
// data/ganancias.seed.json.

// Divide de forma segura (montos anuales -> mensuales).
const mensual = (anual) => (Number(anual) || 0) / 12;

/**
 * Aplica una escala progresiva (tramos) a una base imponible.
 * Cada tramo: { desde, hasta, fijo, alicuota }. El último puede tener hasta null.
 * @returns {{ impuesto:number, tramo:object|null }}
 */
export function aplicarEscala(base, tramos) {
  if (!Array.isArray(tramos) || tramos.length === 0 || base <= 0) {
    return { impuesto: 0, tramo: null };
  }
  const tramo = tramos.find(
    (t) => base > Number(t.desde) && (t.hasta == null || base <= Number(t.hasta))
  );
  if (!tramo) return { impuesto: 0, tramo: null };

  const excedente = base - Number(tramo.desde);
  const impuesto = Number(tramo.fijo || 0) + excedente * Number(tramo.alicuota || 0);
  return { impuesto: Math.max(0, impuesto), tramo };
}

/**
 * Estima la retención mensual de Ganancias.
 *
 * @param {Object} args
 * @param {number} args.gananciaBrutaMensual  Total remunerativo del mes (sujeto a impuesto).
 * @param {number} args.aportesDeduciblesMensual  Aportes del trabajador deducibles
 *        (jubilación, PAMI, obra social, cuota sindical) ya calculados en el recibo.
 * @param {Object} args.params  Documento de parámetros (ver data/ganancias.seed.json):
 *        { deducciones_anuales:{ganancia_no_imponible,deduccion_especial_rel_dependencia,
 *          conyuge,hijo,hijo_incapacitado}, escala_anual:[{desde,hasta,fijo,alicuota}] }
 * @param {Object} [args.cargas]  { conyuge:boolean, hijos:number, hijosIncapacitados:number }
 * @returns {Object} desglose de la estimación
 */
export function calcularGananciasMensual({
  gananciaBrutaMensual = 0,
  aportesDeduciblesMensual = 0,
  params,
  cargas = {},
}) {
  if (!params || !params.escala_anual || !params.deducciones_anuales) {
    return { aplica: false, motivo: "Sin parámetros de Ganancias cargados", impuesto: 0 };
  }

  const d = params.deducciones_anuales;
  const conyuge = cargas.conyuge ? mensual(d.conyuge) : 0;
  const hijos = (Number(cargas.hijos) || 0) * mensual(d.hijo);
  const hijosIncap =
    (Number(cargas.hijosIncapacitados) || 0) * mensual(d.hijo_incapacitado);

  // Deducciones personales del mes.
  const gni = mensual(d.ganancia_no_imponible);
  const especial = mensual(d.deduccion_especial_rel_dependencia);
  const deduccionesPersonales = gni + especial + conyuge + hijos + hijosIncap;

  // Ganancia neta = bruto - aportes deducibles del trabajador.
  const gananciaNeta = Math.max(0, gananciaBrutaMensual - aportesDeduciblesMensual);

  // Base imponible = ganancia neta - deducciones personales (nunca negativa).
  const baseImponible = Math.max(0, gananciaNeta - deduccionesPersonales);

  // Escala mensual = escala anual con límites y cuota fija divididos por 12.
  const escalaMensual = params.escala_anual.map((t) => ({
    desde: mensual(t.desde),
    hasta: t.hasta == null ? null : mensual(t.hasta),
    fijo: mensual(t.fijo),
    alicuota: Number(t.alicuota) || 0,
  }));

  const { impuesto, tramo } = aplicarEscala(baseImponible, escalaMensual);

  return {
    aplica: impuesto > 0,
    gananciaNeta,
    deduccionesPersonales,
    detalleDeducciones: {
      ganancia_no_imponible: gni,
      deduccion_especial: especial,
      conyuge,
      hijos,
      hijosIncapacitados: hijosIncap,
    },
    baseImponible,
    alicuotaTramo: tramo ? tramo.alicuota : 0,
    impuesto,
  };
}

export default calcularGananciasMensual;
