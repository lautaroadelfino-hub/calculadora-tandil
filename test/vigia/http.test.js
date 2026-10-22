// test/vigia/http.test.js
// Los pedidos del vigía con la red simulada: el User-Agent de navegador, las
// cookies que vuelven, el estado HTTP a mano, y qué pasa con un 429 (espera
// lo que pide Retry-After o 15 y 45 segundos, afloja el ritmo, y si sigue
// devuelve ok: false con el 429 para que quien llama decida).
import { describe, it, expect, vi } from "vitest";
import { pedir, calcularEspera, aflojarRitmo, ritmoActual, errorHttp, bajarTexto, USER_AGENT } from "../../scripts/vigia/http.mjs";

const respuesta = ({ status = 200, cuerpo = "hola", cabeceras = {}, cookies = [] } = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  url: "https://ejemplo.test/x",
  headers: {
    get: (n) => cabeceras[n.toLowerCase()] || null,
    getSetCookie: () => cookies,
  },
  arrayBuffer: async () => new TextEncoder().encode(cuerpo).buffer,
});
const sinRitmo = { ritmo: false, dormirFn: vi.fn(async () => {}) };

describe("pedir", () => {
  it("manda User-Agent de navegador y devuelve estado, cuerpo y cookies", async () => {
    const fetchFn = vi.fn(async () => respuesta({ cuerpo: "<html>", cabeceras: { "content-type": "text/html" }, cookies: ["PHPSESSID=abc; Path=/; HttpOnly", "otra=1"] }));
    const r = await pedir("https://ejemplo.test/x", { fetchFn, ...sinRitmo });
    expect(fetchFn.mock.calls[0][1].headers["User-Agent"]).toBe(USER_AGENT);
    expect(r).toMatchObject({ status: 200, ok: true, tipo: "text/html", cookies: ["PHPSESSID=abc", "otra=1"] });
    expect(r.texto()).toBe("<html>");
  });

  it("ante un 429 espera lo que pide Retry-After, afloja el ritmo y reintenta", async () => {
    const antes = ritmoActual();
    const dormirFn = vi.fn(async () => {});
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(respuesta({ status: 429, cabeceras: { "retry-after": "3" } }))
      .mockResolvedValueOnce(respuesta({ status: 429 }))
      .mockResolvedValueOnce(respuesta({ cuerpo: "al fin" }));
    const r = await pedir("https://ejemplo.test/x", { fetchFn, ritmo: false, dormirFn });
    expect(r.ok).toBe(true);
    expect(r.texto()).toBe("al fin");
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(dormirFn.mock.calls.map((c) => c[0])).toEqual([3000, 45000]);
    expect(ritmoActual()).toBeGreaterThan(antes);
  });

  it("si el 429 sigue después de los reintentos, vuelve con ok: false y el 429, sin lanzar", async () => {
    const fetchFn = vi.fn(async () => respuesta({ status: 429 }));
    const r = await pedir("https://ejemplo.test/x", { fetchFn, ...sinRitmo });
    expect(r).toMatchObject({ ok: false, status: 429 });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    await expect(bajarTexto("https://ejemplo.test/x", { fetchFn, ...sinRitmo })).rejects.toMatchObject({ status: 429 });
  });

  it("una red caída tres veces lanza con la causa; un 404 no se reintenta", async () => {
    const caida = vi.fn(async () => { throw new Error("ECONNRESET"); });
    await expect(pedir("https://ejemplo.test/x", { fetchFn: caida, ...sinRitmo })).rejects.toThrow(/No se pudo pedir .*ECONNRESET/);
    expect(caida).toHaveBeenCalledTimes(3);
    const noExiste = vi.fn(async () => respuesta({ status: 404, cuerpo: "" }));
    const r = await pedir("https://ejemplo.test/x", { fetchFn: noExiste, ...sinRitmo });
    expect(r).toMatchObject({ ok: false, status: 404 });
    expect(noExiste).toHaveBeenCalledTimes(1);
  });
});

describe("las esperas", () => {
  it("Retry-After manda, con tope de dos minutos; sin él, 15 y 45 segundos para un 429, 2 y 5 para lo demás", () => {
    expect(calcularEspera({ status: 429, intento: 0, retryAfter: "10" })).toBe(10000);
    expect(calcularEspera({ status: 429, intento: 0, retryAfter: "900" })).toBe(120000);
    expect(calcularEspera({ status: 429, intento: 0, retryAfter: "cuando puedas" })).toBe(15000);
    expect(calcularEspera({ status: 429, intento: 1 })).toBe(45000);
    expect(calcularEspera({ status: 429, intento: 7 })).toBe(45000);
    expect(calcularEspera({ status: 503, intento: 0 })).toBe(2000);
    expect(calcularEspera({ status: 0, intento: 1 })).toBe(5000);
  });

  it("el ritmo se duplica hasta 8 segundos y no vuelve a bajar", () => {
    let r = ritmoActual();
    for (let i = 0; i < 6; i++) r = aflojarRitmo();
    expect(r).toBe(8000);
    expect(ritmoActual()).toBe(8000);
    expect(errorHttp("x", 429)).toMatchObject({ message: "x", status: 429 });
  });
});
