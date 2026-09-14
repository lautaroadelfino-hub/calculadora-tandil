// test/datosCalculadora.test.js
// Lo que el servidor le entrega a la calculadora tiene que ser lo mismo que
// antes armaba el navegador en cinco lecturas: el último período salvo que la
// URL pida otro, la tabla exacta o la anterior, y un formulario que arranca
// con los defaults del convenio, la ART típica y lo que traiga el link.
import { describe, it, expect, vi } from "vitest";
import { cargarDatosDeCalculadora, valoresDeArranque, busquedaDesdeSearchParams, esIdDeConvenio } from "../lib/datosCalculadora.js";
import { periodoDeTabla } from "../lib/periodos.js";
import { novedadesPublicadas } from "../lib/novedadesPublicadas.js";

const convenio = {
  nombre: "Convenio de prueba",
  cct: "1/26",
  inputs_requeridos: [
    { id: "categoria", tipo: "select", opciones: ["Nivel 1", "Nivel 2"], default: "Nivel 1" },
    { id: "carga_horaria", tipo: "numero", default: 48 },
    { id: "antiguedad_años", tipo: "numero", default: 0 },
  ],
  reglas_calculo: { art: { alicuota_tipica: 0.05 } },
};

const tablaContribuciones = {
  regimenes: { resto_mipyme: { nombre: "Resto", predeterminado: true }, servicios_grandes: { nombre: "Grandes" } },
};

/** Un Firestore de mentira: documentos por ruta y colecciones por ruta. */
function ioFalso() {
  const documentos = {
    "convenios/prueba": convenio,
    "convenios/prueba/escalas/2026-07": { mes_vigencia: "Julio 2026", categorias: { "Nivel 1": 100 } },
    "convenios/prueba/escalas/2026-08": { mes_vigencia: "Agosto 2026", categorias: { "Nivel 1": 110 } },
    "parametros_contribuciones/2026-06": { ...tablaContribuciones, mes: "2026-06" },
    "parametros_contribuciones/2026-08": { ...tablaContribuciones, mes: "2026-08" },
    "parametros_ganancias/2026-01": { tramos: [1] },
    "parametros_ganancias/2026-07": { tramos: [2] },
  };
  const pedidas = [];
  return {
    pedidas,
    leerDocumento: vi.fn(async (ruta) => {
      pedidas.push(ruta);
      return documentos[ruta] ?? null;
    }),
    listarColeccion: vi.fn(async (ruta) => {
      pedidas.push(`LISTA ${ruta}`);
      if (ruta === "convenios/prueba/escalas") {
        return [
          { id: "2026-07", mes_vigencia: "Julio 2026" },
          { id: "2026-08", mes_vigencia: "Agosto 2026" },
        ];
      }
      return [];
    }),
    listarIds: vi.fn(async (ruta) => {
      pedidas.push(`IDS ${ruta}`);
      if (ruta === "parametros_contribuciones") return ["2026-06", "2026-08"];
      if (ruta === "parametros_ganancias") return ["2026-01", "2026-07"];
      return [];
    }),
  };
}

