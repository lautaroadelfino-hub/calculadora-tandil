// test/escalaCsv.test.js
// La carga de escalas es lo que el dueño hace todos los meses, y es la pestaña
// del panel que nunca se rehizo. Estos tests cubren los errores que hacían
// perder datos sin avisar.

import { describe, it, expect } from "vitest";
import {
  armarClave, leerClave, tieneZonas, partirLinea, detectarSeparador,
  parsearCsvEscala, generarCsvEscala, plantillaEjemplo,
  validarPeriodo, revisarEscalaAntesDePublicar,
} from "../lib/escalaCsv.js";

describe("claves de escala", () => {
  it("arma y lee la clave con zona", () => {
    expect(armarClave("Escala A", "Nivel 1")).toBe("Escala A|Nivel 1");
    expect(leerClave("Escala A|Nivel 1")).toEqual({ zona: "Escala A", categoria: "Nivel 1" });
  });

  it("sin zona la clave es sólo la categoría", () => {
    expect(armarClave("", "Vendedor B")).toBe("Vendedor B");
    expect(leerClave("Vendedor B")).toEqual({ zona: null, categoria: "Vendedor B" });
  });

  it("detecta zonas mirando TODAS las claves, no sólo la primera", () => {
    // Este era el bug: se miraba categoriasActuales[0] del array ordenado
    // alfabéticamente. Si esa fila no tenía zona, la columna se ignoraba entera.
    expect(tieneZonas(["Aprendiz", "Escala A|Nivel 1"])).toBe(true);
    expect(tieneZonas(["Vendedor A", "Vendedor B"])).toBe(false);
  });
});

describe("partir líneas de CSV", () => {
  it("respeta las comillas: una coma en el nombre ya no corre las columnas", () => {
    // Antes: "Vendedor, Rama A" partía en dos y el básico se leía como texto -> 0
    expect(partirLinea('"Vendedor, Rama A",1000,50', ",")).toEqual(["Vendedor, Rama A", "1000", "50"]);
  });

  it("entiende comillas escapadas", () => {
    expect(partirLinea('"Categoria ""especial""",1000,0', ",")).toEqual(['Categoria "especial"', "1000", "0"]);
  });

  it("detecta el separador punto y coma que usa Excel en español", () => {
    expect(detectarSeparador("categoria;basico;no_remunerativo")).toBe(";");
    expect(detectarSeparador("categoria,basico,no_remunerativo")).toBe(",");
  });
});

describe("leer un CSV de escala", () => {
  it("lee el formato simple", () => {
    const r = parsearCsvEscala("categoria,basico,no_remunerativo\nVendedor A,1.273.746,00\nVendedor B,1.300.000,120.000");
    expect(r.errores).toEqual([]);
    expect(r.sueldos["Vendedor A"]).toEqual({ basico: 1273746, no_remunerativo: 0 });
    expect(r.sueldos["Vendedor B"]).toEqual({ basico: 1300000, no_remunerativo: 120000 });
  });

  it("lee el formato con zona", () => {
    const r = parsearCsvEscala("zona,categoria,basico,no_remunerativo\nEscala A,Nivel 1,999420,38700");
    expect(r.errores).toEqual([]);
    expect(r.claves).toEqual(["Escala A|Nivel 1"]);
    expect(r.sueldos["Escala A|Nivel 1"].basico).toBe(999420);
  });

  it("un básico ilegible se denuncia con el número de fila, en vez de guardarse como 0", () => {
    const r = parsearCsvEscala("categoria,basico,no_remunerativo\nVendedor A,mil pesos,0");
    expect(r.errores[0]).toMatch(/Fila 2.*Vendedor A/);
    expect(r.sueldos["Vendedor A"]).toBeUndefined();
  });

  it("una fila a la que le falta el básico se denuncia", () => {
    const r = parsearCsvEscala("categoria,basico,no_remunerativo\nVendedor A,,0");
    expect(r.errores[0]).toMatch(/falta el sueldo básico/);
  });

  it("avisa de categorías repetidas", () => {
    const r = parsearCsvEscala("categoria,basico,no_remunerativo\nA,100,0\nA,200,0");
    expect(r.advertencias[0]).toMatch(/repetida/);
    expect(r.sueldos["A"].basico).toBe(200);
  });

  it("rechaza un nombre que contenga el separador de clave", () => {
    const r = parsearCsvEscala("categoria,basico,no_remunerativo\nVendedor|A,100,0");
    expect(r.errores[0]).toMatch(/no puede contener/);
  });

  it("un archivo sin filas de datos se denuncia", () => {
    expect(parsearCsvEscala("categoria,basico,no_remunerativo").errores).toHaveLength(1);
    expect(parsearCsvEscala("").errores).toHaveLength(1);
  });
});

