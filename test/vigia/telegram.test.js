// test/vigia/telegram.test.js
// Los avisos: recortados a lo que Telegram acepta, y un envío fallido es un
// error que se ve (nunca un vigía mudo).
import { describe, it, expect, vi } from "vitest";
import { recortar, enviar, TOPE_CARACTERES } from "../../scripts/vigia/telegram.mjs";

const respuesta = (status, cuerpo) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });

describe("recortar", () => {
  it("deja pasar lo corto y marca lo cortado", () => {
    expect(recortar("hola")).toBe("hola");
    const largo = "x".repeat(TOPE_CARACTERES + 50);
    expect(recortar(largo)).toHaveLength(TOPE_CARACTERES);
    expect(recortar(largo).endsWith(" …")).toBe(true);
    expect(recortar(null)).toBe("");
  });
});

describe("enviar", () => {
  it("manda texto plano al chat, sin previsualización, y devuelve el id del mensaje", async () => {
    const fetchFn = vi.fn(async () => respuesta(200, { ok: true, result: { message_id: 42 } }));
    const id = await enviar({ token: "123:ABC", chatId: "987", texto: "Vigía vivo", fetchFn });
    expect(id).toBe(42);
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bot123:ABC/sendMessage");
    expect(JSON.parse(opciones.body)).toEqual({ chat_id: "987", text: "Vigía vivo", disable_web_page_preview: true });
  });

  it("si Telegram no acepta, lanza con el motivo y sin el token", async () => {
    const fetchFn = vi.fn(async () => respuesta(401, { ok: false, description: "Unauthorized" }));
    await expect(enviar({ token: "123:ABC-secreto", chatId: "987", texto: "x", fetchFn })).rejects.toThrow(/Unauthorized/);
    await expect(enviar({ token: "123:ABC-secreto", chatId: "987", texto: "x", fetchFn })).rejects.not.toThrow(/secreto/);
    await expect(enviar({ token: "", chatId: "987", texto: "x", fetchFn })).rejects.toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it("un 200 con ok:false también es un error", async () => {
    const fetchFn = vi.fn(async () => respuesta(200, { ok: false, description: "chat not found" }));
    await expect(enviar({ token: "t", chatId: "c", texto: "x", fetchFn })).rejects.toThrow(/chat not found/);
  });
});
