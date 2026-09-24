// lib/calculoContribuciones.js
// Las contribuciones a cargo del empleador, para la sección "Costo total
// empleador" del recibo que exige el art. 140 inc. j) de la LCT (Ley 27.802,
// reglamentado por el Decreto 407/2026).
//
// Es un módulo hermano de calculoGanancias.js y funciona igual: NO importa
// nada de data/, no conoce convenios, y recibe la tabla del período que la
// pantalla trajo de Firestore (colección parametros_contribuciones; la forma
// está en data/contribuciones.seed.json). El motor lo llama con las bases ya
// calculadas y le pasa, ya leídos del convenio, la ART típica y las
// contribuciones propias del CCT.
//
// LA REGLA DE ESTE ARCHIVO ES LA DEL PROYECTO: no adivina. Un régimen que no
// está en la tabla, una base o un rubro que no conoce, FRENAN con un mensaje.
// Lo único que hace sin tabla es decirlo: cero líneas, cero pesos, un aviso.
//
// SOBRE LAS BASES: cada concepto dice si se calcula sobre `remunerativo` o
// sobre `remunerativo_mas_no_remunerativo`. Nacional Sistema tiene 21 casillas
// por concepto para lo mismo, pero sus fórmulas usan sólo esas dos bases, y en
// los convenios cargados todas las sumas no remunerativas se comportan igual.
// El día que un convenio tenga dos sumas NR con tratamiento distinto, la
// línea crece (`integra_bases: [...]`); hasta entonces, dos palabras alcanzan.

import { RUBROS_DEL_COSTO_LABORAL } from "./vocabularioConvenios.js";

const RUBROS = RUBROS_DEL_COSTO_LABORAL.map((r) => r.id);

const NOMBRE_DE_BASE = {
  remunerativo: "Remunerativo",
  // "Con incidencia": los viáticos y las sumas sin incidencia (art. 106 LCT)
  // no entran, y el recibo tiene que decirlo, o la etiqueta miente.
  remunerativo_mas_no_remunerativo: "Remunerativo + no remunerativo con incidencia",
  basico: "Sueldo básico",
};

function montoDeLaBase(base, bases, queEs) {
  if (base === "remunerativo") return bases.remunerativo;
  if (base === "remunerativo_mas_no_remunerativo") return bases.remunerativo + bases.noRemunerativo;
  // Sólo el básico de la escala: Camioneros calcula así sus aportes patronales (8.1.2, 8.1.4, 8.1.5).
  if (base === "basico") return bases.basico;
  throw new Error(
    `${queEs} se calcula sobre "${base}", que el motor no conoce. Revisalo en el panel de administración.`
  );
}

function revisarRubro(rubro, queEs) {
  if (!RUBROS.includes(rubro)) {
    throw new Error(
      `${queEs} tiene el rubro "${rubro}", que el motor no conoce. Los rubros son los siete del ` +
        `Decreto 407/2026: ${RUBROS.join(", ")}. Revisalo en el panel de administración.`
    );
  }
}

/**
 * Elige el régimen: el pedido si está en la tabla, si no el predeterminado.
 * Antes, un régimen desconocido caía en MiPyME en silencio y un test lo
 * consagraba. Ahora frena.
 */
function elegirRegimen(tabla, regimenId) {
  const regimenes = tabla.regimenes || {};
  if (regimenId) {
    if (!regimenes[regimenId]) {
      throw new Error(
        `El régimen de contribuciones "${regimenId}" no está en la tabla del período. ` +
          `Revisalo en /admin → Contribuciones.`
      );
    }
    return { id: regimenId, ...regimenes[regimenId] };
  }
  const predeterminado = Object.entries(regimenes).find(([, r]) => r.predeterminado === true);
  if (!predeterminado) {
    throw new Error(
      "La tabla de contribuciones no marca ningún régimen como predeterminado y la persona no eligió uno. " +
        "Marcalo en /admin → Contribuciones."
    );
  }
  return { id: predeterminado[0], ...predeterminado[1] };
}