describe("generar el CSV para editarlo", () => {
  it("ida y vuelta sin perder nada", () => {
    const claves = ["Escala A|Nivel 1", "Escala B|Nivel 1"];
    const sueldos = {
      "Escala A|Nivel 1": { basico: 999420, no_remunerativo: 38700 },
      "Escala B|Nivel 1": { basico: 888000, no_remunerativo: 30000 },
    };
    const vuelta = parsearCsvEscala(generarCsvEscala(claves, sueldos));
    expect(vuelta.sueldos).toEqual(sueldos);
  });

  it("entrecomilla los nombres con coma para que no se rompan al releerlos", () => {
    const csv = generarCsvEscala(["Vendedor, Rama A"], { "Vendedor, Rama A": { basico: 100, no_remunerativo: 0 } });
    expect(csv).toContain('"Vendedor, Rama A"');
    expect(parsearCsvEscala(csv).sueldos["Vendedor, Rama A"].basico).toBe(100);
  });
});

describe("la plantilla para un convenio nuevo", () => {
  it("trae filas de ejemplo, no sólo el encabezado", () => {
    // Antes bajaba vacía y el formato sólo existía en el código.
    const csv = plantillaEjemplo(false);
    expect(csv.split("\n").length).toBeGreaterThan(1);
    expect(parsearCsvEscala(csv).errores).toEqual([]);
  });

  it("la versión con zona también se relee bien", () => {
    const r = parsearCsvEscala(plantillaEjemplo(true));
    expect(r.errores).toEqual([]);
    expect(tieneZonas(r.claves)).toBe(true);
  });
});

describe("validar el período", () => {
  it("acepta el formato correcto", () => {
    expect(validarPeriodo("2026-09")).toBeNull();
  });

  it('rechaza "2026-9", que desordena los períodos', () => {
    // Con localeCompare, "2026-9" queda por encima de "2026-12" y la
    // calculadora selecciona el mes equivocado por defecto.
    expect(validarPeriodo("2026-9")).toMatch(/AAAA-MM/);
  });

  it("rechaza vacío, texto y meses que no existen", () => {
    expect(validarPeriodo("")).toBeTruthy();
    expect(validarPeriodo("julio 2026")).toBeTruthy();
    expect(validarPeriodo("2026-13")).toMatch(/mes que no existe/);
  });
});

describe("revisar antes de publicar", () => {
  const sueldos = { A: { basico: 100, no_remunerativo: 0 }, B: { basico: 200, no_remunerativo: 0 } };

  it("una escala sana no tiene nada que decir", () => {
    const r = revisarEscalaAntesDePublicar({ claves: ["A", "B"], sueldos, clavesPrevias: ["A", "B"] });
    expect(r.errores).toEqual([]);
    expect(r.advertencias).toEqual([]);
  });

  it("frena si TODOS los básicos están en cero", () => {
    // Pasaba de verdad: bajar la plantilla antes de buscar el período daba un
    // CSV lleno de ceros, y publicarlo no chequeaba nada.
    const r = revisarEscalaAntesDePublicar({
      claves: ["A"], sueldos: { A: { basico: 0, no_remunerativo: 0 } }, clavesPrevias: [],
    });
    expect(r.errores[0]).toMatch(/cero/);
  });

  it("avisa cuáles categorías van a desaparecer", () => {
    // Publicar reemplaza el período entero: subir un CSV con 1 categoría a un
    // período que tenía 2 borraba la otra, sin decir nada.
    const r = revisarEscalaAntesDePublicar({
      claves: ["A"], sueldos, clavesPrevias: ["A", "B"],
    });
    expect(r.desaparecen).toEqual(["B"]);
    expect(r.advertencias[0]).toMatch(/se van a borrar/i);
  });

  it("avisa de las categorías sueltas en cero sin frenar", () => {
    const r = revisarEscalaAntesDePublicar({
      claves: ["A", "B"],
      sueldos: { A: { basico: 100 }, B: { basico: 0 } },
      clavesPrevias: [],
    });
    expect(r.errores).toEqual([]);
    expect(r.advertencias[0]).toMatch(/básico en cero/);
  });
});
