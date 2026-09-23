// lib/reciboOficial.js
// Del resultado del motor a las celdas del recibo oficial.
//
// El Anexo III del Decreto 407/2026 (IF-2026-53626708-APN-STEYSS#MCH, copia en
// docs/decreto-407-2026-anexo-III.pdf) fija el modelo al que "deberá
// ajustarse" el recibo: encabezado de casillas, tabla del empleador con
// CONCEPTO / UNIDAD / BASE / MONTO, franjas de totales, la misma tabla para el
// trabajador con sus aportes, la composición salarial, el neto, el detalle por
// rubro y la torta del costo total. Este módulo arma esas celdas, ya
// formateadas, y no sabe nada de React: la pantalla sólo las dibuja, y los
// tests las revisan sin navegador.
//
// Es puro y no adivina: una línea sin `detalle` sale con las celdas vacías,
// nunca con un número inventado.

import { MESES } from "./periodos.js";
import { DIVISORES } from "./parametrosLaborales.js";
import { TIPOS_DE_LINEA } from "./vocabularioConvenios.js";
import { explicarLinea } from "./explicarLinea.js";

export const money = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 0.1077 -> "10,77%" */
export const pct = (fraccion) =>
  (Number(fraccion || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

/** 36.5 -> "36,5" */
export const num = (n) => Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });

const UNIDADES = { dia: ["día", "días"], km: ["km", "km"], viaje: ["viaje", "viajes"], mes: ["mes", "meses"], hora: ["hora", "horas"], año: ["año", "años"] };
const plural = (n, unidad) => {
  const [uno, varios] = UNIDADES[unidad] || [unidad, unidad];
  return Number(n) === 1 ? uno : varios;
};

const VACIA = Object.freeze({ unidad: "", base: "", baseNota: "" });

/** La frase del modelo para el subtítulo de las contribuciones propias del convenio. */
export const SUBTITULO_CCT = "Costo derivado del CCT:";

/** La nota al pie del detalle, textual del anexo. */
export const NOTA_SEGURIDAD_SOCIAL =
  "Nota: Seguridad social del empleador incluye SIPA, Fondo Nacional de Empleo y Asignaciones Familiares";

/**
 * Las celdas UNIDAD y BASE de una línea, como texto. `baseNota` es la
 * aclaración chica que va debajo de la base (sobre qué se calculó).
 */
export function celdasDeLinea(linea) {
  if (!linea) return VACIA;

  if (linea.tipo === "contribucion") {
    if (linea.unidad === "suma_fija") return { unidad: "fija", base: "", baseNota: linea.baseLabel || "" };
    return {
      unidad: linea.pendiente || linea.alicuota == null ? "sin dato" : pct(linea.alicuota),
      base: linea.base != null ? money(linea.base) : "",
      baseNota: linea.baseLabel || "",
    };
  }

  const d = linea.detalle;
  if (!d || !d.tipo) return VACIA;

  switch (d.tipo) {
    case "escala": {
      // El modelo pone "30" en la unidad del sueldo básico: los días del mes.
      // Con jornada parcial, la proporción de horas es lo que explica el importe.
      const parcial = d.factor != null && Math.abs(d.factor - 1) > 1e-9;
      return {
        unidad: parcial ? `${num(d.horas)}/${num(d.horasCompletas)} hs` : String(DIVISORES.diasDelMes),
        base: money(d.base),
        baseNota: "escala del convenio",
      };
    }
    case "porcentaje": {
      const notas = [];
      if (d.baseLabel) notas.push(d.baseLabel);
      if (d.porAño != null && d.años != null) notas.push(`${pct(d.porAño)} × ${num(d.años)} ${plural(d.años, "año")}`);
      else if (d.tramo) notas.push(`tramo desde ${num(d.tramo.desde_años)} años, ${num(d.años)} de antigüedad`);
      return { unidad: pct(d.alicuota), base: money(d.base), baseNota: notas.join(" · ") };
    }
    case "proporcion":
      return { unidad: pct(d.alicuota), base: money(d.base), baseNota: d.baseLabel || "" };
    case "ganancias":
      return { unidad: pct(d.alicuota), base: money(d.base), baseNota: "base imponible" };
    case "por_unidad":
      return { unidad: `${num(d.cantidad)} ${plural(d.cantidad, d.unidad)}`, base: money(d.valorUnitario), baseNota: "por unidad" };
    case "hora_extra":
      return {
        unidad: `${num(d.cantidad)} hs × ${num(d.recargo)}`,
        base: money(d.valorHora),
        baseNota: `valor hora: ${money(d.baseHora)} / ${num(d.divisor)} hs`,
      };
    case "vacaciones":
      return { unidad: `${num(d.cantidad)} ${plural(d.cantidad, "dia")}`, base: money(d.valorUnitario), baseNota: d.baseLabel || "" };
    case "suma_fija":
      return { unidad: "fija", base: "", baseNota: d.baseLabel || "" };
    default:
      return VACIA;
  }
}

