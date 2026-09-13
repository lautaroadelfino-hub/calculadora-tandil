// lib/calculoEmpleador.js
import REGIMENES_CONTRIB from "@/data/contribucionesPatronales.json";
import BASES_IMPONIBLES from "@/data/basesImponibles.json";
import { aplicarTopeArt9, DIVISORES } from "@/lib/parametrosLaborales";

// ESTE MÓDULO SE RETIRA junto con la pantalla /empleador: el recibo ya muestra
// el costo del empleador (lib/calculoContribuciones.js, con la tabla del
// período en Firestore). Las dos funciones de abajo volvieron acá desde
// parametrosLaborales.js porque importan data/, y ese archivo tiene que
// quedar limpio para que el motor pueda usarlo (Regla 3 del criterio).

/**
 * Bases mínima y máxima del art. 9 de la Ley 24.241 para un período, del JSON
 * viejo. Cuando el período NO está cargado lo dice en vez de devolver
 * {minima: 0, maxima: 999999999} como si fuera un dato real.
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

/** El último período con bases cargadas en el JSON viejo. */
export function ultimoPeriodoConBases() {
  const ps = Object.keys(BASES_IMPONIBLES?.porPeriodo || {}).sort();
  return ps[ps.length - 1] || null;
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

  const bases = basesArt9(periodo);

  // Por ahora consideramos que todo el bruto integra las bases de contribuciones.
  const remuneracionBruta = Number(bruto) || 0;

  // Base para APORTES personales (informativa, por art. 9 Ley 24.241).
  const baseAportesArt9 = aplicarTopeArt9(remuneracionBruta, bases);

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
  const costoDia = costoTotal / DIVISORES.diasDelMes;

  const textoExplicacion = [
    `Las contribuciones patronales se calculan sobre una base de $${baseContribuciones.toLocaleString(
      "es-AR",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}, sin tope máximo, siguiendo la lógica de las bases 2, 3, 8 y 9 del Libro de Sueldos Digital.`,
    `En paralelo se informa, de manera referencial, la base de aportes del artículo 9 de la Ley 24.241, topeada entre un mínimo de $${bases.minima.toLocaleString(
      "es-AR",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )} y un máximo de $${bases.maxima.toLocaleString(
      "es-AR",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}, que es la que se utiliza para los aportes personales del trabajador.`,
    `Sobre la base de contribuciones se aplican las alícuotas del régimen seleccionado (${regimen?.label || "Régimen no identificado"}), más la alícuota de ART (${artPct}% si se informó) y los otros aportes de convenio (${otrosPct}% si corresponden).`,
    `El costo laboral total del puesto resulta de sumar sueldo bruto, conceptos no remunerativos y todas las contribuciones calculadas.`,
    bases.vencido
      ? `ATENCIÓN: no hay bases del artículo 9 cargadas para ${periodo || "este período"}. Se usaron las de ${bases.periodoUsado || "ningún período"}, así que la base de aportes informada puede no ser la vigente.`
      : ""
  ].filter(Boolean).join(" ");

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
    baseMinima: bases.minima,
    baseMaxima: bases.maxima,
    // Antes, si el período no estaba cargado se caía a {minima: 0, maxima:
    // 999999999} y la pantalla mostraba "Máx $999.999.999,00" como si fuera
    // un dato real. Ahora lo dice.
    basesVencidas: bases.vencido === true,
    basesDelPeriodo: bases.periodoUsado,
    ultimoPeriodoConBases: ultimoPeriodoConBases(),

    // Detalle
    detalleContribuciones,
    art: { pct: artPct, monto: artMonto },
    otros: { pct: otrosPct, monto: otrosMonto },
    totalContribuciones,
    // El "% sobre el bruto" estaba calculado DOS VECES dentro del JSX de
    // app/empleador/page.jsx, con distinta cantidad de decimales, así que la
    // misma pantalla mostraba dos valores del mismo número. Se calcula acá.
    porcentajeSobreBruto: remuneracionBruta > 0 ? (totalContribuciones / remuneracionBruta) * 100 : 0,
    costoTotal,
    costoHora,
    costoDia,

    textoExplicacion
  };
}
