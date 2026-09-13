// test/vocabulario.test.js
//
// LA REGLA QUE ESTE TEST HACE CUMPLIR:
//   Lo que el panel guarda, lo que el motor lee y lo que dice el modelo
//   (lib/vocabularioConvenios.js) tienen que ser la misma cosa.
//
// POR QUÉ EXISTE: es el error más caro y más repetido del proyecto, y ya pasó
// tres veces, siempre igual — alguien agrega un campo de un lado, el otro lado
// no se entera, y el convenio se guarda "bien" pero liquida mal EN SILENCIO:
//   1. `aplica_sobre` del presentismo: el panel lo guardaba desde julio de 2026
//      y el motor lo ignoraba, usando siempre una base fija.
//   2. `adicionales_remunerativos`: el motor los procesaba y el formulario no
//      los sabía crear, así que un convenio nuevo no podía tenerlos.
//   3. `aplica_sobre` de la antigüedad: se guardaba y nadie lo leía jamás. Como
//      el valor coincidía con lo que el motor hace, no molestaba — hasta que
//      alguien cargara un convenio que calculara distinto.
//
// Son tres chequeos separados porque son tres problemas distintos, con tres
// culpables distintos y tres arreglos distintos.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { REGLAS_DE_CALCULO, camposDelModelo } from "../lib/vocabularioConvenios.js";
import { formToConvenio, convenioToForm } from "../lib/convenioForm.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const fuenteDelMotor = readFileSync(join(raiz, "lib/motorLiquidacion.js"), "utf8");
const MODELO = camposDelModelo();

const dirFixtures = join(raiz, "test/fixtures");
const convenios = readdirSync(dirFixtures)
  .filter((f) => f.endsWith(".convenio.json"))
  .map((f) => ({
    id: f.replace(".convenio.json", ""),
    doc: JSON.parse(readFileSync(join(dirFixtures, f), "utf8")),
  }));

const esLista = (regla) => Boolean(REGLAS_DE_CALCULO[regla]?.porCada);

/**
 * Convierte un `reglas_calculo` en la lista de rutas que usa el modelo.
 * Los nombres que pone el usuario (cada adicional, cada retención) se
 * reemplazan por "*", porque lo que se verifica es la FORMA, no los nombres.
 */
function rutasDe(reglas = {}) {
  const rutas = [];

  const recorrer = (valor, prefijo) => {
    if (Array.isArray(valor)) {
      valor.forEach((v) => recorrer(v, `${prefijo}[]`));
      return;
    }
    if (!valor || typeof valor !== "object") return;
    for (const clave of Object.keys(valor)) {
      rutas.push(`${prefijo}.${clave}`);
      recorrer(valor[clave], `${prefijo}.${clave}`);
    }
  };

  for (const regla of Object.keys(reglas)) {
    rutas.push(regla);
    if (esLista(regla)) {
      for (const item of Object.values(reglas[regla] || {})) recorrer(item, `${regla}.*`);
    } else {
      recorrer(reglas[regla], regla);
    }
  }
  return [...new Set(rutas)];
}

const formularioValido = {
  id: "zz-prueba", nombre: "Prueba", cct: "1/1", activo: true, sector: "privado",
  antiguedadModo: "tramos",
  antiguedadTramos: [{ desdeAños: 1, porcentajePct: 1 }, { desdeAños: 5, porcentajePct: 4 }],
  presentismoPct: 8.333, presentismoBase: "basico",
  adicionales: [{ label: "Plus", valorPct: 10, base: "basico_mas_antiguedad" }],
  retenciones: [
    { label: "Cuota", tipoValor: "porcentaje", valor: 2, base: "remunerativo", condicion: "solo_afiliado" },
    { label: "Fija", tipoValor: "fijo", valor: 1500 },
    { label: "OS gremial", tipoValor: "porcentaje", valor: 3, reemplazaObraSocial: true },
  ],
  artAlicuotaTipicaPct: 3,
  contribuciones: [
    { label: "Aporte a la cámara", tipoValor: "porcentaje", valor: 1, base: "remunerativo", rubro: "camaras" },
    { label: "Fondo convencional", tipoValor: "fijo", valor: 500, rubro: "otros" },
  ],
};

// ---------------------------------------------------------------------------