/**
 * Calcula las contribuciones del empleador.
 *
 * @param {Object} args
 * @param {number} args.remunerativo     base remunerativa del empleador (el motor ya decidió si incluye el SAC).
 * @param {number} args.noRemunerativo   total no remunerativo.
 * @param {number} [args.factorJornada]  horas del puesto / jornada completa; prorratea la detracción.
 * @param {Object|null} args.tabla       el documento del período, o null si no hay.
 * @param {string|null} [args.regimenId] el régimen elegido; null = el predeterminado de la tabla.
 * @param {Object} [args.art]            { alicuota: fracción|null, sumaFija: pesos }. Sin alícuota, la fila queda pendiente.
 * @param {Array}  [args.delConvenio]    contribuciones propias del CCT: [{ id, label, porcentaje, valor_fijo, base, rubro }].
 * @returns {{ lineas: Array, total: number, regimen: Object|null, detraccion: Object|null, avisos: string[] }}
 */
export function calcularContribuciones({
  remunerativo = 0,
  noRemunerativo = 0,
  basico = 0,
  factorJornada = 1,
  tabla = null,
  regimenId = null,
  art = null,
  delConvenio = [],
}) {
  const avisos = [];

  if (!tabla) {
    avisos.push(
      // Este aviso lo lee el visitante en el recibo: se le dice qué falta, no
      // dónde se carga (eso es del panel, no de la pantalla pública).
      "Sin tabla de contribuciones patronales para este período: el recibo no muestra la sección del empleador."
    );
    return { lineas: [], total: 0, regimen: null, detraccion: null, avisos };
  }

  const bases = { remunerativo: Number(remunerativo) || 0, noRemunerativo: Number(noRemunerativo) || 0, basico: Number(basico) || 0 };
  const regimen = elegirRegimen(tabla, regimenId);

  // La detracción de la Ley 27.541 es dato del período. Si la tabla no la
  // trae, no se inventa: se calcula sin ella (salen más altas) y se avisa.
  let detraccion = null;
  if (tabla.detraccion && tabla.detraccion.monto != null) {
    const monto = Number(tabla.detraccion.monto) || 0;
    const prorratea = tabla.detraccion.prorratea_por_jornada !== false;
    detraccion = { monto, prorrateada: prorratea ? monto * factorJornada : monto, prorrateaPorJornada: prorratea };
  } else {
    avisos.push(
      "Las contribuciones salen más altas: la tabla del período no trae la detracción de la Ley 27.541."
    );
  }
  const detraccionProrrateada = detraccion ? detraccion.prorrateada : 0;

  const lineas = [];

  const lineaDesdeConcepto = (c, origen, queEs) => {
    revisarRubro(c.rubro, queEs);
    if (c.unidad === "suma_fija") {
      // Por trabajador, sin prorratear: FFEP y el seguro de vida se pagan por cabeza.
      return {
        id: c.id,
        concepto: c.label || c.id,
        tipo: "contribucion",
        monto: Number(c.monto) || 0,
        unidad: "suma_fija",
        alicuota: null,
        base: null,
        baseLabel: "Suma fija por trabajador",
        detraccionAplicada: 0,
        rubro: c.rubro,
        origen,
      };
    }
    if (c.unidad !== "porcentaje") {
      throw new Error(`${queEs} tiene la unidad "${c.unidad}", que el motor no conoce.`);
    }
    const bruta = montoDeLaBase(c.base, bases, queEs);
    const aplicaDetraccion = c.aplica_detraccion === true && detraccionProrrateada > 0;
    // Nunca una base negativa: con una jornada mínima la detracción puede superarla.
    const detraccionAplicada = aplicaDetraccion ? Math.min(bruta, detraccionProrrateada) : 0;
    const neta = bruta - detraccionAplicada;
    return {
      id: c.id,
      concepto: c.label || c.id,
      tipo: "contribucion",
      monto: neta * (Number(c.alicuota) || 0),
      unidad: "porcentaje",
      alicuota: Number(c.alicuota) || 0,
      base: neta,
      baseLabel: NOMBRE_DE_BASE[c.base] + (detraccionAplicada > 0 ? " − detracción" : ""),
      detraccionAplicada,
      rubro: c.rubro,
      origen,
    };
  };

  for (const c of regimen.conceptos || []) {
    lineas.push(lineaDesdeConcepto(c, "regimen", `La contribución "${c.label || c.id}" del régimen`));
  }

  for (const u of tabla.universales || []) {
    lineas.push(lineaDesdeConcepto(u, "universal", `La suma fija "${u.label || u.id}"`));
  }

  // ART: cada empleador negocia la suya, así que siempre es estimada. Sin
  // alícuota no se inventa un 3%: la fila queda pendiente y se avisa.
  if (art) {
    const tieneAlicuota = art.alicuota !== null && art.alicuota !== undefined && art.alicuota !== "";
    const alicuota = tieneAlicuota ? Number(art.alicuota) || 0 : null;
    const sumaFija = Number(art.sumaFija) || 0;
    if (!tieneAlicuota) {
      avisos.push(
        "No se informó la alícuota de ART: esa fila quedó sin monto y el costo del empleador está incompleto."
      );
    }
    lineas.push({
      id: "art",
      concepto: tieneAlicuota ? "ART (estimada)" : "ART (alícuota no informada)",
      tipo: "contribucion",
      monto: (alicuota || 0) * bases.remunerativo + sumaFija,
      unidad: "porcentaje",
      alicuota,
      base: bases.remunerativo,
      baseLabel: NOMBRE_DE_BASE.remunerativo + (sumaFija > 0 ? " + suma fija" : ""),
      detraccionAplicada: 0,
      rubro: "art",
      origen: "art",
      estimada: true,
      pendiente: !tieneAlicuota,
    });
  }

  // Lo que el convenio manda pagar al empleador: cámaras, fondos, seguros
  // propios del CCT. La cara patronal de retenciones_sindicales.
  for (const c of delConvenio || []) {
    const queEs = `La contribución "${c.label || c.id}" del convenio`;
    revisarRubro(c.rubro, queEs);
    if (c.valor_fijo != null && c.valor_fijo !== "") {
      lineas.push({
        id: c.id,
        concepto: c.label || c.id,
        tipo: "contribucion",
        monto: Number(c.valor_fijo) || 0,
        unidad: "suma_fija",
        alicuota: null,
        base: null,
        baseLabel: "Suma fija por trabajador",
        detraccionAplicada: 0,
        rubro: c.rubro,
        origen: "convenio",
      });
      continue;
    }
    const bruta = montoDeLaBase(c.base || "remunerativo", bases, queEs);
    lineas.push({
      id: c.id,
      concepto: c.label || c.id,
      tipo: "contribucion",
      monto: bruta * (Number(c.porcentaje) || 0),
      unidad: "porcentaje",
      alicuota: Number(c.porcentaje) || 0,
      base: bruta,
      baseLabel: NOMBRE_DE_BASE[c.base || "remunerativo"],
      detraccionAplicada: 0,
      rubro: c.rubro,
      origen: "convenio",
    });
  }

  const total = lineas.reduce((acc, l) => acc + l.monto, 0);
  return {
    lineas,
    total,
    regimen: { id: regimen.id, label: regimen.label || regimen.id },
    detraccion,
    avisos,
  };
}

