// test/vigia/boletinOficial.test.js
// La fuente "Boletín Oficial": leer el listado de un día y el cuerpo de un
// aviso sobre el HTML real guardado, elegir qué días revisar, y fallar con
// nombre si el HTML ya no es el que se conoce.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  urlDelDia, avisosDelListado, cuerpoDelAviso, interesa, diasARevisar, listarDia, bajar, itemDesdeUrl, MAX_DIAS_POR_CORRIDA,
} from "../../scripts/vigia/fuentes/boletinOficial.mjs";

const carpeta = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "vigia");
const listado = readFileSync(join(carpeta, "boletin-listado-20260901.html"), "utf8");
const avisoHtml = readFileSync(join(carpeta, "boletin-aviso-anses-257-2026.html"), "utf8");

describe("el listado de un día", () => {
  it("la URL lleva la fecha sin guiones", () => {
    expect(urlDelDia("2026-09-01")).toBe("https://www.boletinoficial.gob.ar/seccion/primera/20260901");
  });

  it("del 1/9/2026 saca los avisos con organismo, norma y url, sin repetir", () => {
    const items = avisosDelListado(listado, "2026-09-01");
    // La página trae los primeros 100 (el resto se carga al bajar, ver listarDia);
    // cada aviso tiene dos links (con y sin anexos) y acá cuenta una vez.
    expect(items.length).toBe(100);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    const anses = items.find((i) => i.id === "primera/346683/20260901");
    expect(anses).toMatchObject({
      url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/346683/20260901",
      organismo: "ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL",
      tipoNorma: "Resolución 257/2026",
      fecha: "2026-09-01",
    });
    expect(anses.titulo).toContain("Resolución 257/2026");
    expect(interesa(anses)).toBe(true);
    const enacom = items.find((i) => /ENTE NACIONAL DE COMUNICACIONES/.test(i.organismo));
    expect(enacom).toBeDefined();
    expect(interesa(enacom)).toBe(false);
    // Las aduanas de ARCA publican "Avisos Oficiales" todos los días: no se bajan.
    expect(interesa({ organismo: "AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO - ADUANA ROSARIO", tipoNorma: "Aviso Oficial" })).toBe(false);
    expect(interesa({ organismo: "AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO", tipoNorma: "Resolución General 5907/2026" })).toBe(true);
    // El 1/9/2026: cuatro Resoluciones de ANSES y una RG de ARCA.
    expect(items.filter(interesa).map((i) => i.tipoNorma)).toEqual(["Resolución 257/2026", "Resolución 260/2026", "Resolución 261/2026", "Resolución 262/2026", "Resolución General 5894/2026"]);
    // Los avisos con anexos tienen dos links; el organismo sale del que tiene la línea.
    expect(items.filter((i) => !i.organismo)).toEqual([]);
    expect(items.find((i) => i.id === "primera/346633/20260901").organismo).toBe("PODER EJECUTIVO");
    // Sólo una parte del día se baja entera.
    expect(items.filter(interesa).length).toBeLessThan(items.length / 2);
  });

  it("una página que no es el listado falla con nombre; un día sin avisos, no", () => {
    expect(() => avisosDelListado("<html><body>Página de mantenimiento</body></html>", "2026-09-06")).toThrow(/cambió el formato del listado/);
    expect(avisosDelListado("<html><body><h1>Sección Primera</h1><p>Legislación y Avisos Oficiales</p></body></html>", "2026-09-06")).toEqual([]);
  });
});

describe("el cuerpo de un aviso", () => {
  it("de la página de la Res. 257/2026 saca el título y el texto limpio", () => {
    const { titulo, cuerpo } = cuerpoDelAviso(avisoHtml);
    expect(titulo).toBe("ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL - Resolución 257/2026");
    expect(cuerpo).toContain("bases imponibles mínima y máxima");
    expect(cuerpo).toContain("($144.363,55)");
    expect(cuerpo).not.toContain("<");
    expect(cuerpo).not.toMatch(/border: 1px/);
  });

  it("sin el cuerpo falla con nombre", () => {
    expect(() => cuerpoDelAviso("<html><title>x</title><body></body></html>")).toThrow(/cambió el formato del aviso/);
  });
});

describe("qué días revisar", () => {
  it("sin estado, sólo hoy; con estado, desde el día siguiente al último revisado", () => {
    expect(diasARevisar({ hasta: "2026-11-05" })).toEqual(["2026-11-05"]);
    expect(diasARevisar({ hasta: "2026-11-05", ultimaFechaRevisada: "2026-11-02" })).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
    expect(diasARevisar({ hasta: "2026-11-05", ultimaFechaRevisada: "2026-11-05" })).toEqual([]);
  });

  it("con --desde arranca ahí y no pasa del tope por corrida", () => {
    expect(diasARevisar({ desde: "2026-10-30", hasta: "2026-11-02", ultimaFechaRevisada: "2026-11-01" })).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    const muchos = diasARevisar({ desde: "2026-09-01", hasta: "2026-11-05" });
    expect(muchos).toHaveLength(MAX_DIAS_POR_CORRIDA);
    expect(muchos[0]).toBe("2026-09-01");
    expect(diasARevisar({ desde: "2026-11-10", hasta: "2026-11-05" })).toEqual([]);
  });
});

