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
  antiguedadBase: "basico_mas_adicionales",
  porUnidad: [
    { label: "Comida", valor: "comida", unidad: "dia", naturaleza: "no_remunerativo", conIncidencia: false, cantidadDe: "dias_trabajados", preguntaCantidad: "Días trabajados", cantidadPorDefecto: 22, condicional: true, dependeDe: "larga_distancia", pregunta: "¿Larga distancia?", preguntaPorDefecto: false, cuando: "no" },
    { label: "Kilómetros", valor: "km", unidad: "km", naturaleza: "remunerativo", cantidadDe: "km_recorridos", preguntaCantidad: "Km recorridos", cantidadPorDefecto: 0, condicional: true, dependeDe: "larga_distancia", pregunta: "¿Larga distancia?", preguntaPorDefecto: false, cuando: "si" },
    { label: "Bitrenes", valor: "bitrenes", unidad: "mes", naturaleza: "remunerativo" },
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

describe("5. todo lo que el modelo declara sobrevive a guardarlo desde el panel", () => {
  // El chequeo 1 mira que el panel no guarde nada de más. Este mira lo
  // contrario: que lo que el modelo declara siga ahí después de abrir el
  // convenio en /admin y guardarlo. Al guardar, el formulario vuelve a armar
  // las reglas con los campos que conoce, así que un campo que el motor entiende
  // y el panel no se pierde en silencio. Se agregó el 15/10/2026, antes de
  // sumarle campos al convenio (plan de A11–A14).

  // Lo que hoy el panel todavía no sabe guardar. Ningún convenio cargado lo
  // usa, y está anotado en docs/criterio.md ("Lo que todavía NO cumple este
  // criterio"). Cuando el panel aprenda a guardarlo, el test avisa para sacarlo.
  const PENDIENTES_DEL_PANEL = [
    // El panel cuelga un adicional sólo de su propia pregunta, y sólo por el "sí".
    "adicionales_remunerativos.*.depende_de",
    "adicionales_remunerativos.*.cuando",
    // A las retenciones el panel les ofrece sólo la afiliación (`condicion`).
    "retenciones_sindicales.*.depende_de",
    "retenciones_sindicales.*.cuando",
  ];

  const preguntas = [
    { id: "categoria", tipo: "select", label: "Categoría", default: "A", opciones: ["A"] },
    { id: "afiliado_sindicato", tipo: "boolean", label: "Afiliado al Sindicato", default: false },
    { id: "pregunta_x", tipo: "boolean", label: "¿Pregunta X?", default: false },
    { id: "cantidad_x", tipo: "number", label: "Cantidad X", default: 1 },
  ];
  const comunes = {
    jornada: { horas_semanales_completas: 44, divisor_horas_mensuales: 192 },
    presentismo: { porcentaje: 0.08333, aplica_sobre: "basico" },
    retenciones_sindicales: {
      ret_pct: { label: "Ret pct", porcentaje: 0.01, base: "remunerativo_habitual", condicion: "solo_afiliado", depende_de: "pregunta_x", cuando: true, rubro: "otros" },
      ret_fija: { label: "Ret fija", valor_fijo: 100, rubro: "obra_social", reemplaza_obra_social: true },
    },
    contribuciones_convenio: {
      con_pct: { label: "Con pct", porcentaje: 0.01, base: "basico", rubro: "camaras" },
      con_fija: { label: "Con fija", valor_fijo: 100, rubro: "otros" },
    },
    art: { alicuota_tipica: 0.04 },
    adicionales_por_unidad: {
      pu_x: { label: "PU X", valor: "pu_x", unidad: "viaje", naturaleza: "no_remunerativo", con_incidencia: true, cantidad_de: "cantidad_x", depende_de: "pregunta_x", cuando: false },
    },
  };
  // Dos documentos, porque la antigüedad lineal y por tramos no conviven en uno.
  const documentos = {
    "por tramos, sobre básico más adicionales": {
      ...comunes,
      no_remunerativo_genera_adicionales: false,
      antiguedad: { modo: "tramos", tramos: [{ desde_años: 1, porcentaje: 0.01 }, { desde_años: 5, porcentaje: 0.04 }], aplica_sobre: "basico_mas_adicionales" },
      adicionales_remunerativos: { ad_x: { label: "Ad X", porcentaje: 0.05, aplica_sobre: "basico", depende_de: "pregunta_x", cuando: false } },
    },
    "lineal, sobre el básico": {
      ...comunes,
      antiguedad: { porcentaje_por_año: 0.01 },
      adicionales_remunerativos: { ad_y: { label: "Ad Y", porcentaje: 0.05, aplica_sobre: "basico_mas_antiguedad" } },
    },
  };
  const docDe = (reglas) => ({ id: "zz-completo", nombre: "Completo", cct: "1/1", activo: true, sector: "privado", inputs_requeridos: preguntas, reglas_calculo: reglas });

  /** Las rutas del modelo cuyo valor no llegó igual después de guardar. */
  function perdidos(antes, despues) {
    const mismo = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const fuera = [];
    for (const [regla, forma] of Object.entries(REGLAS_DE_CALCULO)) {
      const a = antes[regla];
      const b = despues[regla];
      if (a === undefined) continue;
      if (!a || typeof a !== "object") {
        if (!mismo(a, b)) fuera.push(regla);
        continue;
      }
      const items = forma.porCada ? Object.entries(a) : [[null, a]];
      for (const [id, item] of items) {
        const otro = (id ? (b || {})[id] : b) || {};
        for (const campo of forma.porCada || forma.campos) {
          if (item[campo] !== undefined && !mismo(item[campo], otro[campo])) fuera.push(id ? `${regla}.*.${campo}` : `${regla}.${campo}`);
        }
      }
    }
    return fuera;
  }

  it("los documentos de prueba usan todo lo que el modelo declara", () => {
    // Si alguien suma un campo al modelo, tiene que sumarlo acá: si no, este
    // chequeo no lo estaría mirando.
    const usadas = new Set(Object.values(documentos).flatMap((r) => rutasDe(r)));
    const sinProbar = MODELO.filter((r) => !usadas.has(r));
    expect(sinProbar, sinProbar.length ? "\nSumalos a los documentos de este chequeo:\n" + sinProbar.join("\n") : "").toEqual([]);
  });

  it.each(Object.keys(documentos))("antigüedad %s: no se pierde nada al guardar", (nombre) => {
    const doc = docDe(documentos[nombre]);
    const guardado = formToConvenio(convenioToForm(doc), doc);
    const fuera = perdidos(doc.reglas_calculo, guardado.reglas_calculo).filter((r) => !PENDIENTES_DEL_PANEL.includes(r));
    expect(
      fuera,
      fuera.length
        ? "\nEstos campos se pierden al guardar el convenio desde /admin:\n" + fuera.map((r) => "   reglas_calculo." + r).join("\n") +
          "\n\nO el formulario los aprende a guardar (lib/convenioForm.js), o no se pueden ofrecer.\n"
        : ""
    ).toEqual([]);
  });

  it("los pendientes anotados siguen pendientes (si ya se guardan, sacarlos de la lista)", () => {
    const seSiguenPerdiendo = new Set(
      Object.values(documentos).flatMap((reglas) => {
        const doc = docDe(reglas);
        return perdidos(doc.reglas_calculo, formToConvenio(convenioToForm(doc), doc).reglas_calculo);
      })
    );
    const yaSeGuardan = PENDIENTES_DEL_PANEL.filter((r) => !seSiguenPerdiendo.has(r));
    expect(yaSeGuardan, yaSeGuardan.length ? "\nYa se guardan: sacalos de PENDIENTES_DEL_PANEL y de docs/criterio.md:\n" + yaSeGuardan.join("\n") : "").toEqual([]);
  });
});