describe("cargarDatosDeCalculadora", () => {
  it("sin URL arranca en el último período, con su escala y las tablas que le corresponden", async () => {
    const io = ioFalso();
    const d = await cargarDatosDeCalculadora("prueba", "", io);
    expect(d.convenio).toBe(convenio);
    expect(d.periodos).toEqual([
      { id: "2026-08", nombre: "Agosto 2026" },
      { id: "2026-07", nombre: "Julio 2026" },
    ]);
    expect(d.periodoInicial).toBe("2026-08");
    expect(d.autoCalcular).toBe(false);
    expect(Object.keys(d.escalas)).toEqual(["2026-08"]);
    // Contribuciones: agosto existe (exacta). Ganancias: no hay agosto, va la anterior (julio).
    expect(d.tablaContribuciones).toEqual({ periodo: "2026-08", datos: expect.objectContaining({ mes: "2026-08" }) });
    expect(d.contribuciones.periodos).toEqual(["2026-06", "2026-08"]);
    expect(Object.keys(d.ganancias.tablas)).toEqual(["2026-07"]);
    expect(d.ganancias.periodos).toEqual(["2026-01", "2026-07"]);
    // El formulario: defaults del convenio, ART típica en %, régimen predeterminado de la tabla.
    expect(d.valores).toEqual({
      categoria: "Nivel 1",
      carga_horaria: 48,
      antiguedad_años: 0,
      art_alicuota: 5,
      art_suma_fija: 0,
      regimen_contribuciones: "resto_mipyme",
    });
    // Nada se lee dos veces y nada de más: dos tandas de lecturas en paralelo.
    expect(io.pedidas).toEqual([
      "convenios/prueba",
      "LISTA convenios/prueba/escalas",
      "IDS parametros_contribuciones",
      "IDS parametros_ganancias",
      "convenios/prueba/escalas/2026-08",
      "parametros_contribuciones/2026-08",
      "parametros_ganancias/2026-07",
    ]);
  });

  it("con un link compartido usa ese período, sus valores y deja marcado que se calcule sola", async () => {
    const io = ioFalso();
    const d = await cargarDatosDeCalculadora(
      "prueba",
      "?periodo=2026-07&categoria=Nivel+2&carga_horaria=36&antiguedad_a%C3%B1os=5&regimen_contribuciones=servicios_grandes",
      io
    );
    expect(d.periodoInicial).toBe("2026-07");
    expect(d.autoCalcular).toBe(true);
    expect(Object.keys(d.escalas)).toEqual(["2026-07"]);
    // Julio no tiene tabla de contribuciones: se usa la de junio y se dice.
    expect(d.tablaContribuciones.periodo).toBe("2026-06");
    // Los números del link llegan como texto, igual que lo que la persona tipea: los convierte normalizarEntradas al calcular.
    expect(d.valores).toMatchObject({ categoria: "Nivel 2", carga_horaria: "36", antiguedad_años: "5", regimen_contribuciones: "servicios_grandes" });
  });

  it("si la URL pide un período que no está cargado, cae al último sin calcular sola", async () => {
    const d = await cargarDatosDeCalculadora("prueba", "?periodo=2031-01", ioFalso());
    expect(d.periodoInicial).toBe("2026-08");
    expect(d.autoCalcular).toBe(true); // la URL traía período: se recalcula igual con el último, como antes
  });

  it("si falla una tabla opcional (Ganancias, contribuciones), la calculadora igual arranca sin ella", async () => {
    const io = ioFalso();
    const listarIdsBien = io.listarIds;
    io.listarIds = vi.fn(async (ruta) => {
      if (ruta === "parametros_ganancias") throw new Error("HTTP 503");
      return listarIdsBien(ruta);
    });
    const leerBien = io.leerDocumento;
    io.leerDocumento = vi.fn(async (ruta) => {
      if (ruta.startsWith("parametros_contribuciones/")) throw new Error("HTTP 503");
      return leerBien(ruta);
    });
    const d = await cargarDatosDeCalculadora("prueba", "", io);
    expect(d.periodoInicial).toBe("2026-08");
    expect(Object.keys(d.escalas)).toEqual(["2026-08"]);
    expect(d.ganancias).toEqual({ periodos: [], tablas: {} });
    // La tabla se buscó y no llegó: queda como "no hay" y el navegador la vuelve a pedir.
    expect(d.tablaContribuciones).toEqual({ periodo: "2026-08", datos: null });
    expect(d.contribuciones.tablas).toEqual({});
    expect(d.valores.regimen_contribuciones).toBe("");
  });

  it("si falla el convenio o su escala, la carga falla entera (la página lo dice y ofrece recargar)", async () => {
    const io = ioFalso();
    io.leerDocumento = vi.fn(async (ruta) => {
      if (ruta === "convenios/prueba/escalas/2026-08") throw new Error("HTTP 503");
      return convenio;
    });
    await expect(cargarDatosDeCalculadora("prueba", "", io)).rejects.toThrow(/503/);
  });

  it("devuelve null si el convenio no existe (la página responde 404)", async () => {
    const io = ioFalso();
    expect(await cargarDatosDeCalculadora("no-existe", "", io)).toBeNull();
  });

  it("un convenio sin escalas ni tablas arranca vacío pero no rompe", async () => {
    const io = ioFalso();
    io.listarColeccion = vi.fn(async () => []);
    io.listarIds = vi.fn(async () => []);
    const d = await cargarDatosDeCalculadora("prueba", "", io);
    expect(d.periodos).toEqual([]);
    expect(d.periodoInicial).toBe("");
    expect(d.escalas).toEqual({});
    expect(d.tablaContribuciones).toEqual({ periodo: null, datos: null });
    expect(d.valores.regimen_contribuciones).toBe("");
  });
});

