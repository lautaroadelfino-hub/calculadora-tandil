// scripts/fotoDelMotor.mjs
// Uso interno (dev): la "foto del motor". Corre procesarRecibo sobre miles de
// casos (los tres convenios de producción, la foto congelada de
// test/fixtures/patron y variantes de prueba que usan todas las opciones del
// vocabulario) y guarda cada recibo ENTERO, a precisión completa: cada línea
// con su detalle, `metodo`, avisos, Ganancias, el costo del empleador y los
// mensajes de error. Sirve para cambiar el motor sabiendo exactamente qué se
// movió: antes de tocarlo se saca una foto, después se compara, y tiene que
// dar cero diferencias salvo lo que el dueño decidió cambiar a propósito.
//
// Ejecutar:
//   node scripts/fotoDelMotor.mjs
//       Saca la foto y la guarda en respaldos/foto-motor/<commit>.ndjson
//       (<commit>-con-cambios si lib/ tiene cambios sin commitear).
//   node scripts/fotoDelMotor.mjs --comparar respaldos/foto-motor/<archivo>.ndjson
//       Saca la foto y la compara con esa. Sale con código 1 si hay diferencias.
//   --datos respaldos/<carpeta>   Otro respaldo como fuente (ver DATOS_POR_DEFECTO).
//
// Los datos de producción salen SIEMPRE de un respaldo fijo (respaldar.bat),
// no de test/fixtures: un respaldo no se modifica nunca, así que dos fotos
// sacadas con días de diferencia comparan el motor y no los datos. Las tablas
// de contribuciones y de Ganancias se eligen por período igual que la página
// (la exacta o la más reciente anterior).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import { normalizarEntradas } from "../lib/validacionEntradas.js";
import { valoresIniciales } from "../lib/inputsIniciales.js";
import { periodoDeTabla } from "../lib/periodos.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
// El respaldo del 15/10/2026, el primero que se sacó para esta foto. Si se
// cambia, las fotos viejas dejan de servir para comparar.
const DATOS_POR_DEFECTO = "respaldos/2026-10-15-184941";

const args = process.argv.slice(2);
const valorDe = (bandera) => {
  const i = args.indexOf(bandera);
  return i >= 0 ? args[i + 1] : null;
};
const carpetaDatos = resolve(RAIZ, valorDe("--datos") || DATOS_POR_DEFECTO);
const archivoAComparar = valorDe("--comparar");

const leerJson = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));
const sinRuta = ({ ruta, ...resto }) => resto;
const copia = (o) => JSON.parse(JSON.stringify(o));

// --- LOS DATOS ---

if (!existsSync(carpetaDatos)) {
  console.error(`No existe el respaldo ${carpetaDatos}. Corré respaldar.bat o pasá --datos.`);
  process.exit(1);
}
const respaldo = (coleccion) => leerJson(join(carpetaDatos, `${coleccion}.json`));
const tablasPorPeriodo = (coleccion) =>
  Object.fromEntries(respaldo(coleccion).map((d) => [d.ruta.split("/").pop(), sinRuta(d)]));
const tablasContribuciones = tablasPorPeriodo("parametros_contribuciones");
const tablasGanancias = tablasPorPeriodo("parametros_ganancias");
const seedContribuciones = leerJson(join(RAIZ, "data", "contribuciones.seed.json"));

const tablaDe = (tablas, periodo) => {
  const { periodo: elegido } = periodoDeTabla(Object.keys(tablas), periodo);
  return elegido ? { periodo: elegido, datos: tablas[elegido] } : { periodo: null, datos: null };
};

/** Los convenios de producción, con sus escalas por período. */
function conveniosDelRespaldo() {
  const escalas = respaldo("escalas");
  return respaldo("convenios").map((c) => {
    const id = c.ruta.split("/").pop();
    const susEscalas = {};
    for (const e of escalas) {
      const partes = e.ruta.split("/");
      if (partes[1] === id) susEscalas[partes[3]] = sinRuta(e);
    }
    return { id, convenio: sinRuta(c), escalas: susEscalas };
  });
}