describe("1. el panel no puede guardar nada que el modelo no declare", () => {
  // Este es el chequeo más importante, porque falla en el momento exacto en que
  // alguien agrega un campo al formulario y se olvida de declararlo.
  it("un convenio con TODAS las reglas puestas sólo produce campos del modelo", () => {
    const doc = formToConvenio(formularioValido);
    const fuera = rutasDe(doc.reglas_calculo).filter((r) => !MODELO.includes(r));

    expect(
      fuera,
      fuera.length
        ? "\nEl formulario guarda estos campos y el modelo no los declara:\n" +
          fuera.map((r) => "   reglas_calculo." + r).join("\n") +
          "\n\nAgregalos a lib/vocabularioConvenios.js, o dejá de guardarlos.\n"
        : ""
    ).toEqual([]);
  });

  it("y la ida y vuelta por el formulario tampoco los inventa", () => {
    const doc = formToConvenio(formularioValido);
    const vuelta = formToConvenio(convenioToForm(doc), doc);
    const fuera = rutasDe(vuelta.reglas_calculo).filter((r) => !MODELO.includes(r));
    expect(fuera).toEqual([]);
  });
});

describe("2. el motor tiene que leer todo lo que el modelo declara", () => {
  // Si un campo está declarado y el motor ni lo nombra, es un campo muerto:
  // el panel lo va a aceptar y el recibo lo va a ignorar.
  const campos = [...new Set(MODELO.map((r) => r.split(/[.[]/).pop().replace(/\]/g, "")))];

  it.each(campos)("el motor nombra '%s'", (campo) => {
    expect(
      new RegExp(`\\b${campo}\\b`).test(fuenteDelMotor),
      `El modelo declara "${campo}" pero lib/motorLiquidacion.js no lo nombra nunca. ` +
        `O el motor lo tiene que leer, o hay que sacarlo del modelo.`
    ).toBe(true);
  });
});

describe("3. el motor no adivina: si no entiende una palabra, frena", () => {
  it("el error nombra el valor que no entendió", () => {
    expect(fuenteDelMotor).toMatch(/que el motor no conoce/);
  });

  it("no quedan valores por defecto silenciosos", () => {
    // Los dos que hubo, escritos tal cual estaban. Con ellos, un convenio mal
    // cargado se liquidaba "como un Comercio disfrazado" sin que nadie lo notara.
    expect(fuenteDelMotor).not.toMatch(/porcentaje_por_año \|\| 0\.01/);
    expect(fuenteDelMotor).not.toMatch(/porcentaje \|\| 0\.08333/);
  });

  it("todas las opciones que el modelo declara están escritas en el motor", () => {
    const faltan = [];
    for (const [regla, forma] of Object.entries(REGLAS_DE_CALCULO)) {
      for (const [campo, opciones] of Object.entries(forma.opcionesDe || {})) {
        for (const opcion of opciones) {
          if (!fuenteDelMotor.includes(opcion)) faltan.push(`${regla}.${campo} = "${opcion}"`);
        }
      }
      // Una lista con nombre se verifica por el nombre: el motor la importa y
      // frena con cualquier valor que no esté en ella.
      for (const [campo, nombreLista] of Object.entries(forma.opcionesDeLista || {})) {
        if (!fuenteDelMotor.includes(nombreLista)) faltan.push(`${regla}.${campo} (la lista ${nombreLista})`);
      }
    }
    expect(faltan, faltan.length ? "\nEl motor no conoce estas opciones:\n" + faltan.join("\n") : "").toEqual([]);
  });
});

describe("4. lo que está guardado en la base, hoy", () => {
  // Esto NO falla: es un dato viejo en Firestore, no un error de código, y no se
  // arregla con un deploy. Se limpia solo la próxima vez que guardes ese
  // convenio desde /admin, porque el formulario ya no escribe esos campos.
  it("informa qué campos viejos quedaron dando vueltas", () => {
    const sobrantes = convenios.flatMap(({ id, doc }) =>
      rutasDe(doc.reglas_calculo).filter((r) => !MODELO.includes(r)).map((r) => ({ id, ruta: r }))
    );

    for (const s of sobrantes) {
      console.warn(
        `[dato viejo en Firestore] ${s.id}: reglas_calculo.${s.ruta} ya no lo escribe nadie ` +
          `y el motor no lo lee. Se limpia al abrir ese convenio en /admin y guardarlo.`
      );
    }
    expect(Array.isArray(sobrantes)).toBe(true);
  });
});
