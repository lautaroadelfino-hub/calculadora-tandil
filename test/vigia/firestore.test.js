// test/vigia/firestore.test.js
// El cliente REST con sesión: cada operación manda el token, crea sin pisar,
// actualiza sólo lo que se nombra y traduce los errores sin filtrar nada.
import { describe, it, expect, vi, afterEach } from "vitest";
import { iniciarSesion, clienteFirestore } from "../../scripts/vigia/firestore.mjs";

const respuesta = (status, cuerpo) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });
const NOMBRE = (ruta) => `projects/liquidar-f01ab/databases/(default)/documents/${ruta}`;

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GITHUB_ACTIONS;
});

describe("iniciar sesión", () => {
  it("pide el token a Identity Toolkit y lo enmascara sólo en Actions", async () => {
    const fetchFn = vi.fn(async () => respuesta(200, { idToken: "eyJ.token", refreshToken: "refresco", localId: "uid-vigia", email: "vigia@liquidar.ar", expiresIn: "3600" }));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const sesion = await iniciarSesion({ apiKey: "AIza", email: "vigia@liquidar.ar", password: "secreta", fetchFn });
    expect(sesion).toEqual({ idToken: "eyJ.token", uid: "uid-vigia", email: "vigia@liquidar.ar", expiraEnSegundos: 3600 });
    expect(fetchFn.mock.calls[0][0]).toBe("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIza");
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ email: "vigia@liquidar.ar", password: "secreta", returnSecureToken: true });
    expect(log).not.toHaveBeenCalled();

    process.env.GITHUB_ACTIONS = "true";
    await iniciarSesion({ apiKey: "AIza", email: "vigia@liquidar.ar", password: "secreta", fetchFn });
    expect(log.mock.calls.map((c) => c[0])).toEqual(["::add-mask::eyJ.token", "::add-mask::refresco"]);
  });

  it("si la contraseña está mal, el error dice el motivo de Firebase", async () => {
    const fetchFn = vi.fn(async () => respuesta(400, { error: { message: "INVALID_LOGIN_CREDENTIALS" } }));
    await expect(iniciarSesion({ apiKey: "k", email: "v@x", password: "no", fetchFn })).rejects.toThrow(/INVALID_LOGIN_CREDENTIALS/);
  });
});

describe("el cliente", () => {
  const armar = (handler) => {
    const fetchFn = vi.fn(handler);
    return { fetchFn, cliente: clienteFirestore({ proyecto: "liquidar-f01ab", idToken: "TOKEN", fetchFn }) };
  };

  it("manda Bearer en todo y arma las URL con la ruta codificada", async () => {
    const { fetchFn, cliente } = armar(async () => respuesta(200, { name: NOMBRE("vigia/estado"), fields: { a: { integerValue: "1" } }, updateTime: "2026-11-05T12:00:00.000000Z" }));
    expect(await cliente.leer("vigia/estado")).toEqual({ a: 1 });
    expect(await cliente.leerCrudo("vigia/estado")).toEqual({ campos: { a: 1 }, updateTime: "2026-11-05T12:00:00.000000Z", createTime: null });
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toBe("https://firestore.googleapis.com/v1/projects/liquidar-f01ab/databases/(default)/documents/vigia/estado");
    expect(opciones.headers.Authorization).toBe("Bearer TOKEN");
    expect(cliente.urlDe("convenios/comercio-cct-130-75/escalas/2026-09")).toMatch(/\/convenios\/comercio-cct-130-75\/escalas\/2026-09$/);
    expect(() => cliente.urlDe("../otra")).toThrow(/inválida/);
    await expect(cliente.leer("vigia")).rejects.toThrow(/colección/);
  });

  it("un 404 al leer es null, un 403 es un error con estado", async () => {
    const { cliente } = armar(async () => respuesta(404, { error: { message: "Document not found" } }));
    expect(await cliente.leer("vigia/no")).toBeNull();
    const { cliente: cerrado } = armar(async () => respuesta(403, { error: { message: "Missing or insufficient permissions." } }));
    await expect(cerrado.leer("convenios/x")).rejects.toMatchObject({ status: 403, message: expect.stringMatching(/403 al leer convenios\/x: Missing/) });
  });

  it("crear usa currentDocument.exists=false y un 409 vuelve como 'existía'", async () => {
    const { fetchFn, cliente } = armar(async (url) => (url.includes("existe") ? respuesta(409, { error: { message: "Document already exists" } }) : respuesta(200, { updateTime: "t1" })));
    expect(await cliente.crear("borradores/nuevo", { estado: "pendiente", n: 2 })).toEqual({ creado: true, updateTime: "t1" });
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toMatch(/\/borradores\/nuevo\?currentDocument\.exists=false$/);
    expect(opciones.method).toBe("PATCH");
    expect(JSON.parse(opciones.body)).toEqual({ fields: { estado: { stringValue: "pendiente" }, n: { integerValue: "2" } } });
    expect(await cliente.crear("borradores/existe", { a: 1 })).toEqual({ creado: false, existia: true });
  });

  it("actualizar nombra cada campo en updateMask y exige que el documento exista o no haya cambiado", async () => {
    const { fetchFn, cliente } = armar(async () => respuesta(200, { updateTime: "t2" }));
    expect(await cliente.actualizar("borradores/x", { estado: "descartado", "raro.campo": 1 }, { updateTime: "t1" })).toEqual({ actualizado: true, updateTime: "t2" });
    const url = decodeURIComponent(fetchFn.mock.calls[0][0]);
    expect(url).toContain("updateMask.fieldPaths=estado");
    expect(url).toContain("updateMask.fieldPaths=`raro.campo`");
    expect(url).toContain("currentDocument.updateTime=t1");
    await cliente.actualizar("borradores/x", { estado: "descartado" });
    expect(decodeURIComponent(fetchFn.mock.calls[1][0])).toContain("currentDocument.exists=true");
    const { cliente: cambiado } = armar(async () => respuesta(409, { error: { message: "the stored version does not match" } }));
    expect(await cambiado.actualizar("borradores/x", { a: 1 }, { updateTime: "viejo" })).toEqual({ actualizado: false, cambio: true });
  });

  it("reemplazar manda el documento entero sin máscara; borrar tolera un 404", async () => {
    const { fetchFn, cliente } = armar(async (url, o) => (o.method === "DELETE" ? respuesta(404, {}) : respuesta(200, { updateTime: "t3" })));
    await cliente.reemplazar("vigia/estado", { fuentes: { arca: { vistos: [] } } });
    expect(fetchFn.mock.calls[0][0]).not.toContain("updateMask");
    expect(await cliente.borrar("vigia/prueba")).toEqual({ borrado: false });
  });

  it("listar recorre las páginas y devuelve {id, …campos}", async () => {
    let llamada = 0;
    const { cliente } = armar(async () => {
      llamada += 1;
      return llamada === 1
        ? respuesta(200, { documents: [{ name: NOMBRE("vigia_corridas/a"), fields: { ok: { booleanValue: true } }, updateTime: "u1" }], nextPageToken: "p2" })
        : respuesta(200, { documents: [{ name: NOMBRE("vigia_corridas/b"), fields: {} }] });
    });
    expect(await cliente.listar("vigia_corridas")).toEqual([{ id: "a", ok: true, _updateTime: "u1" }, { id: "b", _updateTime: null }]);
    await expect(cliente.listar("vigia/estado")).rejects.toThrow(/documento/);
  });
});