/** La foto congelada del 13/9/2026 que usan los tests con pesos fijos. */
function conveniosDelPatron() {
  const dir = join(RAIZ, "test", "fixtures", "patron");
  return ["camioneros-cct-40-89", "comercio-cct-130-75", "gastronomicos-cct-389-04"].map((id) => ({
    id,
    convenio: leerJson(join(dir, `${id}.convenio.json`)),
    escalas: leerJson(join(dir, `${id}.escalas.json`)),
  }));
}

// --- LAS VARIANTES DE PRUEBA ---
// Cada una cambia una cosa de un convenio real para pasar por una opción del
// vocabulario que ningún convenio cargado usa hoy. No representan a nadie: lo
// que importa es que el motor siga haciendo lo mismo con ellas.

const multiplicarEscala = (escala, factor) => {
  const e = copia(escala);
  for (const cat of Object.values(e.categorias || {})) {
    for (const campo of ["basico", "no_remunerativo", "no_remunerativo_sin_incidencia"]) {
      if (typeof cat[campo] === "number") cat[campo] *= factor;
    }
  }
  for (const k of Object.keys(e.valores_del_periodo || {})) {
    if (typeof e.valores_del_periodo[k] === "number") e.valores_del_periodo[k] *= factor;
  }
  return e;
};

