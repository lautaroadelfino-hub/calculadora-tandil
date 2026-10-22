// scripts/vigia/telegram.mjs
// Los avisos del vigía van por un bot de Telegram al chat del dueño.
//
// Texto plano, sin formato (así ningún carácter raro de un título de acuerdo
// rompe el mensaje), hasta 4.000 caracteres: Telegram corta en 4.096. Si el
// envío falla, se lanza: la corrida termina en rojo y GitHub avisa por mail.
// Un vigía que no puede avisar tiene que hacerse notar, no callarse.

export const TOPE_CARACTERES = 4000;

/** Recorta un texto largo dejando una marca de que se cortó. */
export function recortar(texto, tope = TOPE_CARACTERES) {
  const t = String(texto || "");
  if (t.length <= tope) return t;
  return `${t.slice(0, tope - 2)} …`;
}

/** Manda un mensaje. Devuelve el id del mensaje. Nunca incluye el token en un error. */
export async function enviar({ token, chatId, texto, fetchFn = fetch, timeoutMs = 20000 }) {
  if (!token || !chatId) throw new Error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID.");
  const r = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: recortar(texto), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json || json.ok !== true) {
    const motivo = (json && json.description) || `HTTP ${r.status}`;
    throw new Error(`Telegram no aceptó el mensaje: ${motivo}`);
  }
  return json.result && json.result.message_id;
}
