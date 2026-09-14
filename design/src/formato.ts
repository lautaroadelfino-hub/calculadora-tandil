// design/src/formato.ts
// Cómo se escriben los números en LiquidAR: pesos argentinos con coma decimal.
export const money = (n: number | null | undefined): string =>
  "$" + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 0.1077 -> "10,77%" */
export const pct = (fraccion: number | null | undefined): string =>
  (Number(fraccion || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

/** 36.5 -> "36,5" */
export const num = (n: number | null | undefined): string =>
  Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });
