// lib/calculoEmpleador.js
import BASES_IMPONIBLES from "@/data/basesImponibles.json";
import REGIMENES_CONTRIB from "@/data/contribucionesPatronales.json";

/**
 * Obtiene la base mínima y máxima del art. 9 Ley 24.241
 * según el período (YYYY-MM).
 */
function getBasesArt9(periodo) {
  // Estructura nueva: { default: {minima,maxima}, porPeriodo: { "YYYY-MM": {minima,maxima} } }
  if (
    BASES_IMPONIBLES?.porPeriodo &&
    periodo &&
    BASES_IMPONIBLES.porPeriodo[periodo]
  ) {
    return BASES_IMPONIBLES.porPeriodo[periodo];
  }

  // Compatibilidad con estructura vieja: { "YYYY-MM": {..}, default: {..} }
  if (periodo && BASES_IMPONIBLES[periodo]) {
    return BASES_IMPONIBLES[periodo];
  }

  if (BASES_IMPONIBLES?.default) {
    return BASES_IMPONIBLES.default;
  }

  return {
    minima: 0,
    maxima: Number.MAX_SAFE_INTEGER
  };
}

/**
 * Calcula el costo laboral total para el empleador.
 *
 * Foco: contribuciones patronales. Según la Guía 18 del Libro de
 * Sueldos Digital, las bases de contribuciones (2, 3, 8 y 9) hoy no
 * tienen tope máximo; los topes mínimo y máximo del art. 9 de la
 * Ley 24.241 se aplican sobre las bases de aportes (1, 4 y 5) y
 * sobre la detracción de la Ley 27.430.
 *
 * En este módulo usamos:
 *  - Base de aportes art. 9 (informativa): sueldo topeado entre mínimo y máximo.
 *  - Base de contribuciones: sueldo completo (sin tope máximo).
 *
 * Las alícuotas de cada régimen se cargan desde:
 *  - data/contribucionesPatronales.json
 * y deben actualizarse según normativa vigente.
 *
 * @param {Object} input
 * @param {string} input.convenio
 * @param {string} input.provincia
 * @param {string} input.regimenId
 * @param {number} input.bruto                 Sueldo bruto remunerativo mensual
 * @param {number} [input.noRem]              Total de conceptos no remunerativos
 * @param {number} input.horasMensuales
 * @param {number} [input.artPct]             Alícuota de ART (% sobre la base LRT)
 * @param {number} [input.otrosPct]           Otros aportes de convenio (%)
 * @param {string} [input.periodo]            Período devengado (YYYY-MM)
 */
export function calcularCostoEmpleador(input) {
  const {
    convenio,
    provincia,
    regimenId,
    bruto,
    noRem = 0,
    horasMensuales,
    artPct = 0,
    otrosPct = 0,
    periodo
  } = input || {};

  if (!bruto || !horasMensuales) {
    throw new Error("Faltan datos mínimos (bruto u horasMensuales).");
  }

  // 👉 Tomamos el régimen desde el JSON de configuración
  const regimen =
    REGIMENES_CONTRIB[regimenId] || REGIMENES_CONTRIB["resto_mipyme"];

  const basesArt9 = getBasesArt9(periodo);

  // Por ahora consideramos que todo el bruto integra las bases de contribuciones.
  const remuneracionBruta = Number(bruto) || 0;

  // Base para APORTES personales (informativa, por art. 9 Ley 24.241).
  const baseAportesArt9 = Math.min(
    basesArt9.maxima,
    Math.max(basesArt9.minima, remuneracionBruta)
  );

  // Base para CONTRIBUCIONES patronales (2, 3, 8 y 9 del LSD) -> sin tope máximo
  const baseContribuciones = remuneracionBruta;

  // Contribuciones SIPA / INSSJP / Asig / FNE / OS según régimen del JSON
  const detalleContribuciones =
    regimen?.detalle?.map((item) => {
      const monto = (baseContribuciones * (item.pct || 0)) / 100;
      return { ...item, monto };
    }) || [];

  const totalDetalle = detalleContribuciones.reduce(
    (acc, item) => acc + item.monto,
    0
  );

  // ART y otros aportes de convenio: también sobre remuneración total
  const baseParaArtYOtros = baseContribuciones;
  const artMonto = (baseParaArtYOtros * (artPct || 0)) / 100;
  const otrosMonto = (baseParaArtYOtros * (otrosPct || 0)) / 100;

  const totalContribuciones = totalDetalle + artMonto + otrosMonto;

  const costoTotal = remuneracionBruta + noRem + totalContribuciones;
  const costoHora = costoTotal / horasMensuales;
  const costoDia = costoTotal / 30;

  const textoExplicacion = [
    `Las contribuciones patronales se calculan sobre una base de $${baseContribuciones.toLocaleString(
      "es-AR",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}, sin tope máximo, siguiendo la lógica de las bases 2, 3, 8 y 9 del Libro de Sueldos Digital.`,
    `En paralelo se informa, de manera referencial, la base de aportes del artículo 9 de la Ley 24.241, topeada entre un mínimo de $${basesArt9.minima.toLocaleString(
      "es-AR",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )} y un máximo de $${basesArt9.maxima.toLocaleString(
      "es-AR",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}, que es la que se utiliza para los aportes personales del trabajador.`,
    `Sobre la base de contribuciones se aplican las alícuotas del régimen seleccionado (${regimen?.label || "Régimen no identificado"}), más la alícuota de ART (${artPct}% si se informó) y los otros aportes de convenio (${otrosPct}% si corresponden).`,
    `El costo laboral total del puesto resulta de sumar sueldo bruto, conceptos no remunerativos y todas las contribuciones calculadas.`
  ].join(" ");

  return {
    convenio,
    provincia,
    regimenId: regimen?.id || regimenId,
    regimenLabel: regimen?.label || "Régimen sin configurar",
    bruto: remuneracionBruta,
    noRem,
    horasMensuales,
    periodo: periodo || null,

    // Bases
    baseImponibleUsada: baseContribuciones, // la que realmente se usa para las contribuciones
    baseContribuciones,
    baseAportesArt9,
    baseMinima: basesArt9.minima,
    baseMaxima: basesArt9.maxima,

    // Detalle
    detalleContribuciones,
    art: { pct: artPct, monto: artMonto },
    otros: { pct: otrosPct, monto: otrosMonto },
    totalContribuciones,
    costoTotal,
    costoHora,
    costoDia,

    textoExplicacion
  };
}
