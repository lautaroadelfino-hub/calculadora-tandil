// lib/firestoreValores.js
// De un valor de JS al formato tipado de la API REST de Firestore
// ({stringValue: "x"}, {integerValue: "44"}, {mapValue: {fields: …}}): la
// inversa de `valorDesdeRest` (lib/firestoreRest.js).
//
// POR QUÉ EXISTE: el vigía (scripts/vigia.mjs) escribe en Firestore por REST con
// la sesión de su propio usuario, sin el SDK. Hasta ahora lo único que escribía
// por REST era scripts/restaurar.mjs, que sube documentos ya tipados tal como
// los devolvió Firestore y no convierte nada. Acá se convierte lo que arma el
// código (un borrador, el estado del vigía).
//
// Es puro y no lee el entorno: se puede importar antes de cargar .env.local y
// desde cualquier test. Un `undefined` no se guarda (como hace el SDK con
// `ignoreUndefinedProperties`); un `null` sí, como `nullValue`.

/** Un valor de JS a su valor tipado de la API REST. */
export function valorARest(v) {
  if (v === undefined || v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    if (Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER) return { integerValue: String(v) };
    // NaN e Infinity viajan como texto; `valorDesdeRest` los vuelve a número.
    if (!Number.isFinite(v)) return { doubleValue: String(v) };
    return { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valorARest) } };
  if (typeof v === "object") return { mapValue: { fields: camposARest(v) } };
  throw new Error(`No sé guardar en Firestore un valor de tipo ${typeof v}`);
}

/** Un objeto plano a los `fields` de un documento REST. */
export function camposARest(objeto) {
  const fields = {};
  for (const k of Object.keys(objeto || {})) {
    if (objeto[k] === undefined) continue;
    fields[k] = valorARest(objeto[k]);
  }
  return fields;
}
