// lib/permalink.js
// Una simulación se puede guardar y compartir: los datos viajan en la URL.
//
// POR QUÉ EXISTE: la auditoría del 13/9/2026 lo pidió desde tres personas
// distintas. La URL no cambiaba mientras se usaba la calculadora, así que un
// recibo no se podía mandar a un colega ni volver a él, y un F5 borraba todo.
// Esto es puro: convierte entre lo que la persona cargó y los parámetros de la
// URL. La pantalla decide cuándo leer y cuándo escribir.

/** Los campos que la pantalla pregunta siempre, con su tipo. */
export const UNIVERSALES = {
  incluir_sac: "boolean",
  ganancias_sac: "string",
  dias_vacaciones: "number",
  regimen_contribuciones: "string",
  art_alicuota: "number",
  art_suma_fija: "number",
  conyuge: "boolean",
  hijos: "number",
  hijos_incapacitados: "number",
};

function tiposDe(convenio) {
  const tipos = {};
  for (const i of convenio?.inputs_requeridos || []) if (i && i.id) tipos[i.id] = i.tipo === "select" ? "string" : i.tipo;
  return { ...tipos, ...UNIVERSALES };
}

/**
 * Lo cargado -> parámetros de la URL. Sólo lo que tiene valor.
 * @returns {string} sin el "?" inicial; vacío si no hay período.
 */
export function paramsDesdeEntradas(convenio, valores = {}, periodo = "") {
  if (!periodo) return "";
  const p = new URLSearchParams();
  p.set("periodo", periodo);
  for (const [id, tipo] of Object.entries(tiposDe(convenio))) {
    const v = valores[id];
    if (v === undefined || v === null || v === "") continue;
    if (tipo === "boolean") {
      // "0" explícito: una casilla destildada también es una elección. Antes
      // se omitía y quien abría el link recibía el valor por defecto, que
      // puede ser el contrario (auditoría del 23/9/2026).
      p.set(id, v ? "1" : "0");
    } else {
      p.set(id, String(v));
    }
  }
  return p.toString();
}

/**
 * La marca que lleva el link de "Copiar link" (`?…&via=link`). Sirve para
 * saber, en la calificación del recibo, si la persona llegó por un link que
 * alguien le pasó: sin la marca no se distingue de un F5 o de una pestaña que
 * el celular recargó, porque después de calcular la URL ya trae la simulación
 * (replaceState). `entradasDesdeParams` la ignora y `paramsDesdeEntradas` no
 * la escribe, así que el primer recálculo la saca de la URL.
 */
export const MARCA_DE_LINK = "via";
export const conMarcaDeLink = (query) => (query ? `${query}&${MARCA_DE_LINK}=link` : query);
/** ¿La dirección con que se abrió la página trae la marca del link compartido? */
export function llegoPorLinkCompartido(search) {
  return new URLSearchParams(String(search || "")).get(MARCA_DE_LINK) === "link";
}

/**
 * Lo que la URL de una simulación dice de la persona y no hace falta para
 * reproducir un error del cálculo: la afiliación sindical y los hijos con
 * discapacidad son datos sensibles (Ley 25.326, art. 2), y el cónyuge y los
 * hijos, datos de su familia. "Reportar error" manda la URL sin ellos.
 */
export const PARAMS_SENSIBLES = ["afiliado_sindicato", "conyuge", "hijos", "hijos_incapacitados", MARCA_DE_LINK];
export function urlSinDatosSensibles(href) {
  try {
    const u = new URL(String(href || ""));
    for (const p of PARAMS_SENSIBLES) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return "";
  }
}

/**
 * Parámetros de la URL -> lo cargado. Sólo se aceptan los campos que este
 * convenio conoce (y los universales); un select con un valor que no está
 * entre sus opciones se ignora, para no dejar el formulario en un estado que
 * el motor rechace después.
 * @returns {{ valores: object, periodo: string|null }}
 */
export function entradasDesdeParams(convenio, searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(String(searchParams || ""));
  const valores = {};
  const tipos = tiposDe(convenio);
  const opcionesDe = {};
  for (const i of convenio?.inputs_requeridos || []) if (i && i.tipo === "select") opcionesDe[i.id] = i.opciones || [];
  for (const [id, tipo] of Object.entries(tipos)) {
    if (!params.has(id)) continue;
    const crudo = params.get(id);
    if (tipo === "boolean") valores[id] = crudo === "1" || crudo === "true";
    else if (tipo === "number") valores[id] = crudo;
    else if (opcionesDe[id] && !opcionesDe[id].includes(crudo)) continue;
    else valores[id] = crudo;
  }
  const periodo = params.get("periodo");
  return { valores, periodo: periodo && /^\d{4}-\d{2}$/.test(periodo) ? periodo : null };
}