function variantesDePrueba(produccion) {
  const de = (id) => produccion.find((c) => c.id === id);
  const ultimaEscala = (c) => {
    const periodo = Object.keys(c.escalas).sort().pop();
    return { [periodo]: c.escalas[periodo] };
  };
  const variante = (nombre, base, cambiar, cambiarEscala = (e) => e) => {
    const convenio = copia(base.convenio);
    cambiar(convenio.reglas_calculo, convenio);
    const escalas = Object.fromEntries(Object.entries(ultimaEscala(base)).map(([p, e]) => [p, cambiarEscala(copia(e))]));
    return { id: `${base.id}~${nombre}`, convenio, escalas };
  };
  const comercio = de("comercio-cct-130-75");
  const camioneros = de("camioneros-cct-40-89");
  const gastronomicos = de("gastronomicos-cct-389-04");

  return [
    variante("presentismo-sobre-basico", comercio, (r) => { r.presentismo.aplica_sobre = "basico"; }),
    variante("presentismo-sin-aplica-sobre", comercio, (r) => { delete r.presentismo.aplica_sobre; }),
    variante("nr-no-genera-adicionales", comercio, (r) => { r.no_remunerativo_genera_adicionales = false; }),
    variante("jornada-44-192", comercio, (r) => { r.jornada = { horas_semanales_completas: 44, divisor_horas_mensuales: 192 }; }),
    variante("antiguedad-diferida-presentismo-basico", comercio, (r) => {
      r.antiguedad.aplica_sobre = "basico_mas_adicionales";
      r.presentismo.aplica_sobre = "basico";
    }),
    // Las dos que siguen tienen que frenar (o no) como hoy: el freno de la línea 337.
    variante("antiguedad-diferida-presentismo-bma", comercio, (r) => {
      r.antiguedad.aplica_sobre = "basico_mas_adicionales";
      r.presentismo.aplica_sobre = "basico_mas_antiguedad";
    }),
    variante("antiguedad-diferida-presentismo-sin-aplica-sobre", comercio, (r) => {
      r.antiguedad.aplica_sobre = "basico_mas_adicionales";
      delete r.presentismo.aplica_sobre;
    }),
    variante("adicionales-porcentuales", comercio, (r) => {
      r.adicionales_remunerativos = {
        sint_bma: { label: "Adicional de prueba s/ básico + antigüedad (5%)", porcentaje: 0.05, aplica_sobre: "basico_mas_antiguedad" },
        sint_no_afiliado: { label: "Adicional de prueba si no es afiliado (3%)", porcentaje: 0.03, aplica_sobre: "basico", depende_de: "afiliado_sindicato", cuando: false },
      };
    }),
    variante("adicional-sobre-antiguedad-con-antiguedad-diferida", comercio, (r) => {
      r.antiguedad.aplica_sobre = "basico_mas_adicionales";
      r.presentismo.aplica_sobre = "basico";
      r.adicionales_remunerativos = { sint_bma: { label: "Circular", porcentaje: 0.05, aplica_sobre: "basico_mas_antiguedad" } };
    }),
    variante("retenciones-todas-las-bases", comercio, (r) => {
      r.retenciones_sindicales = {
        ...r.retenciones_sindicales,
        sint_rem: { label: "Prueba s/ remunerativo (1%)", porcentaje: 0.01, base: "remunerativo" },
        sint_hab: { label: "Prueba s/ habitual (1%)", porcentaje: 0.01, base: "remunerativo_habitual", condicion: "siempre" },
        sint_nr: { label: "Prueba s/ no remunerativo (1%)", porcentaje: 0.01, base: "no_remunerativo", condicion: "solo_afiliado" },
        sint_fijo: { label: "Prueba fija", valor_fijo: 1500, rubro: "otros" },
        sint_os: { label: "Prueba que reemplaza la obra social (2,7%)", porcentaje: 0.027, base: "remunerativo_mas_no_remunerativo", reemplaza_obra_social: true, rubro: "obra_social" },
      };
    }),
    variante("contribuciones-de-convenio", comercio, (r) => {
      r.contribuciones_convenio = {
        sint_rem: { label: "Contribución de prueba s/ remunerativo (1%)", porcentaje: 0.01, base: "remunerativo", rubro: "camaras" },
        sint_total: { label: "Contribución de prueba s/ total (0,5%)", porcentaje: 0.005, base: "remunerativo_mas_no_remunerativo", rubro: "sindical" },
        sint_basico: { label: "Contribución de prueba s/ básico (2%)", porcentaje: 0.02, base: "basico", rubro: "otros" },
        sint_fija: { label: "Contribución de prueba fija", valor_fijo: 2500, rubro: "otros" },
      };
    }),
    variante(
      "por-unidad-todas-las-unidades",
      comercio,
      (r, c) => {
        r.adicionales_por_unidad = {
          sint_mes: { label: "Premio de prueba mensual", valor: "sint_mes", unidad: "mes", naturaleza: "remunerativo" },
          sint_dia: { label: "Viático de prueba con incidencia", valor: "sint_dia", unidad: "dia", naturaleza: "no_remunerativo", con_incidencia: true, cantidad_de: "sint_dias" },
          sint_viaje: { label: "Viaje de prueba", valor: "sint_viaje", unidad: "viaje", naturaleza: "remunerativo", cantidad_de: "sint_viajes" },
          sint_km: { label: "Km de prueba sin incidencia", valor: "sint_km", unidad: "km", naturaleza: "no_remunerativo", cantidad_de: "sint_km", depende_de: "afiliado_sindicato", cuando: false },
        };
        c.inputs_requeridos = [
          ...c.inputs_requeridos,
          { id: "sint_dias", tipo: "number", label: "Días de prueba", default: 20 },
          { id: "sint_viajes", tipo: "number", label: "Viajes de prueba", default: 3 },
          { id: "sint_km", tipo: "number", label: "Km de prueba", default: 1000 },
        ];
      },
      (e) => ({ ...e, valores_del_periodo: { ...(e.valores_del_periodo || {}), sint_mes: 60000, sint_dia: 5000, sint_viaje: 12000, sint_km: 55.5 } })
    ),
    variante("antiguedad-sobre-basico", camioneros, (r) => { r.antiguedad.aplica_sobre = "basico"; }),
    variante("nr-genera-adicionales", gastronomicos, (r) => { delete r.no_remunerativo_genera_adicionales; }),
    variante("antiguedad-lineal", gastronomicos, (r) => { r.antiguedad = { porcentaje_por_año: 0.01 }; }),
    variante("presentismo", gastronomicos, (r) => { r.presentismo = { porcentaje: 0.08333, aplica_sobre: "basico_mas_antiguedad" }; }),
    // Sueldos que pasan el tope del art. 9 y entran fuerte en Ganancias.
    ...produccion.map((c) => variante("escala-por-cuatro", c, () => {}, (e) => multiplicarEscala(e, 4))),
  ];
}

