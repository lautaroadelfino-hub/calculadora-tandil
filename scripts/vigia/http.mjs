// scripts/vigia/http.mjs
// Cómo el vigía pide páginas y archivos a las fuentes (Boletín Oficial,
// sindicatos, ARCA): con User-Agent de navegador (varios sitios oficiales
// rechazan el de Node), un tiempo límite, dos reintentos ante caídas o 5xx, y
// como máximo un pedido por segundo para no castigar a nadie.
//
// No sabe nada de las fuentes: devuelve texto o bytes y el estado HTTP. Quien
// llama decide qué hacer con un 404.

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const ESPERA_ENTRE_PEDIDOS_MS = 1000;
const ESPERAS_REINTENTO_MS = [2000, 5000];

let ultimoPedido = 0;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Respeta el ritmo de un pedido por segundo entre llamadas sucesivas. */
export async function esperarTurno(minimoMs = ESPERA_ENTRE_PEDIDOS_MS) {
  const falta = ultimoPedido + minimoMs - Date.now();
  if (falta > 0) await dormir(falta);
  ultimoPedido = Date.now();
}

/**
 * Un pedido HTTP con reintentos. Devuelve { status, ok, tipo, buffer } y
 * `texto()` para leer el cuerpo como UTF-8. Lanza sólo si la red falla las
 * tres veces; un 4xx o 5xx final vuelve con `ok: false` y es decisión de quien
 * llama.
 */
export async function pedir(url, { metodo = "GET", cabeceras = {}, cuerpo, timeoutMs = 30000, reintentos = 2, fetchFn = fetch, ritmo = true } = {}) {
  let ultimoError = null;
  for (let intento = 0; intento <= reintentos; intento++) {
    if (intento > 0) await dormir(ESPERAS_REINTENTO_MS[Math.min(intento - 1, ESPERAS_REINTENTO_MS.length - 1)]);
    if (ritmo) await esperarTurno();
    try {
      const r = await fetchFn(url, {
        method: metodo,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*", ...cabeceras },
        body: cuerpo,
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const transitorio = r.status === 429 || r.status >= 500;
      if (transitorio && intento < reintentos) {
        ultimoError = new Error(`HTTP ${r.status}`);
        continue;
      }
      const buffer = Buffer.from(await r.arrayBuffer());
      return {
        status: r.status,
        ok: r.ok,
        tipo: r.headers.get("content-type") || "",
        url: r.url || url,
        buffer,
        texto: () => buffer.toString("utf8"),
      };
    } catch (error) {
      ultimoError = error;
    }
  }
  throw new Error(`No se pudo pedir ${url}: ${ultimoError && ultimoError.message ? ultimoError.message : ultimoError}`);
}

/** El cuerpo como texto; lanza si no es 2xx. */
export async function bajarTexto(url, opciones) {
  const r = await pedir(url, opciones);
  if (!r.ok) throw new Error(`${url} respondió HTTP ${r.status}`);
  return r.texto();
}

/** El cuerpo como bytes, con su tipo; lanza si no es 2xx. */
export async function bajarBinario(url, opciones) {
  const r = await pedir(url, opciones);
  if (!r.ok) throw new Error(`${url} respondió HTTP ${r.status}`);
  return { buffer: r.buffer, tipo: r.tipo, bytes: r.buffer.length };
}