/** Las líneas del recibo separadas por tipo, más las que la pantalla no sabe dibujar. */
export function lineasPorTipo(detalle) {
  const lineas = detalle || [];
  const porTipo = (tipo) => lineas.filter((l) => l.tipo === tipo);
  return {
    remunerativos: porTipo("remunerativo"),
    noRemunerativos: porTipo("no_remunerativo"),
    retenciones: porTipo("retencion"),
    contribuciones: porTipo("contribucion"),
    desconocidas: lineas.filter((l) => !TIPOS_DE_LINEA.includes(l.tipo)),
  };
}

/** Una fila lista para dibujar: la línea con sus celdas y la frase "de dónde sale". */
function fila(linea) {
  return { clase: "linea", linea, celdas: celdasDeLinea(linea), explicacion: explicarLinea(linea) };
}

/**
 * La tabla del empleador, en el orden del modelo: ART, las contribuciones del
 * régimen, las sumas fijas universales (FFEP, seguro de vida) y, si el
 * convenio manda pagar algo propio, el subtítulo "Costo derivado del CCT:"
 * con esas líneas debajo.
 */
export function filasEmpleador(detalle) {
  const { contribuciones } = lineasPorTipo(detalle);
  const de = (origen) => contribuciones.filter((l) => l.origen === origen);
  const conocidos = ["art", "regimen", "universal", "convenio"];
  const otras = contribuciones.filter((l) => !conocidos.includes(l.origen));
  const filas = [...de("art"), ...de("regimen"), ...de("universal"), ...otras].map(fila);
  const delConvenio = de("convenio");
  if (delConvenio.length > 0) {
    filas.push({ clase: "subtitulo", texto: SUBTITULO_CCT });
    delConvenio.forEach((l) => filas.push(fila(l)));
  }
  return filas;
}

/**
 * La tabla del trabajador: haberes remunerativos, no remunerativos, un
 * renglón en blanco (como en el modelo) y los aportes y descuentos. Los
 * descuentos van con importe positivo: el signo lo pone la franja
 * "Descuentos" de la composición salarial.
 */
export function filasTrabajador(detalle) {
  const { remunerativos, noRemunerativos, retenciones } = lineasPorTipo(detalle);
  const filas = [...remunerativos, ...noRemunerativos].map(fila);
  if (filas.length > 0 && retenciones.length > 0) filas.push({ clase: "separador" });
  retenciones.forEach((l) => filas.push(fila(l)));
  return filas;
}

const sumar = (lineas) => lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0);

/** Lo que el empleador paga de seguro colectivo de vida obligatorio (la línea con id "scvo"). */
function montoScvo(detalle) {
  return sumar((detalle || []).filter((l) => l.tipo === "contribucion" && l.id === "scvo"));
}

/**
 * "Detalle de la composición salarial": los seis bloques del modelo, cada uno
 * con su total y lo que pone cada lado, desde los rubros del decreto que ya
 * calcula el motor. El SCVO se separa del rubro "otros" por su id, no por el
 * texto. Si en "otros" o en "cámaras" queda plata, salen como bloques
 * adicionales (el modelo termina en "etc…"). Sin sección del empleador, null.
 */
