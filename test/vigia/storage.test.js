// test/vigia/storage.test.js
// Subir y borrar por REST con la cabecera que Storage espera, y armar la URL de
// descarga con el token, como lib/archivos.js desde el navegador.
import { describe, it, expect, vi } from "vitest";
import { clienteStorage } from "../../scripts/vigia/storage.mjs";

const respuesta = (status, cuerpo) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });

describe("el cliente de Storage", () => {
  it("sube con Authorization: Firebase y devuelve lo que se guarda en el documento", async () => {
    const fetchFn = vi.fn(async () => respuesta(200, { name: "borradores/camioneros/2026-10/escala_1.jpg", downloadTokens: "tok-1,tok-2", contentType: "image/jpeg" }));
    const storage = clienteStorage({ bucket: "liquidar-f01ab.firebasestorage.app", idToken: "TOKEN", fetchFn });
    const subido = await storage.subir({ ruta: "borradores/camioneros/2026-10/escala_1.jpg", buffer: Buffer.from("jpg"), contentType: "image/jpeg" });
    expect(subido).toEqual({
      ruta: "borradores/camioneros/2026-10/escala_1.jpg",
      url: "https://firebasestorage.googleapis.com/v0/b/liquidar-f01ab.firebasestorage.app/o/borradores%2Fcamioneros%2F2026-10%2Fescala_1.jpg?alt=media&token=tok-1",
      nombre: "escala_1.jpg", tipo: "image/jpeg", bytes: 3,
    });
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toBe("https://firebasestorage.googleapis.com/v0/b/liquidar-f01ab.firebasestorage.app/o?uploadType=media&name=borradores%2Fcamioneros%2F2026-10%2Fescala_1.jpg");
    expect(opciones.method).toBe("POST");
    expect(opciones.headers).toMatchObject({ Authorization: "Firebase TOKEN", "Content-Type": "image/jpeg" });
  });

  it("si la subida no trae el token, pide los metadatos", async () => {
    const fetchFn = vi.fn(async (url, o) => (o && o.method === "POST" ? respuesta(200, { name: "x" }) : respuesta(200, { downloadTokens: "despues" })));
    const storage = clienteStorage({ bucket: "b", idToken: "T", fetchFn });
    const subido = await storage.subir({ ruta: "borradores/x/y.pdf", buffer: Buffer.from("p"), contentType: "application/pdf" });
    expect(subido.url).toContain("token=despues");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("un 403 al subir es un error con estado; borrar tolera un 404", async () => {
    const fetchFn = vi.fn(async (url, o) => (o.method === "POST" ? respuesta(403, { error: { message: "Permission denied." } }) : respuesta(404, {})));
    const storage = clienteStorage({ bucket: "b", idToken: "T", fetchFn });
    await expect(storage.subir({ ruta: "acuerdos/x/y.txt", buffer: Buffer.from("t"), contentType: "text/plain" })).rejects.toMatchObject({ status: 403 });
    expect(await storage.borrar("borradores/x/y.pdf")).toEqual({ borrado: false });
    expect(() => clienteStorage({ bucket: "", idToken: "T" })).toThrow(/bucket/);
  });
});
