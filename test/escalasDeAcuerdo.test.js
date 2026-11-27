// test/escalasDeAcuerdo.test.js
// Qué escala muestra la página de cada acuerdo. Los acuerdos de acá abajo son
// los que estaban publicados el 27/11/2026 (convenio, fecha, tipo, título y
// vigencia, tal como se cargaron en /admin), porque la regla se pensó mirando
// esos casos: la circular de Comercio que nombra un mes que después revisó
// otro acuerdo, el acuerdo de Camioneros que cubre meses que tienen cada uno
// su escala, y Gastronómicos, que no publica escalas sueltas.

import { describe, it, expect } from "vitest";
import {
  periodosDeVigencia,
  periodosDeAcuerdo,
  paginaDeCadaPeriodo,
  escalasDeLaPagina,
  periodosALeer,
  tablaDeEscalas,
  variacionDeBasicos,
  frasesDelMes,
  valoresDelMes,
  nombreDeLosMeses,
  TOPE_DE_COLUMNAS,
} from "../lib/escalasDeAcuerdo.js";
import convenioCamioneros from "./fixtures/camioneros-cct-40-89.convenio.json";
import escalasCamioneros from "./fixtures/camioneros-cct-40-89.escalas.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";
import escalasGastronomicos from "./fixtures/gastronomicos-cct-389-04.escalas.json";

const CAM = "camioneros-cct-40-89";
const COM = "comercio-cct-130-75";
const GAS = "gastronomicos-cct-389-04";
const acuerdo = (id, convenioId, fecha, tipo, titulo, vigencia = null) => ({ id, convenioId, fecha, tipo, titulo, vigencia });

const MESES_DE_CAMIONEROS = [
  ["2025-12", "diciembre 2025"], ["2026-01", "enero 2026"], ["2026-02", "febrero 2026"], ["2026-03", "marzo 2026"],
  ["2026-04", "abril 2026"], ["2026-05", "mayo 2026"], ["2026-06", "junio 2026"], ["2026-07", "julio 2026"],
  ["2026-08", "agosto 2026"], ["2026-09", "septiembre 2026"], ["2026-10", "octubre 2026"], ["2026-11", "noviembre 2026"],
];
const CAMIONEROS = [
  ...MESES_DE_CAMIONEROS.map(([p, nombre]) => acuerdo(`cam-${p}`, CAM, `${p}-01`, "escala", `Escala salarial ${nombre}`, nombre)),
  acuerdo("cam-acuerdo", CAM, "2026-09-18", "acuerdo", "Acuerdo salarial del 18 de septiembre de 2026 (septiembre 2026 a febrero 2027)", "septiembre 2026 a febrero 2027"),
  acuerdo("cam-homologacion", CAM, "2026-10-06", "homologacion", "Homologación de los acuerdos del 18 de septiembre de 2026"),
];
const COMERCIO = [
  acuerdo("com-2025-06", COM, "2025-06-26", "acuerdo", "Acuerdo paritario y escalas del 26 de junio de 2025"),
  acuerdo("com-esc-dic", COM, "2025-12-01", "escala", "Escalas salariales diciembre 2025 a abril 2026", "diciembre 2025 a abril 2026"),
  acuerdo("com-ac-dic", COM, "2025-12-05", "acuerdo", "Acuerdo paritario del 5 de diciembre de 2025", "diciembre 2025 a abril 2026"),
  acuerdo("com-hom-dic", COM, "2025-12-18", "homologacion", "Homologación del acuerdo del 5 de diciembre de 2025"),
  acuerdo("com-ac-mar", COM, "2026-03-26", "acuerdo", "Acuerdo paritario del 26 de marzo de 2026 (abril, mayo y junio 2026)", "abril a junio 2026"),
  acuerdo("com-esc-abr", COM, "2026-04-01", "escala", "Escalas salariales abril a julio 2026", "abril a julio 2026"),
  acuerdo("com-ac-jul", COM, "2026-07-22", "acuerdo", "Acuerdo paritario del 22 de julio de 2026 (julio, agosto y septiembre 2026)", "julio a septiembre 2026"),
  acuerdo("com-hom-jul", COM, "2026-08-05", "homologacion", "Homologación del acuerdo de julio de 2026"),
  acuerdo("com-esc-oct", COM, "2026-10-01", "escala", "Escalas salariales octubre 2026 a mayo 2027", "octubre 2026 a mayo 2027"),
  acuerdo("com-ac-oct", COM, "2026-10-27", "acuerdo", "Acuerdo paritario del 27 de octubre de 2026 (octubre, noviembre y diciembre 2026)", "octubre a diciembre 2026"),
  acuerdo("com-hom-oct", COM, "2026-11-03", "homologacion", "Homologación del acuerdo del 27 de octubre de 2026"),
];
const GASTRONOMICOS = [
  acuerdo("gas-2025-06", GAS, "2025-06-01", "acuerdo", "Acuerdo salarial UTHGRA-FEHGRA junio a septiembre 2025", "junio a septiembre 2025"),
  acuerdo("gas-2025-10", GAS, "2025-10-01", "acuerdo", "Acuerdo salarial UTHGRA-FEHGRA octubre 2025 a abril 2026", "octubre 2025 a abril 2026"),
  acuerdo("gas-2026-07", GAS, "2026-07-24", "acuerdo", "Acuerdo salarial UTHGRA-FEHGRA 2026-2027, primer tramo: julio a septiembre 2026", "julio a septiembre 2026"),
];
// Los meses con escala en la base ese día.
const CARGADOS = {
  [CAM]: ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11"],
  [COM]: ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"],
  [GAS]: ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"],
};
const de = (lista, id) => lista.find((a) => a.id === id);