export function bloquesComposicion(resultado) {
  const e = resultado && resultado.costoEmpleador;
  if (!e || !e.rubros) return null;
  const r = e.rubros;
  const scvo = montoScvo(resultado.detalle);
  const otrosSinScvo = { empleador: r.otros.empleador - scvo, trabajador: r.otros.trabajador };

  const dosLados = (rubro, orden = ["empleador", "trabajador"]) =>
    orden.map((lado) => ({ lado: lado === "empleador" ? "Empleador" : "Trabajador", monto: rubro[lado] }));

  const bloques = [
    { id: "sindical", titulo: "Total Costo Sindical", total: r.sindical.total, partes: dosLados(r.sindical) },
    { id: "seguridad_social", titulo: "Total Seguridad Social", total: r.seguridad_social.total, partes: dosLados(r.seguridad_social) },
    { id: "obra_social", titulo: "Total Obra Social:", total: r.obra_social.total, partes: dosLados(r.obra_social) },
    { id: "inssjp", titulo: "Total costo INSSJP:", total: r.inssjp.total, partes: dosLados(r.inssjp, ["trabajador", "empleador"]) },
    {
      id: "art",
      titulo: "Total costo ART:",
      total: r.art.total,
      partes: r.art.trabajador > 0 ? dosLados(r.art) : [{ lado: "Empleador", monto: r.art.empleador }],
    },
    { id: "scvo", titulo: "Total Costo SCVO:", total: scvo, partes: [{ lado: "Empleador", monto: scvo }] },
  ];
  if (r.camaras.total > 0) {
    bloques.push({ id: "camaras", titulo: "Total Cámaras y entidades:", total: r.camaras.total, partes: dosLados(r.camaras) });
  }
  const totalOtros = otrosSinScvo.empleador + otrosSinScvo.trabajador;
  if (totalOtros > 0) {
    bloques.push({ id: "otros", titulo: "Total Otros:", total: totalOtros, partes: dosLados(otrosSinScvo) });
  }
  return { bloques, nota: NOTA_SEGURIDAD_SOCIAL };
}

/**
 * La torta "Costo total empleador" del modelo: sueldo neto, seguridad social,
 * costo sindical, obra social, PAMI y ART. Se agregan "Otros" (SCVO, cámaras)
 * e "Impuesto a las Ganancias" cuando existen, para que las porciones sumen
 * exactamente el costo laboral: neto + cargas de los dos lados + lo retenido
 * sin rubro = bruto + no remunerativo + contribuciones. Las porciones en cero
 * no se devuelven. Sin sección del empleador, null.
 */
export function porcionesDelCosto(resultado) {
  const e = resultado && resultado.costoEmpleador;
  if (!e || !e.rubros) return null;
  const r = e.rubros;
  const { retenciones } = lineasPorTipo(resultado.detalle);
  const retenidoSinRubro = sumar(retenciones.filter((l) => !l.rubro));
  const total = e.costoLaboral;

  const porciones = [
    { id: "neto", label: "Sueldo Neto", monto: resultado.totales.neto },
    { id: "seguridad_social", label: "Seguridad Social", monto: r.seguridad_social.total },
    { id: "sindical", label: "Costo Sindical", monto: r.sindical.total },
    { id: "obra_social", label: "Obra Social", monto: r.obra_social.total },
    { id: "inssjp", label: "PAMI", monto: r.inssjp.total },
    { id: "art", label: "ART", monto: r.art.total },
    { id: "otros", label: "Otros (SCVO, cámaras)", monto: r.otros.total + r.camaras.total },
    { id: "ganancias", label: "Impuesto a las Ganancias", monto: retenidoSinRubro },
  ]
    .filter((p) => p.monto > 0)
    .map((p) => ({ ...p, porcentaje: total > 0 ? (p.monto / total) * 100 : 0 }));

  return { porciones, total };
}

/**
 * Las casillas del encabezado que la simulación sí conoce. Las demás
 * (empresa, CUIT, nombre, legajo, CUIL, fecha de ingreso, lugar y fecha de
 * pago) quedan en blanco: no se inventan.
 */
export function encabezado(resultado, entradas, periodoId) {
  const [anio, mes] = String(periodoId || "").split("-");
  const años = Number((entradas && entradas.antiguedad_años) || 0);
  const t = (resultado && resultado.totales) || {};
  return {
    mes: MESES[Number(mes) - 1] || "",
    año: anio || "",
    categoria: [entradas && entradas.categoria, entradas && entradas.zona].filter(Boolean).join(" · "),
    sueldoBruto: money((t.bruto || 0) + (t.noRemunerativo || 0)),
    antiguedad: `${num(años)} ${plural(años, "año")}`,
  };
}