/**
 * La composición del costo laboral por rubro, como la pide el decreto: cada
 * uno de los siete con lo que pone el empleador y lo que pone el trabajador.
 * Recibe el `detalle` completo del recibo: suma las líneas `contribucion` del
 * lado del empleador y las `retencion` del lado del trabajador, según el
 * `rubro` que cada una declara. Las que no declaran rubro (Ganancias, que es
 * impuesto del trabajador y no costo laboral) quedan afuera.
 */
export function resumenPorRubro(detalle, costoLaboral = null) {
  const rubros = {};
  for (const r of RUBROS_DEL_COSTO_LABORAL) rubros[r.id] = { label: r.label, empleador: 0, trabajador: 0, total: 0, porcentaje: 0 };

  for (const l of detalle || []) {
    if (!l.rubro) continue;
    revisarRubro(l.rubro, `La línea "${l.concepto}"`);
    if (l.tipo === "contribucion") rubros[l.rubro].empleador += l.monto;
    else if (l.tipo === "retencion") rubros[l.rubro].trabajador += l.monto;
  }

  let total = 0;
  for (const r of Object.values(rubros)) {
    r.total = r.empleador + r.trabajador;
    total += r.total;
  }
  for (const r of Object.values(rubros)) {
    // `porcentaje` es sobre el total de las cargas (suman 100 entre rubros);
    // `porcentajeDelCosto`, sobre el costo laboral total, si se lo pasan.
    r.porcentaje = total > 0 ? (r.total / total) * 100 : 0;
    r.porcentajeDelCosto = costoLaboral > 0 ? (r.total / costoLaboral) * 100 : null;
  }

  return { rubros, total };
}