describe("valoresDeArranque", () => {
  it("sin ART típica la deja vacía, y un régimen de la URL que no existe en la tabla vuelve al predeterminado", () => {
    const sinArt = { ...convenio, reglas_calculo: {} };
    const v = valoresDeArranque(sinArt, { valores: { regimen_contribuciones: "inventado" } }, tablaContribuciones);
    expect(v.art_alicuota).toBe("");
    expect(v.regimen_contribuciones).toBe("resto_mipyme");
  });
});

describe("periodoDeTabla", () => {
  it("es la exacta si está, la anterior si no, y null si no hay ninguna anterior", () => {
    expect(periodoDeTabla(["2026-01", "2026-07"], "2026-07")).toEqual({ periodo: "2026-07", exacto: true });
    expect(periodoDeTabla(["2026-01", "2026-07"], "2026-09")).toEqual({ periodo: "2026-07", exacto: false });
    expect(periodoDeTabla(["2026-07"], "2026-03")).toEqual({ periodo: null, exacto: false });
    expect(periodoDeTabla([], "2026-03")).toEqual({ periodo: null, exacto: false });
  });
});

describe("busquedaDesdeSearchParams", () => {
  it("rearma la query string que leería el navegador", () => {
    expect(busquedaDesdeSearchParams({ periodo: "2026-08", categoria: "Vendedor B" })).toBe("?periodo=2026-08&categoria=Vendedor+B");
    expect(busquedaDesdeSearchParams({ x: ["1", "2"] })).toBe("?x=1&x=2");
    expect(busquedaDesdeSearchParams({})).toBe("");
    expect(busquedaDesdeSearchParams(undefined)).toBe("");
  });
});

describe("novedadesPublicadas", () => {
  it("deja sólo las publicadas, de la más nueva a la más vieja, hasta el límite", () => {
    const items = [
      { id: "a", date: "2026-08-01", published: true },
      { id: "b", date: "2026-09-10", published: false },
      { id: "c", date: "2026-09-13" },
      { id: "d", date: "2026-07-01", published: 0 },
      { id: "e", date: "2026-06-01", published: true },
    ];
    expect(novedadesPublicadas(items, 2).map((n) => n.id)).toEqual(["c", "a"]);
    expect(novedadesPublicadas(items, 10, { incluirNoPublicadas: true }).map((n) => n.id)).toEqual(["c", "b", "a", "d", "e"]);
    expect(novedadesPublicadas(undefined)).toEqual([]);
  });
});

describe("esIdDeConvenio", () => {
  it("acepta los ids con forma de slug y rechaza lo que sólo puede venir de una URL armada a mano", () => {
    expect(esIdDeConvenio("camioneros-cct-40-89")).toBe(true);
    expect(esIdDeConvenio("Comercio_2026.v2")).toBe(true);
    expect(esIdDeConvenio("..")).toBe(false);
    expect(esIdDeConvenio(".")).toBe(false);
    expect(esIdDeConvenio("-empieza-con-guion")).toBe(false);
    expect(esIdDeConvenio("con espacio")).toBe(false);
    expect(esIdDeConvenio("")).toBe(false);
    expect(esIdDeConvenio(undefined)).toBe(false);
  });
});
