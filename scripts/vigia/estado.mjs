// scripts/vigia/estado.mjs
// La memoria del vigía entre corridas: qué vio de cada fuente, cuándo le fue
// bien o mal, y el registro de cada corrida.
//
//   vigia/estado            un solo documento, se reemplaza entero en cada corrida
//   vigia_corridas/<id>     una por corrida (se conservan las últimas 60)
//
// Un ítem se marca "visto" sólo cuando terminó en borrador, se clasificó como
// irrelevante o ya estaba publicado; si falló, no, y se reintenta al día
// siguiente. Las funciones sobre el estado son puras (reciben y devuelven el
// objeto); las que tocan Firestore reciben el cliente.

export const RUTA_ESTADO = "vigia/estado";
export const COLECCION_CORRIDAS = "vigia_corridas";
export const FUENTES = ["boletinOficial", "camioneros", "faecys", "uthgra", "arca"];
export const TOPE_VISTOS = 300;
export const CORRIDAS_A_CONSERVAR = 60;

const fuenteVacia = () => ({ vistos: [], ultimoOk: null, fallasSeguidas: 0, ultimoError: null, ultimaFechaRevisada: null, ultimoItem: null });

export function estadoInicial() {
  return {
    ultimaCorrida: null,
    fuentes: Object.fromEntries(FUENTES.map((f) => [f, fuenteVacia()])),
    ultimoAvisoVivo: null,
  };
}

/** El estado guardado, completado con lo que le falte (una fuente nueva, por ejemplo). */
export function completarEstado(guardado) {
  const base = estadoInicial();
  const estado = { ...base, ...(guardado || {}) };
  estado.fuentes = { ...base.fuentes };
  for (const [nombre, datos] of Object.entries((guardado && guardado.fuentes) || {})) {
    estado.fuentes[nombre] = { ...fuenteVacia(), ...datos, vistos: Array.isArray(datos.vistos) ? datos.vistos : [] };
  }
  return estado;
}

export function fueVisto(estado, fuente, id) {
  const f = estado.fuentes[fuente];
  return Boolean(f && f.vistos.includes(id));
}

/** Anota un ítem como visto, sin repetir y conservando sólo los últimos `tope`. */
export function marcarVisto(estado, fuente, id, { tope = TOPE_VISTOS } = {}) {
  if (!estado.fuentes[fuente]) estado.fuentes[fuente] = fuenteVacia();
  const f = estado.fuentes[fuente];
  f.vistos = f.vistos.filter((x) => x !== id);
  f.vistos.push(id);
  if (f.vistos.length > tope) f.vistos = f.vistos.slice(f.vistos.length - tope);
  return estado;
}

/** Cómo le fue a una fuente en esta corrida. Devuelve si corresponde avisar (1.ª falla y cada 7). */
export function registrarResultadoFuente(estado, fuente, { ok, error = null, ahora = new Date().toISOString() }) {
  if (!estado.fuentes[fuente]) estado.fuentes[fuente] = fuenteVacia();
  const f = estado.fuentes[fuente];
  if (ok) {
    f.ultimoOk = ahora;
    f.fallasSeguidas = 0;
    f.ultimoError = null;
    return { avisar: false };
  }
  f.fallasSeguidas = (f.fallasSeguidas || 0) + 1;
  f.ultimoError = String(error && error.message ? error.message : error || "error desconocido").slice(0, 500);
  return { avisar: f.fallasSeguidas === 1 || f.fallasSeguidas % 7 === 0 };
}

/** "2026-11-05T12-00-07Z": ordenable y válido como id de documento. */
export function idDeCorrida(fecha = new Date()) {
  return fecha.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}

export async function leerEstado(cliente) {
  return completarEstado(await cliente.leer(RUTA_ESTADO));
}

export async function guardarEstado(cliente, estado) {
  return cliente.reemplazar(RUTA_ESTADO, estado);
}

export async function registrarCorrida(cliente, corrida) {
  return cliente.reemplazar(`${COLECCION_CORRIDAS}/${corrida.id}`, corrida);
}

/** Deja sólo las últimas `conservar` corridas. Devuelve cuántas borró. */
export async function podarCorridas(cliente, { conservar = CORRIDAS_A_CONSERVAR } = {}) {
  const ids = (await cliente.listar(COLECCION_CORRIDAS, { campos: ["__name__"] })).map((d) => d.id).sort();
  const sobran = ids.slice(0, Math.max(0, ids.length - conservar));
  for (const id of sobran) await cliente.borrar(`${COLECCION_CORRIDAS}/${id}`);
  return sobran.length;
}
