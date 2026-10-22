// test/vigia/boletin.test.js
// Leer los números de un aviso del Boletín Oficial, sobre los textos reales:
// la Resolución ANSES 257/2026 (bases de septiembre 2026), la Disposición SRT
// 8/2026 (FFEP de agosto 2026), una Resolución de ANSES que no es de bases y
// la Disposición del Fondo de Garantía, que nombra un fondo que no es el FFEP.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { numeroDePesos, extraerBasesArt9, extraerFfep, mencionaFfep, clasificarAviso, nombreDeNorma, ORGANISMOS_DE_INTERES } from "../../lib/vigia/boletin.js";

const carpeta = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "vigia");
/** Las fixtures son: línea 1 la ruta del aviso, línea 2 el título, después el cuerpo. */
const aviso = (archivo) => {
  const [ruta, titulo, , ...cuerpo] = readFileSync(join(carpeta, archivo), "utf8").split("\n");
  const organismo = titulo.replace(/\s+(Resoluci[óo]n|Disposici[óo]n).*$/i, "");
  return { ruta, titulo, organismo, texto: cuerpo.join("\n") };
};
const anses257 = aviso("boletin-aviso-anses-257-2026.txt");
const anses260 = aviso("boletin-aviso-anses-260-2026.txt");
const srt8 = aviso("boletin-aviso-srt-disp-8-2026.txt");
const fondoGarantia = aviso("boletin-aviso-srt-fondo-garantia-59-2026.txt");

describe("los importes", () => {
  it("lee pesos con puntos de miles y coma decimal, con o sin centavos", () => {
    expect(numeroDePesos("$144.363,55")).toBe(144363.55);
    expect(numeroDePesos("$ 1.905")).toBe(1905);
    expect(numeroDePesos("4.691.748,47")).toBe(4691748.47);
    expect(numeroDePesos("$ 1.904,5")).toBe(1904.5);
    expect(numeroDePesos("1,5,3")).toBeNull();
    expect(numeroDePesos("mil")).toBeNull();
    expect(numeroDePesos("")).toBeNull();
  });
});

describe("las bases del art. 9", () => {
  it("la Resolución ANSES 257/2026 fija $144.363,55 y $4.691.748,47 desde septiembre de 2026", () => {
    expect(extraerBasesArt9(anses257.texto)).toMatchObject({ minima: 144363.55, maxima: 4691748.47, periodo: "2026-09" });
    expect(extraerBasesArt9(anses257.texto).cita).toMatch(/^bases imponibles mínima y máxima/);
  });

  it("una Resolución de ANSES que habla de otra cosa no da bases", () => {
    expect(extraerBasesArt9(anses260.texto)).toBeNull();
    expect(extraerBasesArt9("")).toBeNull();
  });

  it("no acepta una mínima mayor que la máxima ni un mes que no existe", () => {
    const texto = "bases imponibles mínima y máxima en las sumas de PESOS ($5.000.000,00) y PESOS ($100,00), a partir del período devengado septiembre de 2026.";
    expect(extraerBasesArt9(texto)).toBeNull();
    expect(extraerBasesArt9("bases imponibles mínima y máxima de PESOS ($1,00) y PESOS ($2,00) devengado marzolandia de 2026")).toBeNull();
  });
});

describe("el FFEP", () => {
  it("la Disposición SRT 8/2026 fija $1.905 para el devengado agosto 2026", () => {
    expect(mencionaFfep(srt8.texto)).toBe(true);
    expect(extraerFfep(srt8.texto)).toMatchObject({ monto: 1905, periodo: "2026-08" });
    // No se confunde con los importes del cálculo ($1.838,83 y $1.904,59).
    expect(extraerFfep(srt8.texto).cita).toContain("($ 1.905)");
  });

  it("la Disposición del Fondo de Garantía no es el FFEP", () => {
    expect(mencionaFfep(fondoGarantia.texto)).toBe(false);
    expect(extraerFfep(fondoGarantia.texto)).toBeNull();
  });

  it("una suma sólo para casas particulares no vale", () => {
    const texto = "FONDO FIDUCIARIO DE ENFERMEDADES PROFESIONALES. ARTÍCULO 1°.- Establécese que el valor de la suma fija prevista en el artículo 5° del Decreto N° 590 de fecha 30 de junio de 1997, será de PESOS CIEN ($ 100) para el devengado del mes de agosto de 2026 respecto del Régimen Especial de Casas Particulares.";
    expect(extraerFfep(texto)).toBeNull();
  });
});

describe("clasificar un aviso", () => {
  it("reconoce la Resolución de bases y la Disposición del FFEP, con el nombre de la norma", () => {
    expect(clasificarAviso(anses257)).toMatchObject({ tipo: "bases_art9", norma: "Resolución ANSES 257/2026", datos: { periodo: "2026-09" } });
    expect(clasificarAviso(srt8)).toMatchObject({ tipo: "ffep", norma: "Disposición SRT 8/2026", datos: { monto: 1905 } });
  });

  it("lo que no es dato pero habla de un tema a mirar sale como alerta, y el resto como nada", () => {
    expect(clasificarAviso(fondoGarantia)).toBeNull();
    expect(clasificarAviso(anses260)).toBeNull();
    const rg = { organismo: "AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO", titulo: "AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO Resolución General 5900/2026", texto: "Actualízanse las deducciones personales del artículo 30 de la Ley de Impuesto a las Ganancias para el segundo semestre." };
    expect(clasificarAviso(rg)).toEqual({ tipo: "alerta", temas: ["Ganancias, deducciones personales"], norma: "Resolución General ARCA 5900/2026" });
    const anses = { organismo: anses257.organismo, titulo: anses257.titulo, texto: "Establécense las bases imponibles para el régimen especial en una redacción nueva sin importes." };
    expect(clasificarAviso(anses)).toEqual({ tipo: "alerta", temas: ["bases imponibles del art. 9"], norma: "Resolución ANSES 257/2026" });
  });

  it("sólo se bajan enteros los avisos de ANSES, la SRT y ARCA; no los de la Secretaría de Trabajo ni los decretos", () => {
    for (const o of ["ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL", "SUPERINTENDENCIA DE RIESGOS DEL TRABAJO - GERENCIA DE CONTROL PRESTACIONAL", "AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO"]) {
      expect(ORGANISMOS_DE_INTERES.test(o), o).toBe(true);
    }
    // "SEGURIDAD SOCIAL" a secas matchearía las decenas de homologaciones diarias de la Secretaría de Trabajo.
    for (const o of ["SECRETARÍA DE TRABAJO, EMPLEO Y SEGURIDAD SOCIAL", "MINISTERIO DE CAPITAL HUMANO", "PODER EJECUTIVO", "ENTE NACIONAL REGULADOR DEL GAS Y LA ELECTRICIDAD"]) {
      expect(ORGANISMOS_DE_INTERES.test(o), o).toBe(false);
    }
    expect(nombreDeNorma({ organismo: "x", titulo: "sin número" })).toBe("sin número");
  });
});