describe("periodosDeVigencia", () => {
  it("lee las vigencias como están escritas en el panel", () => {
    expect(periodosDeVigencia("noviembre 2026")).toEqual(["2026-11"]);
    expect(periodosDeVigencia("abril a julio 2026")).toEqual(["2026-04", "2026-05", "2026-06", "2026-07"]);
    expect(periodosDeVigencia("julio a septiembre 2026")).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(periodosDeVigencia("octubre 2026 a mayo 2027")).toEqual(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"]);
    expect(periodosDeVigencia("diciembre 2025 a abril 2026")).toEqual(["2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(periodosDeVigencia("septiembre 2026 a febrero 2027")).toHaveLength(6);
  });

  it("entiende mayúsculas, acentos, abreviaturas, listas y fechas completas", () => {
    expect(periodosDeVigencia("Septiembre de 2026")).toEqual(["2026-09"]);
    expect(periodosDeVigencia("SEPT. 2026")).toEqual(["2026-09"]);
    expect(periodosDeVigencia("setiembre 2026")).toEqual(["2026-09"]);
    expect(periodosDeVigencia("octubre, noviembre y diciembre 2026")).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(periodosDeVigencia("del 1 de octubre de 2026 al 31 de diciembre de 2026")).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(periodosDeVigencia("octubre 2026 - marzo 2027")).toHaveLength(6);
  });

  it("al mes sin año le pone el del que sigue, y cruza el año si hace falta", () => {
    // "diciembre a abril 2026" empieza en diciembre de 2025, no de 2026.
    expect(periodosDeVigencia("diciembre a abril 2026")).toEqual(["2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(periodosDeVigencia("octubre 2026 a mayo")).toHaveLength(8);
  });

  it("lo que no se entiende no cubre ningún mes", () => {
    for (const texto of [null, undefined, "", "2026/2027", "primer tramo", "julio a septiembre", "hasta nuevo aviso", "mayo 2027 a octubre 2026"]) {
      expect(periodosDeVigencia(texto)).toEqual([]);
    }
    // Más de dos años no es una vigencia: es un año mal tipeado.
    expect(periodosDeVigencia("enero 2026 a diciembre 2029")).toEqual([]);
  });
});

describe("periodosDeAcuerdo", () => {
  it("una escala sin vigencia legible cubre el mes de su fecha; un acuerdo, ninguno", () => {
    expect(periodosDeAcuerdo({ tipo: "escala", fecha: "2026-11-01", vigencia: null })).toEqual(["2026-11"]);
    expect(periodosDeAcuerdo({ tipo: "escala", fecha: "2026-11-14", vigencia: "ver el anexo" })).toEqual(["2026-11"]);
    expect(periodosDeAcuerdo({ tipo: "acuerdo", fecha: "2026-11-01", vigencia: null })).toEqual([]);
  });

  it("las homologaciones y los otros documentos no fijan importes", () => {
    expect(periodosDeAcuerdo({ tipo: "homologacion", fecha: "2026-10-06", vigencia: "octubre 2026" })).toEqual([]);
    expect(periodosDeAcuerdo({ tipo: "otro", fecha: "2026-10-06", vigencia: "octubre 2026" })).toEqual([]);
    expect(periodosDeAcuerdo(null)).toEqual([]);
  });
});

describe("paginaDeCadaPeriodo", () => {
  it("Camioneros: cada mes va en su escala, no en el acuerdo que los cubre a todos", () => {
    const pagina = paginaDeCadaPeriodo(CAMIONEROS);
    expect(pagina["2026-09"].id).toBe("cam-2026-09");
    expect(pagina["2026-11"].id).toBe("cam-2026-11");
    // Diciembre a febrero todavía no tienen planilla: por ahora sólo los nombra el acuerdo.
    expect(pagina["2026-12"].id).toBe("cam-acuerdo");
  });

  it("Comercio: julio es del acuerdo que lo revisó, no de la circular anterior que también lo nombra", () => {
    const pagina = paginaDeCadaPeriodo(COMERCIO);
    expect(pagina["2026-06"].id).toBe("com-esc-abr");
    expect(pagina["2026-07"].id).toBe("com-ac-jul");
    expect(pagina["2026-09"].id).toBe("com-ac-jul");
  });

  it("Comercio: si el acuerdo y su planilla empiezan el mismo mes, la planilla", () => {
    const pagina = paginaDeCadaPeriodo(COMERCIO);
    for (const p of ["2026-10", "2026-11", "2026-12", "2027-05"]) expect(pagina[p].id).toBe("com-esc-oct");
    for (const p of ["2026-04", "2026-05"]) expect(pagina[p].id).toBe("com-esc-abr");
    // Abril también está en la circular de diciembre a abril, pero la que empieza en abril es posterior.
    expect(pagina["2026-03"].id).toBe("com-esc-dic");
  });

  it("no depende del orden en que llegan los acuerdos", () => {
    const alReves = paginaDeCadaPeriodo([...COMERCIO].reverse());
    const derecho = paginaDeCadaPeriodo(COMERCIO);
    expect(Object.fromEntries(Object.entries(alReves).map(([p, a]) => [p, a.id]))).toEqual(
      Object.fromEntries(Object.entries(derecho).map(([p, a]) => [p, a.id]))
    );
  });
});

describe("escalasDeLaPagina", () => {
  const meses = (lista, id, convenio) => escalasDeLaPagina(de(lista, id), lista, CARGADOS[convenio]);

  it("la escala de un mes muestra ese mes, si está cargado", () => {
    expect(meses(CAMIONEROS, "cam-2026-11", CAM)).toEqual({ periodos: ["2026-11"], enOtraPagina: [] });
    // Junio de 2026 tiene su PDF, pero la base de Camioneros empieza en julio.
    expect(meses(CAMIONEROS, "cam-2026-06", CAM)).toEqual({ periodos: [], enOtraPagina: [] });
  });

  it("el acuerdo de Camioneros no repite las escalas: lleva a la de cada mes", () => {
    const r = meses(CAMIONEROS, "cam-acuerdo", CAM);
    expect(r.periodos).toEqual([]);
    expect(r.enOtraPagina.map((o) => [o.acuerdo.id, o.periodos])).toEqual([
      ["cam-2026-09", ["2026-09"]],
      ["cam-2026-10", ["2026-10"]],
      ["cam-2026-11", ["2026-11"]],
    ]);
  });

  it("Comercio: cada mes cargado aparece en una sola página", () => {
    expect(meses(COMERCIO, "com-esc-oct", COM).periodos).toEqual(["2026-10", "2026-11", "2026-12"]);
    // El acuerdo del 27/10 no repite la tabla: lleva a la planilla, que muestra sus tres meses.
    expect(meses(COMERCIO, "com-ac-oct", COM)).toEqual({
      periodos: [],
      enOtraPagina: [{ acuerdo: de(COMERCIO, "com-esc-oct"), periodos: ["2026-10", "2026-11", "2026-12"] }],
    });
    expect(meses(COMERCIO, "com-ac-jul", COM).periodos).toEqual(["2026-07", "2026-08", "2026-09"]);
    const abril = meses(COMERCIO, "com-esc-abr", COM);
    expect(abril.periodos).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(abril.enOtraPagina.map((o) => [o.acuerdo.id, o.periodos])).toEqual([["com-ac-jul", ["2026-07"]]]);
    // La circular de diciembre a abril: su abril lo pisó la de abril a julio.
    expect(meses(COMERCIO, "com-esc-dic", COM).periodos).toEqual([]);

    const vistos = COMERCIO.flatMap((a) => escalasDeLaPagina(a, COMERCIO, CARGADOS[COM]).periodos);
    expect([...vistos].sort()).toEqual(CARGADOS[COM]);
  });

  it("Gastronómicos no publica escalas sueltas: la tabla va en el acuerdo", () => {
    expect(meses(GASTRONOMICOS, "gas-2026-07", GAS).periodos).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(meses(GASTRONOMICOS, "gas-2025-10", GAS).periodos).toEqual(["2026-04"]);
    expect(meses(GASTRONOMICOS, "gas-2025-06", GAS).periodos).toEqual([]);
  });

  it("una homologación no muestra escalas", () => {
    expect(meses(COMERCIO, "com-hom-oct", COM)).toEqual({ periodos: [], enOtraPagina: [] });
  });

  it("no pasa del tope de columnas: quedan los meses más nuevos", () => {
    const largo = acuerdo("largo", COM, "2025-01-01", "escala", "Escalas 2025 y 2026", "enero 2025 a junio 2026");
    const todos = periodosDeVigencia("enero 2025 a junio 2026");
    const r = escalasDeLaPagina(largo, [largo], todos);
    expect(r.periodos).toHaveLength(TOPE_DE_COLUMNAS);
    expect(r.periodos[r.periodos.length - 1]).toBe("2026-06");
  });
});

describe("periodosALeer", () => {
  it("suma el mes anterior de cada uno, si está cargado, sin repetir", () => {
    expect(periodosALeer(["2026-10", "2026-11", "2026-12"], CARGADOS[COM])).toEqual(["2026-09", "2026-10", "2026-11", "2026-12"]);
    // Julio es el primer mes cargado de Camioneros: no hay junio para comparar.
    expect(periodosALeer(["2026-07"], CARGADOS[CAM])).toEqual(["2026-07"]);
    expect(periodosALeer([], CARGADOS[CAM])).toEqual([]);
  });
});

describe("tablaDeEscalas", () => {
  it("Camioneros: las 43 categorías, con centavos y los tramos de grúa en orden", () => {
    const tabla = tablaDeEscalas(escalasCamioneros, ["2026-11"]);
    expect(tabla.periodos).toEqual([{ id: "2026-11", nombre: "Noviembre 2026" }]);
    expect(tabla.categorias).toBe(43);
    expect(tabla.decimales).toBe(2);
    expect(tabla.grupos).toHaveLength(1);
    expect(tabla.grupos[0].zona).toBeNull();
    const nombres = tabla.grupos[0].filas.map((f) => f.categoria);
    // "más de 20" antes que "más de 110": el orden alfabético puro los daba al revés.
    expect(nombres.indexOf("Conductor de grúas de más de 20 y hasta 35 tn")).toBeLessThan(nombres.indexOf("Conductor de grúas de más de 110 y hasta 140 tn"));
    expect(tabla.grupos[0].filas.find((f) => f.categoria === "Conductor de primera categoría").basico).toEqual([1145293.94]);
    expect(tabla.sumas).toEqual([{ noRemunerativo: 0, sinIncidencia: 0, nombreSinIncidencia: null }]);
    expect(tabla.noRemunerativoPorCategoria).toBe(false);
  });

  it("Comercio: una columna por mes, en pesos enteros, con la suma no remunerativa común", () => {
    const tabla = tablaDeEscalas(escalasComercio, ["2026-07", "2026-08", "2026-09"]);
    expect(tabla.periodos.map((p) => p.nombre)).toEqual(["Julio 2026", "Agosto 2026", "Septiembre 2026"]);
    expect(tabla.categorias).toBe(21);
    expect(tabla.decimales).toBe(0);
    const fila = tabla.grupos[0].filas.find((f) => f.categoria === "Administrativo A");
    expect(fila.basico).toHaveLength(3);
    expect(fila.basico[2]).toBe(1196632);
    expect(tabla.sumas[2].noRemunerativo).toBe(120000);
    expect(tabla.noRemunerativoPorCategoria).toBe(false);
  });

  it("Gastronómicos: agrupa por escala, y avisa que la suma no remunerativa cambia por categoría", () => {
    const tabla = tablaDeEscalas(escalasGastronomicos, ["2026-07", "2026-08", "2026-09"]);
    expect(tabla.grupos.map((g) => g.zona)).toEqual(["Escala A", "Escala B"]);
    expect(tabla.grupos.map((g) => g.filas.length)).toEqual([7, 7]);
    expect(tabla.grupos[0].filas[0].categoria).toBe("Nivel 1 (Peón - Lavacopas)");
    expect(tabla.grupos[0].filas[0].noRemunerativo[2]).toBe(74000);
    expect(tabla.sumas[2].noRemunerativo).toBeNull();
    expect(tabla.noRemunerativoPorCategoria).toBe(true);
  });

  it("una categoría que falta en un mes lleva null, y un mes sin escala no hace columna", () => {
    const escalas = {
      "2026-01": { categorias: { A: { basico: 100 }, B: 200 } },
      "2026-02": { categorias: { A: { basico: 110 } } },
    };
    const tabla = tablaDeEscalas(escalas, ["2026-01", "2026-02", "2026-03"]);
    expect(tabla.periodos.map((p) => p.nombre)).toEqual(["Enero 2026", "Febrero 2026"]);
    expect(tabla.grupos[0].filas).toEqual([
      { categoria: "A", basico: [100, 110], noRemunerativo: [0, 0] },
      { categoria: "B", basico: [200, null], noRemunerativo: [0, null] },
    ]);
  });
});

describe("variacionDeBasicos", () => {
  it("da los porcentajes del acuerdo de Camioneros y del acta de Gastronómicos", () => {
    expect(variacionDeBasicos(escalasCamioneros["2026-10"], escalasCamioneros["2026-09"])).toEqual({ min: 2.82, max: 2.82 });
    expect(variacionDeBasicos(escalasCamioneros["2026-11"], escalasCamioneros["2026-10"])).toEqual({ min: 1.7, max: 1.7 });
    expect(variacionDeBasicos(escalasGastronomicos["2026-10"], escalasGastronomicos["2026-09"])).toEqual({ min: 8.03, max: 8.03 });
    expect(variacionDeBasicos(escalasGastronomicos["2026-11"], escalasGastronomicos["2026-10"])).toEqual({ min: 0, max: 0 });
  });

  it("sin categorías en común no hay comparación", () => {
    expect(variacionDeBasicos({ categorias: { A: { basico: 1 } } }, { categorias: { B: { basico: 1 } } })).toBeNull();
    expect(variacionDeBasicos({ categorias: { A: { basico: 1 } } }, null)).toBeNull();
  });
});

describe("frasesDelMes", () => {
  // Entre el signo y el importe, y antes del %, va un espacio que no se corta:
  // acá se comparan las frases como se leen.
  const legible = (frases) => frases.map((f) => f.replace(/\u00a0/g, " "));

  it("Camioneros, octubre: el aumento y que ya no está la suma de septiembre", () => {
    expect(legible(frasesDelMes({ periodo: "2026-10", escala: escalasCamioneros["2026-10"], anterior: escalasCamioneros["2026-09"] }))).toEqual([
      "Los básicos suben 2,82 % respecto de septiembre de 2026.",
      "No hay suma no remunerativa, a diferencia de septiembre de 2026.",
    ]);
  });

  it("Camioneros, noviembre: sólo el aumento", () => {
    expect(legible(frasesDelMes({ periodo: "2026-11", escala: escalasCamioneros["2026-11"], anterior: escalasCamioneros["2026-10"] }))).toEqual([
      "Los básicos suben 1,7 % respecto de octubre de 2026.",
    ]);
  });

  it("Comercio: un rango cuando el porcentaje no es parejo, y la suma común", () => {
    expect(legible(frasesDelMes({ periodo: "2026-09", escala: escalasComercio["2026-09"], anterior: escalasComercio["2026-08"] }))).toEqual([
      "Los básicos suben entre 2,01 % y 2,02 % respecto de agosto de 2026.",
      "Suma no remunerativa: $ 120.000 en todas las categorías.",
    ]);
  });

  it("dice cuándo la suma cambió, cuándo depende de la categoría y cuándo hay una asignación extraordinaria", () => {
    const antes = { categorias: { A: { basico: 100, no_remunerativo: 120000 }, B: { basico: 200, no_remunerativo: 120000 } } };
    const ahora = {
      nombre_sin_incidencia: "Asignación Extraordinaria por Única Vez",
      categorias: {
        A: { basico: 100, no_remunerativo: 100000, no_remunerativo_sin_incidencia: 25000 },
        B: { basico: 200, no_remunerativo: 100000, no_remunerativo_sin_incidencia: 25000 },
      },
    };
    expect(legible(frasesDelMes({ periodo: "2026-12", escala: ahora, anterior: antes }))).toEqual([
      "Los básicos son los mismos que en noviembre de 2026.",
      "Suma no remunerativa: $ 100.000 en todas las categorías (en noviembre de 2026, $ 120.000).",
      "Asignación Extraordinaria por Única Vez: $ 25.000 en todas las categorías.",
    ]);
    expect(legible(frasesDelMes({ periodo: "2026-09", escala: escalasGastronomicos["2026-09"] }))).toEqual([
      "La suma no remunerativa cambia según la categoría.",
    ]);
  });

  it("el importe y el porcentaje no se parten en dos renglones", () => {
    const [aumento, suma] = frasesDelMes({ periodo: "2026-09", escala: escalasComercio["2026-09"], anterior: escalasComercio["2026-08"] });
    expect(aumento).toContain("2,01\u00a0%");
    expect(suma).toContain("$\u00a0120.000");
  });

  it("sin el mes anterior no compara", () => {
    expect(legible(frasesDelMes({ periodo: "2026-07", escala: escalasCamioneros["2026-07"] })).some((f) => f.includes("respecto de"))).toBe(false);
  });

  it("si unas categorías suben y otras bajan, no arma una frase", () => {
    const antes = { categorias: { A: { basico: 100 }, B: { basico: 100 } } };
    const ahora = { categorias: { A: { basico: 110 }, B: { basico: 90 } } };
    expect(legible(frasesDelMes({ periodo: "2026-02", escala: ahora, anterior: antes }))).toEqual([]);
  });
});

describe("valoresDelMes", () => {
  it("Camioneros: los valores que una regla del convenio nombra, con su unidad", () => {
    const filas = valoresDelMes(convenioCamioneros, escalasCamioneros, ["2026-11"]);
    expect(filas.map((f) => f.clave).sort()).toEqual(["comida", "km_hora_extra", "km_viatico", "pernoctada", "viatico_especial"]);
    const comida = filas.find((f) => f.clave === "comida");
    expect(comida).toEqual({ clave: "comida", nombre: "Comida (ítem 4.1.12)", unidad: "por día", valores: [17524.83] });
    expect(filas.find((f) => f.clave === "km_viatico").unidad).toBe("por km");
    // La base guarda 12 valores; los que ninguna regla nombra no salen con su clave interna.
    expect(filas.some((f) => f.clave === "adicional_bitrenes")).toBe(false);
  });

  it("un convenio sin valores del mes no tiene filas", () => {
    expect(valoresDelMes({ reglas_calculo: {} }, escalasComercio, ["2026-09"])).toEqual([]);
    expect(valoresDelMes(null, escalasComercio, ["2026-09"])).toEqual([]);
  });
});

describe("nombreDeLosMeses", () => {
  it("un mes, un rango del mismo año, uno que cruza el año y meses salteados", () => {
    expect(nombreDeLosMeses(["2026-11"])).toBe("noviembre de 2026");
    expect(nombreDeLosMeses(["2026-10", "2026-11", "2026-12"])).toBe("octubre a diciembre de 2026");
    expect(nombreDeLosMeses(["2026-12", "2027-01"])).toBe("diciembre de 2026 a enero de 2027");
    expect(nombreDeLosMeses(["2026-04", "2026-07"])).toBe("abril de 2026, julio de 2026");
    expect(nombreDeLosMeses([])).toBe("");
  });
});
