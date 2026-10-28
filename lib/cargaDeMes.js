// lib/cargaDeMes.js
// El plan de una carga desde archivos: qué documentos se escribirían en
// Firestore para publicar las escalas (y la tabla de contribuciones) que
// describe un carga.json, con las mismas revisiones que hace el panel antes
// de publicar. No lee ni escribe nada: recibe lo que hay en la base y los
// textos de los CSV, y devuelve los documentos, los avisos y los errores.
// scripts/cargarMes.mjs hace la parte de leer y escribir.
//
// El carga.json tiene esta forma (las claves que empiezan con "_" se ignoran):
//
//   {
//     "convenio": "comercio-cct-130-75",
//     "escalas": {
//       "2026-10": { "csv": "comercio-2026-10.csv", "mes_vigencia": "Octubre 2026",
//                    "nombre_sin_incidencia": "Asignación …", "valores_del_periodo": { "km": 123 } }
//     },
//     "contribuciones": {
//       "2026-10": { "vigencia": "Octubre 2026", "ffep": 1971, "bases_art9": { "minima": 1, "maxima": 2 } }
//     }
//   }
//
// Cada escala es el CSV del panel. `mes_vigencia` y `vigencia` se pueden
// omitir: salen del período ("Octubre 2026"). La tabla de contribuciones de
// un mes es la última cargada antes de ese mes con el FFEP (y las bases del
// art. 9, si vienen) reemplazados: la arma armarTablaDelMes
// (lib/vigia/contribuciones.js), la misma función del botón "Copiar del mes
// anterior" de la pestaña Contribuciones y del vigía, partiendo de la tabla
// que el dueño ya revisó.

import { parsearCsvEscala, revisarEscalaAntesDePublicar, validarPeriodo } from "./escalaCsv.js";
import { documentoDeEscala, convenioConEscala, CAMPOS_DEL_CONVENIO_AL_PUBLICAR } from "./publicarEscala.js";
import { tituloDePeriodo } from "./periodos.js";
import { armarTablaDelMes, ffepDe } from "./vigia/contribuciones.js";

const entradas = (obj) => Object.entries(obj || {}).filter(([k]) => !k.startsWith("_")).sort(([a], [b]) => a.localeCompare(b));

/**
 * @param {object} manifiesto         el carga.json ya leído.
 * @param {Object<string,string>} csv  texto de cada CSV, por nombre de archivo.
 * @param {object} convenio           el documento del convenio tal como está en Firestore.
 * @param {Object<string,object>} escalasVivas   las escalas del convenio en Firestore, por período.
 * @param {Object<string,object>} contribucionesVivas  las tablas de parametros_contribuciones, por período.
 * @returns {{ errores: string[], avisos: string[], escritos: Array<{ruta:string, campos:object, mascara?:string[], reemplaza:boolean, titulo:string}> }}
 */
