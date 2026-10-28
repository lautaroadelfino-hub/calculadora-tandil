// test/vigia/borradores.test.js
// La forma del borrador: ids deterministas, estados, validación y la línea
// que va a Telegram y a la Bandeja.
import { describe, it, expect } from "vitest";
import {
  TIPOS, ESTADOS, idDeBorrador, pestañaDe, estaAbierto, controlesEnFalso, nuevoBorrador, validarBorrador, lineaDe,
} from "../../lib/vigia/borradores.js";

const fuente = { nombre: "boletinOficial", url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/1/20261101", titulo: "Resolución 290/2026", fecha: "2026-11-01" };
const tabla = {
  vigencia: "Noviembre 2026",
  bases_art9: { minima: 147000.12, maxima: 4800000.55 },
  regimenes: { resto_mipyme: { label: "Resto", predeterminado: true, conceptos: [] } },
  universales: [{ id: "ffep", label: "FFEP", unidad: "suma_fija", monto: 1935, rubro: "otros" }],
  detraccion: { monto: 7003.68 },
};

describe("ids y pestañas", () => {
  it("el id es determinista y dice tipo, convenio y período", () => {
    expect(idDeBorrador({ tipo: "escala", convenioId: "camioneros-cct-40-89", periodo: "2026-10" })).toBe("escala--camioneros-cct-40-89--2026-10");
    expect(idDeBorrador({ tipo: "contribuciones", periodo: "2026-11" })).toBe("contribuciones--nacional--2026-11");
    expect(idDeBorrador({ tipo: "acuerdo", convenioId: "comercio-cct-130-75", fecha: "2026-07-22" })).toBe("acuerdo--comercio-cct-130-75--2026-07-22");
    expect(idDeBorrador({ tipo: "escala", convenioId: "comercio-cct-130-75", periodo: "2026-07", revision: "2026-11-05" })).toBe("escala--comercio-cct-130-75--2026-07--revision-2026-11-05");
  });

  it("frena con un tipo desconocido, sin período o con un id que no sirve de URL", () => {
    expect(() => idDeBorrador({ tipo: "novedad", periodo: "2026-10" })).toThrow(/desconocido/);
    expect(() => idDeBorrador({ tipo: "escala", convenioId: "x" })).toThrow(/período/);
    expect(() => idDeBorrador({ tipo: "acuerdo", convenioId: "x" })).toThrow(/fecha/);
    expect(() => idDeBorrador({ tipo: "escala", convenioId: "a/b", periodo: "2026-10" })).toThrow(/caracteres/);
  });

  it("cada tipo tiene su pestaña y los tipos y estados son los que el panel conoce", () => {
    expect(TIPOS.map(pestañaDe)).toEqual(["escalas", "contribuciones", "ganancias", "acuerdos"]);
    expect(() => pestañaDe("otro")).toThrow();
    expect(ESTADOS).toEqual(["pendiente", "requiere_revision", "publicado", "descartado"]);
    expect(estaAbierto({ estado: "pendiente" })).toBe(true);
    expect(estaAbierto({ estado: "publicado" })).toBe(false);
    expect(estaAbierto(null)).toBe(false);
  });
});

describe("armar un borrador", () => {
  const base = { tipo: "contribuciones", periodo: "2026-11", datos: tabla, resumen: "Noviembre 2026: bases nuevas", fuente, origen: "boletin", corridaId: "2026-11-05T12-00-07Z", ahora: "2026-11-05T12:00:09.000Z" };

  it("nace pendiente, con fechas y sin publicar", () => {
    const b = nuevoBorrador(base);
    expect(b.id).toBe("contribuciones--nacional--2026-11");
    expect(b.estado).toBe("pendiente");
    expect(b).toMatchObject({ creadoEl: "2026-11-05T12:00:09.000Z", actualizadoEl: "2026-11-05T12:00:09.000Z", publicadoEl: null, publicadoComo: null, descartadoEl: null, advertencias: [], archivos: [] });
    expect(validarBorrador(b)).toEqual([]);
  });

  it("un control en falso lo manda a requiere_revision", () => {
    const b = nuevoBorrador({ ...base, tipo: "escala", convenioId: "camioneros-cct-40-89", periodo: "2026-10", datos: { mes_vigencia: "Octubre 2026", categorias: { Peón: { basico: 1 } } }, controles: { categoriasCoinciden: true, subaPareja: { ok: false, min: 1.1, max: 2.3 } } });
    expect(b.estado).toBe("requiere_revision");
    expect(controlesEnFalso(b.controles)).toEqual(["subaPareja"]);
    expect(lineaDe(b)).toMatch(/\[requiere revisión: subaPareja\]/);
  });

  it("una revisión de un mes publicado lleva la fecha en el id y lo dice en la línea", () => {
    const b = nuevoBorrador({ ...base, tipo: "escala", convenioId: "comercio-cct-130-75", periodo: "2026-07", revisa: "convenios/comercio-cct-130-75/escalas/2026-07", datos: { mes_vigencia: "Julio 2026", categorias: { "Vendedor B": { basico: 1177947, no_remunerativo: 120000 } } } });
    expect(b.id).toBe("escala--comercio-cct-130-75--2026-07--revision-2026-11-05");
    expect(lineaDe(b, "Comercio")).toBe("Escala · Comercio · 2026-07: Noviembre 2026: bases nuevas [REVISIÓN de un mes ya publicado]");
  });

  it("la línea cuenta las advertencias", () => {
    const b = nuevoBorrador({ ...base, advertencias: ["sube 50%", "falta km"] });
    expect(lineaDe(b)).toBe("Contribuciones · 2026-11: Noviembre 2026: bases nuevas (2 advertencias)");
  });
});

describe("validar", () => {
  const bueno = nuevoBorrador({ tipo: "contribuciones", periodo: "2026-11", datos: tabla, resumen: "x", fuente, origen: "boletin", corridaId: "c1" });

  it("acepta uno bien armado y nombra cada cosa que falta", () => {
    expect(validarBorrador(bueno)).toEqual([]);
    expect(validarBorrador(null)).toEqual(["El borrador no es un objeto."]);
    const roto = { ...bueno, tipo: "x", estado: "y", periodo: "2026-13", datos: {}, resumen: "", fuente: {}, corridaId: null, creadoEl: "ayer", advertencias: "no", origen: "magia" };
    const errores = validarBorrador(roto);
    expect(errores).toEqual(expect.arrayContaining([
      'Tipo desconocido: "x".', 'Estado desconocido: "y".', "El período tiene que ser AAAA-MM.",
      "Faltan los datos (la forma del documento final).", "Falta el resumen.", "Falta la fuente (url).",
      "Falta la corrida que lo creó.", "creadoEl tiene que ser una fecha ISO.", "advertencias tiene que ser una lista.", 'Origen desconocido: "magia".',
    ]));
  });

  it("revisa la forma de cada tipo de datos", () => {
    expect(validarBorrador({ ...bueno, datos: { ...tabla, bases_art9: { minima: 5, maxima: 4 } } })).toEqual(["La base mínima tiene que ser menor que la máxima."]);
    const escala = nuevoBorrador({ tipo: "escala", convenioId: "c", periodo: "2026-10", datos: { mes_vigencia: "", categorias: { A: { basico: "1.000" }, B: { basico: 2, no_remunerativo: "x" } }, valores_del_periodo: { km: "no" } }, resumen: "x", fuente, origen: "tramo", corridaId: "c1" });
    expect(validarBorrador(escala)).toEqual(['"A": el básico no es un número.', '"B": el no remunerativo no es un número.', "La escala no tiene mes_vigencia.", 'Valor del período "km": no es un número.']);
    const acuerdo = nuevoBorrador({ tipo: "acuerdo", convenioId: "c", fecha: "2026-09-01", datos: { convenioId: "c", fecha: "2026-9-1", titulo: " " }, resumen: "x", fuente, origen: "pdf", corridaId: "c1" });
    expect(validarBorrador(acuerdo)).toEqual(["El acuerdo no tiene fecha AAAA-MM-DD.", "El acuerdo no tiene título.", "El acuerdo no tiene archivo ni link a la fuente."]);
    const ganancias = nuevoBorrador({ tipo: "ganancias", periodo: "2026-07", datos: { vigencia: "x" }, resumen: "x", fuente, origen: "pdf", corridaId: "c1" });
    expect(validarBorrador(ganancias)).toEqual(["Faltan las deducciones anuales.", "Falta la escala anual."]);
  });
});