// --- LOS CASOS ---

const claves = (escala) => Object.keys(escala.categorias || {});

/** Las categorías que se prueban con todas las variantes: primera, del medio, última y la de básico más alto. */
function categoriasRepresentativas(escala) {
  const ks = claves(escala);
  if (!ks.length) return [];
  const masAlta = ks.reduce((a, b) => (Number(escala.categorias[b].basico) > Number(escala.categorias[a].basico) ? b : a));
  return [...new Set([ks[0], ks[Math.floor(ks.length / 2)], ks[ks.length - 1], masAlta])];
}

/** De "Escala A|Nivel 1" a { zona, categoria }, si el convenio pregunta la zona. */
function entradaDeClave(convenio, clave) {
  const preguntaZona = (convenio.inputs_requeridos || []).some((i) => i.id === "zona");
  if (preguntaZona && clave.includes("|")) {
    const [zona, categoria] = clave.split("|");
    return { zona, categoria };
  }
  return { categoria: clave };
}

function variantesDeEntrada(convenio, tablaContribuciones) {
  const inputs = convenio.inputs_requeridos || [];
  const tiene = (id) => inputs.some((i) => i.id === id);
  const completa = Number(convenio.reglas_calculo?.jornada?.horas_semanales_completas) || 48;
  const v = [
    ["default", {}],
    ["antiguedad-1", { antiguedad_años: 1 }],
    ["antiguedad-5", { antiguedad_años: 5 }],
    ["antiguedad-10", { antiguedad_años: 10 }],
    ["antiguedad-25", { antiguedad_años: 25 }],
    ["jornada-20", { carga_horaria: 20 }],
    ["jornada-30-antiguedad-7", { carga_horaria: 30, antiguedad_años: 7 }],
    ["jornada-de-mas", { carga_horaria: completa + 12 }],
    ["horas-50", { horas_extras_50: 10 }],
    ["horas-100", { horas_extras_100: 8 }],
    ["horas-ambas-antiguedad-10", { horas_extras_50: 5, horas_extras_100: 5, antiguedad_años: 10 }],
    ["sac", { incluir_sac: true }],
    ["vacaciones-14", { dias_vacaciones: 14 }],
    ["sac-vacaciones-antiguedad-10", { incluir_sac: true, dias_vacaciones: 14, antiguedad_años: 10 }],
    ["afiliado", { afiliado_sindicato: true }],
    ["cargas-de-familia", { conyuge: true, hijos: 2, hijos_incapacitados: 1 }],
    ["sac-ganancias-al-cobrar", { incluir_sac: true, ganancias_sac: "al_cobrar" }],
    ["art-vacia", { art_alicuota: "" }],
    ["art-suma-fija", { art_suma_fija: 5000 }],
    ["sueldo-alto", { antiguedad_años: 25, horas_extras_50: 30, horas_extras_100: 40, incluir_sac: true, conyuge: true, hijos: 2 }],
    ["sueldo-alto-al-cobrar", { antiguedad_años: 25, horas_extras_50: 30, horas_extras_100: 40, incluir_sac: true, ganancias_sac: "al_cobrar" }],
    ["todo", { antiguedad_años: 10, carga_horaria: 30, horas_extras_50: 5, horas_extras_100: 3, incluir_sac: true, dias_vacaciones: 14, conyuge: true, hijos: 1, ganancias_sac: "al_cobrar" }],
  ];
  for (const id of Object.keys(tablaContribuciones?.regimenes || {})) v.push([`regimen-${id}`, { regimen_contribuciones: id }]);
  // Las preguntas propias del convenio: cada sí/no al revés de como arranca.
  for (const i of inputs) {
    if (i.tipo === "boolean" && i.id !== "afiliado_sindicato") v.push([`${i.id}-${!i.default}`, { [i.id]: !i.default }]);
  }
  if (tiene("dias_trabajados")) v.push(["dias-0", { dias_trabajados: 0 }], ["dias-26", { dias_trabajados: 26 }]);
  if (tiene("pernoctes")) v.push(["pernoctes-3", { pernoctes: 3 }]);
  if (tiene("km_recorridos") && tiene("larga_distancia")) {
    v.push(
      ["km-8000", { larga_distancia: true, km_recorridos: 8000 }],
      ["km-8000-antiguedad-10", { larga_distancia: true, km_recorridos: 8000, antiguedad_años: 10 }],
      // El caso de la pregunta 1 del plan: antigüedad sobre km en el SAC, el
      // plus vacacional, la solidaria, la hora extra y la jornada parcial.
      ["km-8000-antiguedad-10-sac-vacaciones-horas-22", {
        larga_distancia: true, km_recorridos: 8000, antiguedad_años: 10, incluir_sac: true, dias_vacaciones: 14,
        horas_extras_50: 10, carga_horaria: 22, afiliado_sindicato: false,
      }],
      ["km-8000-afiliado-combustibles", { larga_distancia: true, km_recorridos: 8000, antiguedad_años: 10, afiliado_sindicato: true, combustibles: true }]
    );
  }
  return v;
}

