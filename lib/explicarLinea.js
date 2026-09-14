// lib/explicarLinea.js
// De dónde sale cada línea del recibo, en una frase.
//
// POR QUÉ EXISTE: la auditoría en frío del 13/9/2026 lo dijo con todas las
// letras: la tabla del empleador muestra base y porcentaje fila por fila, pero
// los haberes y las retenciones del trabajador eran sólo concepto e importe.
// Dos líneas con "3%" usaban bases distintas y el recibo no lo decía. "Con
// esto no firmo nada", dijo el contador. El motor ahora deja en cada línea un
// `detalle` con la cuenta; acá se convierte en texto para la pantalla. Es
// puro: entra una línea, sale una frase o null.

const money = (n) => "$" + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (f) => (Number(f || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 3 }) + "%";
const num = (n) => Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });

const UNIDADES = { dia: ["día", "días"], km: ["km", "km"], viaje: ["viaje", "viajes"], mes: ["mes", "meses"], hora: ["hora", "horas"], año: ["año", "años"] };
const plural = (n, unidad) => {
  const [uno, varios] = UNIDADES[unidad] || [unidad, unidad];
  return Number(n) === 1 ? uno : varios;
};

/**
 * @param {object} linea  una línea del recibo, con o sin `detalle`.
 * @returns {string|null} la explicación, o null si la línea no trae detalle.
 */
export function explicarLinea(linea) {
  const d = linea && linea.detalle;
  if (!d || !d.tipo) return null;

  switch (d.tipo) {
    case "escala": {
      const prorrateo = d.factor != null && Math.abs(d.factor - 1) > 1e-9
        ? ` × ${num(d.horas)}/${num(d.horasCompletas)} hs`
        : "";
      return `Escala del convenio: ${money(d.base)}${prorrateo}`;
    }
    case "porcentaje": {
      const partes = [];
      if (d.porAño != null && d.años != null) partes.push(`${pct(d.porAño)} × ${num(d.años)} ${plural(d.años, "año")} = ${pct(d.alicuota)}`);
      else if (d.tramo) partes.push(`${pct(d.alicuota)} (tramo desde ${num(d.tramo.desde_años)} años, ${num(d.años)} de antigüedad)`);
      else partes.push(pct(d.alicuota));
      partes.push(`sobre ${money(d.base)}`);
      if (d.baseLabel) partes.push(`(${d.baseLabel})`);
      return partes.join(" ");
    }
    case "por_unidad":
      return `${num(d.cantidad)} ${plural(d.cantidad, d.unidad)} × ${money(d.valorUnitario)}`;
    case "hora_extra":
      return `${num(d.cantidad)} ${plural(d.cantidad, "hora")} × ${money(d.valorHora)} × ${num(d.recargo)} · valor hora: ${money(d.baseHora)} / ${num(d.divisor)} hs`;
    case "proporcion":
      return `${pct(d.alicuota)} de ${money(d.base)}${d.baseLabel ? ` (${d.baseLabel})` : ""}`;
    case "vacaciones":
      return `${num(d.cantidad)} ${plural(d.cantidad, "dia")} × ${money(d.valorUnitario)} (${d.baseLabel})`;
    case "suma_fija":
      return "Suma fija" + (d.baseLabel ? ` (${d.baseLabel})` : "");
    case "ganancias":
      return `Escala del ${pct(d.alicuota)} sobre una base imponible de ${money(d.base)}`;
    default:
      return null;
  }
}

export default explicarLinea;
