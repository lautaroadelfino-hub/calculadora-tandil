// scripts/vigia/http.mjs
// Cómo el vigía pide páginas y archivos a las fuentes (Boletín Oficial,
// sindicatos, ARCA): con User-Agent de navegador (varios sitios oficiales
// rechazan el de Node), un tiempo límite, dos reintentos ante caídas o 5xx, y
// como máximo un pedido por segundo para no castigar a nadie.
//
// El Boletín Oficial limita los pedidos seguidos: en la prueba viva del
// 21/10/2026 empezó a responder HTTP 429 después de unos 150 pedidos a uno por
// segundo. Ante un 429 se espera lo que pide la cabecera Retry-After (o 15 y
// 45 segundos) y el ritmo se afloja para el resto de la corrida (2, 4, 8
// segundos entre pedidos). Si aun así sigue, quien llama recibe `ok: false,
// status: 429` y decide (el Boletín corta la corrida y sigue mañana).
//
// No sabe nada de las fuentes: devuelve texto o bytes y el estado HTTP. Quien
// llama decide qué hacer con un 404.

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const ESPERA_ENTRE_PEDIDOS_MS = 1000;
const TOPE_ENTRE_PEDIDOS_MS = 8000;
const ESPERAS_REINTENTO_MS = [2000, 5000];
const ESPERAS_429_MS = [15000, 45000];
const TOPE_RETRY_AFTER_MS = 120000;

let ultimoPedido = 0;
let esperaEntrePedidos = ESPERA_ENTRE_PEDIDOS_MS;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cuánto se espera hoy entre pedidos (se alarga con cada 429 y no vuelve a bajar en la corrida). */
export function ritmoActual() {
  return esperaEntrePedidos;
}

/** Después de un 429: el doble de espera entre pedidos, hasta 8 segundos. */
export function aflojarRitmo() {
  esperaEntrePedidos = Math.min(esperaEntrePedidos * 2, TOPE_ENTRE_PEDIDOS_MS);
  return esperaEntrePedidos;
}

/**
 * Cuánto esperar antes de reintentar: lo que pide Retry-After (en segundos,
 * hasta 2 minutos) si hubo 429; si no, 15 y 45 segundos para un 429, 2 y 5
 * para una caída o un 5xx.
 */
export function calcularEspera({ status, intento, retryAfter = null }) {
  if (status === 429) {
    const segundos = Number(retryAfter);
    if (Number.isFinite(segundos) && segundos > 0) return Math.min(segundos * 1000, TOPE_RETRY_AFTER_MS);
    return ESPERAS_429_MS[Math.min(intento, ESPERAS_429_MS.length - 1)];
  }
  return ESPERAS_REINTENTO_MS[Math.min(intento, ESPERAS_REINTENTO_MS.length - 1)];
}

/** Respeta el ritmo entre llamadas sucesivas. */
export async function esperarTurno(minimoMs = esperaEntrePedidos, dormirFn = dormir) {
  const falta = ultimoPedido + minimoMs - Date.now();
  if (falta > 0) await dormirFn(falta);
  ultimoPedido = Date.now();
}

/**
 * Un pedido HTTP con reintentos. Devuelve { status, ok, tipo, cookies, buffer }
 * y `texto()` para leer el cuerpo como UTF-8. Lanza sólo si la red falla las
 * tres veces; un 4xx o 5xx final vuelve con `ok: false` y es decisión de quien
 * llama.
 */
export async function pedir(url, {
  metodo = "GET", cabeceras = {}, cuerpo, timeoutMs = 30000, reintentos = 2, fetchFn = fetch, ritmo = true, dormirFn = dormir,
} = {}) {
  let ultimoError = null;
  let esperaAntesDelProximo = 0;
  for (let intento = 0; intento <= reintentos; intento++) {
    if (intento > 0) await dormirFn(esperaAntesDelProximo);
    if (ritmo) await esperarTurno(esperaEntrePedidos, dormirFn);
    try {
      const r = await fetchFn(url, {
        method: metodo,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*", ...cabeceras },
        body: cuerpo,
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (r.status === 429) aflojarRitmo();
      const transitorio = r.status === 429 || r.status >= 500;
      if (transitorio && intento < reintentos) {
        esperaAntesDelProximo = calcularEspera({ status: r.status, intento, retryAfter: r.headers.get("retry-after") });
        ultimoError = new Error(`HTTP ${r.status}`);
        continue;
      }
      const buffer = Buffer.from(await r.arrayBuffer());
      return {
        status: r.status,
        ok: r.ok,
        tipo: r.headers.get("content-type") || "",
        url: r.url || url,
        // Las cookies de sesión que manda el sitio (el Boletín Oficial las
        // necesita para seguir listando un día pasado), como "nombre=valor".
        cookies: (typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : []).map((c) => c.split(";")[0]),
        buffer,
        texto: () => buffer.toString("utf8"),
      };
    } catch (error) {
      ultimoError = error;
      esperaAntesDelProximo = calcularEspera({ status: 0, intento });
    }
  }
  throw new Error(`No se pudo pedir ${url}: ${ultimoError && ultimoError.message ? ultimoError.message : ultimoError}`);
}

/** Un error con el estado HTTP a mano, para que quien llama distinga un 429 de un 404. */
export function errorHttp(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

/** El cuerpo como texto; lanza si no es 2xx. */
export async function bajarTexto(url, opciones) {
  const r = await pedir(url, opciones);
  if (!r.ok) throw errorHttp(`${url} respondió HTTP ${r.status}`, r.status);
  return r.texto();
}

/** El cuerpo como bytes, con su tipo; lanza si no es 2xx. */
export async function bajarBinario(url, opciones) {
  const r = await pedir(url, opciones);
  if (!r.ok) throw errorHttp(`${url} respondió HTTP ${r.status}`, r.status);
  return { buffer: r.buffer, tipo: r.tipo, bytes: r.buffer.length };
}