function* casos() {
  const produccion = conveniosDelRespaldo();
  const grupos = [
    ["produccion", produccion, (p) => tablaDe(tablasContribuciones, p)],
    ["patron", conveniosDelPatron(), () => ({ periodo: "seed", datos: seedContribuciones })],
    ["prueba", variantesDePrueba(produccion), (p) => tablaDe(tablasContribuciones, p)],
  ];
  for (const [origen, convenios, contribucionesDe] of grupos) {
    for (const { id, convenio, escalas } of convenios) {
      for (const periodo of Object.keys(escalas).sort()) {
        const escala = escalas[periodo];
        const contrib = contribucionesDe(periodo);
        const ganancias = tablaDe(tablasGanancias, periodo);
        const todasLasVariantes = variantesDeEntrada(convenio, contrib.datos);
        const resumidas = todasLasVariantes.filter(([n]) => n === "default" || n === "todo");
        const representativas = new Set(categoriasRepresentativas(escala));
        for (const clave of claves(escala)) {
          const lista = representativas.has(clave) ? todasLasVariantes : resumidas;
          for (const [nombre, cambios] of lista) {
            yield {
              id: [origen, id, periodo, clave, nombre].join(" | "),
              convenio, escala, periodo, contrib, ganancias,
              valores: { ...valoresIniciales(convenio.inputs_requeridos), ...entradaDeClave(convenio, clave), ...cambios },
            };
          }
        }
      }
    }
  }
}

// --- CORRER Y GUARDAR ---

/** JSON con las claves ordenadas: así un cambio de orden no cuenta como diferencia. NaN e Infinity quedan escritos. */
function estable(valor) {
  if (typeof valor === "number" && !Number.isFinite(valor)) return `__${String(valor)}__`;
  if (Array.isArray(valor)) return valor.map(estable);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.keys(valor).sort().map((k) => [k, estable(valor[k])]));
  }
  return valor;
}

function correr(caso) {
  const revision = normalizarEntradas(caso.convenio, caso.valores, caso.periodo);
  if (revision.hayErrores) return { erroresDeEntrada: revision.errores };
  try {
    const recibo = procesarRecibo(caso.convenio, caso.escala, revision.valores, caso.ganancias.datos, {
      periodo: caso.periodo,
      tablaContribuciones: caso.contrib.datos,
      periodoContribuciones: caso.contrib.periodo,
    });
    return { recibo };
  } catch (err) {
    return { error: String(err && err.message ? err.message : err) };
  }
}