describe("con la red simulada", () => {
  // Lo que devuelve /seccion/actualizar/primera: JSON con un pedazo de HTML.
  const anchor = (id) => `<a href="/detalleAviso/primera/${id}/20260901"><div class="linea-aviso"><p class="item">SUPERINTENDENCIA DE RIESGOS DEL TRABAJO</p><p class="item-detalle"><small>Disposición 9/2026</small></p></div></a>`;
  const pagina2 = JSON.stringify({ html: `<div>${anchor(346800)}${anchor(346683)}</div>`, hay_mas_datos: true, sig_pag: 3, ult_rubro: "AVISOS OFICIALES" });
  const pagina3 = JSON.stringify({ html: "", hay_mas_datos: false, sig_pag: 4, ult_rubro: "" });

  it("lista un día entero: la página, y las siguientes con la cookie de sesión", async () => {
    const pedirFn = vi.fn(async (url) => {
      if (url.includes("seccion/primera/")) return { ok: true, status: 200, cookies: ["PHPSESSID=abc", "otra=1"], texto: () => listado };
      if (url.includes("pag=2")) return { ok: true, status: 200, cookies: [], texto: () => pagina2 };
      if (url.includes("pag=3")) return { ok: true, status: 200, cookies: [], texto: () => pagina3 };
      return { ok: true, status: 200, cookies: [], texto: () => avisoHtml };
    });
    const items = await listarDia("2026-09-01", { pedirFn });
    expect(pedirFn.mock.calls[0][0]).toBe("https://www.boletinoficial.gob.ar/seccion/primera/20260901");
    expect(pedirFn.mock.calls[1][0]).toBe("https://www.boletinoficial.gob.ar/seccion/actualizar/primera?pag=2&ult_rubro=RESOLUCIONES%20SINTETIZADAS");
    expect(pedirFn.mock.calls[1][1].cabeceras).toMatchObject({ Cookie: "PHPSESSID=abc; otra=1", "X-Requested-With": "XMLHttpRequest" });
    expect(pedirFn.mock.calls[2][0]).toContain("pag=3&ult_rubro=AVISOS%20OFICIALES");
    // 100 de la página + 1 nuevo de la segunda (el repetido no cuenta); la tercera no trae nada.
    expect(items).toHaveLength(101);
    expect(items.at(-1)).toMatchObject({ id: "primera/346800/20260901", organismo: "SUPERINTENDENCIA DE RIESGOS DEL TRABAJO", tipoNorma: "Disposición 9/2026" });
    const anses = items.find((i) => i.id === "primera/346683/20260901");
    const { titulo, cuerpo } = await bajar(anses, { pedirFn });
    expect(titulo).toContain("257/2026");
    expect(cuerpo).toContain("devengado septiembre de 2026");
  });

  it("sin cookie no pide más páginas; una página que no es JSON falla con nombre", async () => {
    const sinCookie = vi.fn(async () => ({ ok: true, status: 200, cookies: [], texto: () => listado }));
    expect(await listarDia("2026-09-01", { pedirFn: sinCookie })).toHaveLength(100);
    expect(sinCookie).toHaveBeenCalledTimes(1);
    const rota = vi.fn(async (url) => ({ ok: true, status: 200, cookies: ["s=1"], texto: () => (url.includes("pag=") ? "<html>no json</html>" : listado) }));
    await expect(listarDia("2026-09-01", { pedirFn: rota })).rejects.toThrow(/no es JSON/);
  });

  it("un HTTP que no es 2xx es un error con el estado, a mano para distinguir un 429", async () => {
    const pedirFn = vi.fn(async () => ({ ok: false, status: 503, texto: () => "" }));
    await expect(listarDia("2026-09-01", { pedirFn })).rejects.toThrow(/HTTP 503/);
    const limitado = vi.fn(async () => ({ ok: false, status: 429, texto: () => "" }));
    await expect(bajar({ url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/1/20260901" }, { pedirFn: limitado })).rejects.toMatchObject({ status: 429 });
  });

  it("de una URL pegada a mano arma el ítem", () => {
    expect(itemDesdeUrl("https://www.boletinoficial.gob.ar/detalleAviso/primera/346683/20260901?busqueda=1")).toMatchObject({ id: "primera/346683/20260901", fecha: "2026-09-01" });
    expect(() => itemDesdeUrl("https://www.boletinoficial.gob.ar/")).toThrow(/no es la URL de un aviso/);
  });
});