export function planDeCarga({ manifiesto, csv = {}, convenio, escalasVivas = {}, contribucionesVivas = {} }) {
  const errores = [];
  const avisos = [];
  const escritos = [];

  const periodosEscalas = entradas(manifiesto?.escalas);
  const periodosContribuciones = entradas(manifiesto?.contribuciones);
  if (!periodosEscalas.length && !periodosContribuciones.length) {
    errores.push("El carga.json no tiene ni escalas ni contribuciones para publicar.");
    return { errores, avisos, escritos };
  }

  if (periodosEscalas.length) {
    if (!manifiesto.convenio) errores.push('El carga.json no dice el "convenio" al que pertenecen las escalas.');
    else if (!convenio) errores.push(`El convenio "${manifiesto.convenio}" no existe en la base.`);
  }

  // Las escalas, en orden: noviembre se compara con el octubre que se está
  // por publicar, no con el septiembre que hay en la base.
  const previas = { ...escalasVivas };
  let convenioActual = convenio;
  for (const [periodo, entrada] of periodosEscalas) {
    const prefijo = `Escala ${periodo}`;
    const problemaPeriodo = validarPeriodo(periodo);
    if (problemaPeriodo) { errores.push(`${prefijo}: ${problemaPeriodo}`); continue; }
    if (!convenio) continue;

    const texto = entrada && entrada.csv ? csv[entrada.csv] : undefined;
    if (texto == null) { errores.push(`${prefijo}: falta el archivo "${entrada && entrada.csv}".`); continue; }

    const leido = parsearCsvEscala(texto);
    leido.errores.forEach((e) => errores.push(`${prefijo}: ${e}`));
    leido.advertencias.forEach((a) => avisos.push(`${prefijo}: ${a}`));
    if (leido.errores.length) continue;

    const mesVigencia = String(entrada.mes_vigencia || tituloDePeriodo(periodo)).trim();
    if (!mesVigencia) { errores.push(`${prefijo}: no se pudo armar el nombre descriptivo del período.`); continue; }

    const nombreSinIncidencia = String(entrada.nombre_sin_incidencia || "").trim();
    const traeSinIncidencia = leido.claves.some((c) => Number(leido.sueldos[c].no_remunerativo_sin_incidencia) > 0);
    if (traeSinIncidencia && !nombreSinIncidencia) {
      errores.push(`${prefijo}: el CSV trae importes en no_remunerativo_sin_incidencia pero el carga.json no dice "nombre_sin_incidencia" (es como aparece en el recibo).`);
      continue;
    }
    if (!traeSinIncidencia && nombreSinIncidencia) {
      avisos.push(`${prefijo}: tiene "nombre_sin_incidencia" pero ninguna categoría trae esa suma; el nombre se guarda igual y no se muestra.`);
    }

    const valoresDelPeriodo = {};
    for (const [clave, valor] of Object.entries(entrada.valores_del_periodo || {})) {
      if (!Number.isFinite(Number(valor))) { errores.push(`${prefijo}: el valor del período "${clave}" no es un número: ${valor}`); continue; }
      valoresDelPeriodo[clave] = Number(valor);
    }

    const existente = previas[periodo];
    const anteriores = Object.keys(previas).filter((p) => p < periodo).sort();
    const periodoAnterior = anteriores[anteriores.length - 1];
    const revision = revisarEscalaAntesDePublicar({
      claves: leido.claves,
      sueldos: leido.sueldos,
      clavesPrevias: Object.keys((existente && existente.categorias) || {}),
      convenio: convenioActual,
      valoresDelPeriodo,
      escalaAnterior: periodoAnterior ? { periodo: periodoAnterior, ...previas[periodoAnterior] } : null,
    });
    revision.errores.forEach((e) => errores.push(`${prefijo}: ${e}`));
    revision.advertencias.forEach((a) => avisos.push(`${prefijo}: ${a}`));
    if (revision.errores.length) continue;

    const escala = documentoDeEscala({ claves: leido.claves, sueldos: leido.sueldos, mesVigencia, nombreSinIncidencia, valoresDelPeriodo });
    convenioActual = convenioConEscala(convenioActual, leido.claves, periodo, mesVigencia);
    previas[periodo] = escala;
    escritos.push({
      ruta: `convenios/${manifiesto.convenio}/escalas/${periodo}`,
      campos: escala,
      reemplaza: Boolean(existente),
      titulo: `escala ${periodo} "${mesVigencia}" (${leido.claves.length} categorías${nombreSinIncidencia ? ", con suma sin incidencia" : ""})`,
    });
  }

  if (convenio && escritos.length) {
    const campos = {};
    for (const c of CAMPOS_DEL_CONVENIO_AL_PUBLICAR) campos[c] = convenioActual[c];
    escritos.push({
      ruta: `convenios/${manifiesto.convenio}`,
      campos,
      mascara: [...CAMPOS_DEL_CONVENIO_AL_PUBLICAR],
      reemplaza: true,
      titulo: `convenio ${manifiesto.convenio}: escalas hasta ${convenioActual.ultimo_periodo} "${convenioActual.ultimo_periodo_nombre}"`,
    });
  }

  for (const [periodo, entrada] of periodosContribuciones) {
    const prefijo = `Contribuciones ${periodo}`;
    const problemaPeriodo = validarPeriodo(periodo);
    if (problemaPeriodo) { errores.push(`${prefijo}: ${problemaPeriodo}`); continue; }

    const anteriores = Object.keys(contribucionesVivas).filter((p) => p < periodo).sort();
    const base = anteriores.length ? contribucionesVivas[anteriores[anteriores.length - 1]] : null;
    if (!base) { errores.push(`${prefijo}: no hay ninguna tabla de contribuciones anterior en la base para partir de ella.`); continue; }
    const periodoBase = anteriores[anteriores.length - 1];

    const ffep = Number(entrada && entrada.ffep);
    if (!(ffep > 0)) { errores.push(`${prefijo}: falta el "ffep" del mes (la suma fija de la SRT).`); continue; }
    const ffepAnterior = ffepDe(base);
    if (ffepAnterior == null) { errores.push(`${prefijo}: la tabla de ${periodoBase} no tiene la suma fija "ffep"; no sé dónde ponerla.`); continue; }
    if (ffep < ffepAnterior) avisos.push(`${prefijo}: el FFEP baja de ${ffepAnterior} a ${ffep}. Nunca bajó: revisalo.`);

    const cambios = [`FFEP ${ffepAnterior} → ${ffep}`];
    let bases = null;
    if (entrada.bases_art9) {
      const minima = Number(entrada.bases_art9.minima);
      const maxima = Number(entrada.bases_art9.maxima);
      if (!(minima > 0) || !(maxima > minima)) { errores.push(`${prefijo}: las bases del art. 9 no se entienden (mínima ${entrada.bases_art9.minima}, máxima ${entrada.bases_art9.maxima}).`); continue; }
      bases = { minima, maxima };
      cambios.push(`bases del art. 9 ${base.bases_art9?.minima}/${base.bases_art9?.maxima} → ${minima}/${maxima}`);
    } else {
      avisos.push(`${prefijo}: se repiten las bases del art. 9 de ${periodoBase} (${base.bases_art9?.minima}/${base.bases_art9?.maxima}). Cambian todos los meses con la movilidad: si tenés las de ${periodo}, ponelas en "bases_art9".`);
    }

    // La misma función que el botón "Copiar del mes anterior" y el vigía: la
    // tabla anterior con el FFEP, las bases y el nombre del mes nuevos. El `id`
    // viene de la lectura y no es un campo del documento.
    const tabla = armarTablaDelMes(base, { periodo, ffep, bases });
    delete tabla.id;
    if (entrada.vigencia) tabla.vigencia = String(entrada.vigencia).trim();

    escritos.push({
      ruta: `parametros_contribuciones/${periodo}`,
      campos: tabla,
      reemplaza: Boolean(contribucionesVivas[periodo]),
      titulo: `contribuciones ${periodo} "${tabla.vigencia}", a partir de ${periodoBase}: ${cambios.join("; ")}`,
    });
  }

  return { errores, avisos, escritos: errores.length ? [] : escritos };
}