const sh = (cmd) => execSync(cmd, { cwd: RAIZ, encoding: "utf8" }).trim();
const commit = sh("git rev-parse --short HEAD");
const libLimpio = (() => {
  try { execSync("git diff --quiet HEAD -- lib/", { cwd: RAIZ }); return true; } catch { return false; }
})();

const lineas = [];
const fotoActual = new Map();
let errores = 0;
for (const caso of casos()) {
  const salida = correr(caso);
  if (salida.error) errores++;
  const texto = JSON.stringify(estable(salida));
  if (fotoActual.has(caso.id)) throw new Error(`Caso repetido: ${caso.id}`);
  fotoActual.set(caso.id, texto);
  lineas.push(JSON.stringify({ id: caso.id, salida: JSON.parse(texto) }));
}
const cabecera = { commit, libLimpio, datos: carpetaDatos.replace(RAIZ, "").replace(/^[\\/]/, ""), casos: fotoActual.size, conError: errores };

const dirFotos = join(RAIZ, "respaldos", "foto-motor");
mkdirSync(dirFotos, { recursive: true });
const nombre = `${commit}${libLimpio ? "" : "-con-cambios"}.ndjson`;
writeFileSync(join(dirFotos, nombre), [JSON.stringify(cabecera), ...lineas].join("\n") + "\n");
console.log(`Foto: ${fotoActual.size} casos (${errores} frenan con error, como corresponde a los casos que deben frenar).`);
console.log(`Guardada en respaldos/foto-motor/${nombre}${libLimpio ? "" : "  (OJO: lib/ tiene cambios sin commitear)"}`);

// --- COMPARAR ---

/** Las rutas donde dos valores difieren, hasta `max`. */
function diferencias(a, b, ruta = "", salida = [], max = 6) {
  if (salida.length >= max) return salida;
  if (JSON.stringify(a) === JSON.stringify(b)) return salida;
  const objeto = (x) => x && typeof x === "object";
  if (objeto(a) && objeto(b) && Array.isArray(a) === Array.isArray(b)) {
    const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of ks) diferencias(a[k], b[k], `${ruta}${Array.isArray(a) ? `[${k}]` : `.${k}`}`, salida, max);
    return salida;
  }
  salida.push(`${ruta || "(todo)"}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
  return salida;
}

if (archivoAComparar) {
  const [cabeceraVieja, ...resto] = readFileSync(resolve(RAIZ, archivoAComparar), "utf8").trim().split("\n");
  const vieja = JSON.parse(cabeceraVieja);
  if (vieja.datos !== cabecera.datos) {
    console.log(`OJO: la foto vieja usó otros datos (${vieja.datos}); las diferencias pueden ser de datos y no del motor.`);
  }
  const fotoVieja = new Map(resto.map((l) => { const { id, salida } = JSON.parse(l); return [id, salida]; }));
  const distintos = [];
  for (const [id, texto] of fotoActual) {
    if (!fotoVieja.has(id)) distintos.push({ id, que: ["caso nuevo (no estaba en la foto vieja)"] });
    else if (JSON.stringify(fotoVieja.get(id)) !== texto) distintos.push({ id, que: diferencias(fotoVieja.get(id), JSON.parse(texto)) });
  }
  for (const id of fotoVieja.keys()) if (!fotoActual.has(id)) distintos.push({ id, que: ["caso que ya no está"] });
  console.log(`\nComparada con ${archivoAComparar} (commit ${vieja.commit}): ${distintos.length} caso(s) distinto(s) de ${fotoActual.size}.`);
  for (const d of distintos.slice(0, 25)) {
    console.log(`\n- ${d.id}`);
    for (const q of d.que) console.log(`    ${q}`);
  }
  if (distintos.length > 25) console.log(`\n… y ${distintos.length - 25} más.`);
  process.exit(distintos.length ? 1 : 0);
}
