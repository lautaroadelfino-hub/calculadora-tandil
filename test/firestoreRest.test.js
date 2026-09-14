// test/firestoreRest.test.js
// La lectura por REST tiene que devolver exactamente lo que devolvía el SDK
// (doc.data()): mismos tipos, misma forma. Si acá algo cambia, el motor
// recibe otra cosa que la que se probó.
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  valorDesdeRest,
  camposDesdeRest,
  documentoDesdeRest,
  leerDocumento,
  listarColeccion,
  listarIds,
} from "../lib/firestoreRest.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("la conversión del formato REST de Firestore", () => {
  it("convierte cada tipo escalar al de JS", () => {
    expect(valorDesdeRest({ stringValue: "Camioneros" })).toBe("Camioneros");
    expect(valorDesdeRest({ integerValue: "44" })).toBe(44);
    expect(valorDesdeRest({ doubleValue: 0.1077 })).toBe(0.1077);
    expect(valorDesdeRest({ doubleValue: "NaN" })).toBeNaN();
    expect(valorDesdeRest({ booleanValue: false })).toBe(false);
    expect(valorDesdeRest({ nullValue: null })).toBeNull();
    expect(valorDesdeRest({ timestampValue: "2026-09-13T05:17:26.833242Z" })).toBe("2026-09-13T05:17:26.833242Z");
    expect(valorDesdeRest(undefined)).toBeNull();
    expect(valorDesdeRest({ loQueSea: 1 })).toBeNull();
  });

  it("baja mapas y listas anidados, como los inputs_requeridos de un convenio", () => {
    const rest = {
      inputs_requeridos: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  id: { stringValue: "carga_horaria" },
                  tipo: { stringValue: "numero" },
                  default: { integerValue: "48" },
                  opciones: { arrayValue: { values: [{ stringValue: "A" }, { stringValue: "B" }] } },
                },
              },
            },
          ],
        },
      },
      reglas_calculo: { mapValue: { fields: { art: { mapValue: { fields: { alicuota_tipica: { doubleValue: 0.05 } } } } } } },
      vacio: { mapValue: {} },
      lista_vacia: { arrayValue: {} },
    };
    expect(camposDesdeRest(rest)).toEqual({
      inputs_requeridos: [{ id: "carga_horaria", tipo: "numero", default: 48, opciones: ["A", "B"] }],
      reglas_calculo: { art: { alicuota_tipica: 0.05 } },
      vacio: {},
      lista_vacia: [],
    });
    expect(camposDesdeRest(undefined)).toEqual({});
  });

  it("saca el id del nombre del documento y lo pone adelante, como arma la app sus listas", () => {
    const doc = {
      name: "projects/p/databases/(default)/documents/convenios/camioneros-cct-40-89/escalas/2026-08",
      fields: { mes_vigencia: { stringValue: "Agosto 2026" } },
    };
    expect(documentoDesdeRest(doc)).toEqual({ id: "2026-08", mes_vigencia: "Agosto 2026" });
    expect(documentoDesdeRest({ name: "projects/p/databases/(default)/documents/x/sin-campos" })).toEqual({ id: "sin-campos" });
    expect(documentoDesdeRest(null)).toBeNull();
  });
});

function respuesta(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("las lecturas por REST", () => {
  it("leerDocumento devuelve los campos, o null si el documento no existe", async () => {
    const fetchFalso = vi.fn(async (url) => {
      if (url.endsWith("/convenios/existe")) return respuesta(200, { name: "…/convenios/existe", fields: { nombre: { stringValue: "X" } } });
      return respuesta(404, { error: { code: 404 } });
    });
    vi.stubGlobal("fetch", fetchFalso);
    expect(await leerDocumento("convenios/existe")).toEqual({ nombre: "X" });
    expect(await leerDocumento("convenios/no-existe")).toBeNull();
    // La ruta se codifica por segmento, se pide con revalidación en el edge y con un tope de tiempo.
    expect(fetchFalso.mock.calls[0][0]).toMatch(/\/documents\/convenios\/existe$/);
    const opciones = fetchFalso.mock.calls[0][1];
    expect(opciones.next).toEqual({ revalidate: 60 });
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it("leerDocumento avisa cuando Firestore responde otra cosa que 200 o 404, sin mostrar la URL interna", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(503, {})));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    let mensaje = "";
    await leerDocumento("convenios/x").catch((e) => { mensaje = e.message; });
    expect(mensaje).toMatch(/HTTP 503/);
    expect(mensaje).not.toMatch(/googleapis/);
    // La URL completa sí queda en el log, para quien depura.
    expect(silencio).toHaveBeenCalledWith(expect.stringMatching(/googleapis.*convenios\/x/));
    silencio.mockRestore();
  });

  it("rechaza rutas con '.' o '..' (un id así sólo puede venir de una URL armada a mano)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(leerDocumento("convenios/../parametros_ganancias")).rejects.toThrow(/inválida/);
    await expect(leerDocumento("")).rejects.toThrow(/inválida/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("listarColeccion recorre las páginas, pide sólo los campos indicados y arma {id, …campos}", async () => {
    const llamadas = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        llamadas.push(url);
        const u = new URL(url);
        if (!u.searchParams.get("pageToken")) {
          return respuesta(200, {
            documents: [{ name: "…/escalas/2026-07", fields: { mes_vigencia: { stringValue: "Julio 2026" } } }],
            nextPageToken: "pag2",
          });
        }
        return respuesta(200, { documents: [{ name: "…/escalas/2026-08", fields: { mes_vigencia: { stringValue: "Agosto 2026" } } }] });
      })
    );
    const docs = await listarColeccion("convenios/camioneros-cct-40-89/escalas", { campos: ["mes_vigencia"] });
    expect(docs).toEqual([
      { id: "2026-07", mes_vigencia: "Julio 2026" },
      { id: "2026-08", mes_vigencia: "Agosto 2026" },
    ]);
    expect(llamadas).toHaveLength(2);
    expect(new URL(llamadas[0]).searchParams.getAll("mask.fieldPaths")).toEqual(["mes_vigencia"]);
    expect(new URL(llamadas[1]).searchParams.get("pageToken")).toBe("pag2");
  });

  it("listarIds devuelve sólo los ids (la máscara __name__ trae documentos sin campos) y [] si la colección está vacía", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        url.includes("/parametros_ganancias?")
          ? respuesta(200, { documents: [{ name: "…/parametros_ganancias/2026-01" }, { name: "…/parametros_ganancias/2026-07" }] })
          : respuesta(200, {})
      )
    );
    expect(await listarIds("parametros_ganancias")).toEqual(["2026-01", "2026-07"]);
    expect(await listarIds("coleccion_vacia")).toEqual([]);
  });
});
