// scripts/vigia/preparadores/contribuciones.mjs
// De lo que el Boletín Oficial dijo (bases del art. 9, FFEP) al borrador de la
// tabla de contribuciones del mes, listo para que el dueño lo publique.
//
// El mes nuevo es una copia de la última tabla cargada con las bases y el
// FFEP del Boletín (lib/vigia/contribuciones.js). Se arma por partes, porque
// las dos normas no salen el mismo día: con la Resolución de ANSES nace el
// borrador (FFEP arrastrado, en rojo); con la Disposición de la SRT se
// completa. Si el mes ya está publicado y el Boletín dice otra cosa, sale un
// borrador de REVISIÓN en vez de callarse. Un borrador que el dueño descartó
// no se vuelve a crear.
//
// Escribe sólo con el cliente que recibe; en ensayo devuelve lo que haría.

import { idDeBorrador, nuevoBorrador, estaAbierto, validarBorrador } from "../../../lib/vigia/borradores.js";
import { armarTablaDelMes, ffepDe, erroresDeTabla, diferenciasConPublicada, resumenContribuciones } from "../../../lib/vigia/contribuciones.js";
import { elegirPeriodo, esPeriodoValido, tituloDePeriodo } from "../../../lib/periodos.js";

export const COLECCION = "parametros_contribuciones";
const PREFIJO = "contribuciones--nacional--";

/** Agrupa los hallazgos del Boletín por período: { "2026-11": { bases, ffep } }. */
export function agruparPorPeriodo(hallazgos) {
  const porPeriodo = {};
  for (const h of hallazgos || []) {
    const periodo = h && h.datos && h.datos.periodo;
    if (!esPeriodoValido(periodo)) continue;
    porPeriodo[periodo] = porPeriodo[periodo] || { bases: null, ffep: null };
    if (h.tipo === "bases_art9") porPeriodo[periodo].bases = h;
    if (h.tipo === "ffep") porPeriodo[periodo].ffep = h;
  }
  return porPeriodo;
}

const parteDesdeHallazgo = (h, valor) => ({
  origen: "boletin",
  valor,
  norma: h.norma || null,
  avisoUrl: (h.aviso && h.aviso.url) || null,
  fechaBO: (h.aviso && h.aviso.fecha) || null,
  cita: (h.datos && h.datos.cita) || null,
});

/**
 * Prepara (o completa) los borradores de contribuciones para los hallazgos.
 *
 * @param hallazgos  [{ tipo: "bases_art9"|"ffep", datos, norma, aviso: {url, titulo, fecha} }]
 * @param firestore  el cliente de scripts/vigia/firestore.mjs
 * @param estado     el estado del vigía (se anota el último FFEP conocido)
 * @returns { borradores: [{ id, accion, borrador }], notas: [texto] }
 */
export async function prepararContribuciones({ hallazgos, firestore, estado, corridaId, ahora = new Date().toISOString(), escribir = true }) {
  const salida = { borradores: [], notas: [] };
  const porPeriodo = agruparPorPeriodo(hallazgos);
  const periodos = Object.keys(porPeriodo).sort();
  if (!periodos.length) return salida;

  // Las tablas publicadas, sin el id ni la marca de versión que agrega listar():
  // lo que se copia tiene que ser exactamente el documento.
  const tablas = (await firestore.listar(COLECCION)).map(({ id, _updateTime, ...tabla }) => ({ id, tabla }));
  const tablaDe = (id) => (tablas.find((t) => t.id === id) || {}).tabla || null;
  const idsDeTablas = tablas.map((t) => t.id);

  for (const periodo of periodos) {
    const { bases, ffep } = porPeriodo[periodo];
    const publicada = tablaDe(periodo);
    const idBorrador = idDeBorrador({ tipo: "contribuciones", periodo });

    if (publicada) {
      // El mes ya está en producción: sólo vale la pena hablar si el Boletín dice otra cosa.
      const propuesta = armarTablaDelMes(publicada, { periodo, bases: bases && bases.datos, ffep: ffep && ffep.datos.monto });
      const difs = diferenciasConPublicada(propuesta, publicada);
      if (!difs.length) {
        salida.notas.push(`${tituloDePeriodo(periodo)}: la tabla publicada ya coincide con el Boletín Oficial.`);
        continue;
      }
      const borrador = nuevoBorrador({
        tipo: "contribuciones", periodo, datos: propuesta, origen: "boletin",
        resumen: `REVISAR ${tituloDePeriodo(periodo)}: ${difs.join("; ")}`,
        fuente: fuenteDe(bases || ffep),
        partes: {
          bases_art9: bases ? parteDesdeHallazgo(bases, bases.datos && { minima: bases.datos.minima, maxima: bases.datos.maxima }) : { origen: "publicada", valor: publicada.bases_art9 },
          ffep: ffep ? parteDesdeHallazgo(ffep, ffep.datos.monto) : { origen: "publicada", valor: ffepDe(publicada) },
        },
        revisa: `${COLECCION}/${periodo}`, requiereRevision: true, corridaId, ahora,
      });
      await guardar(firestore, borrador, salida, escribir, "revisión");
      continue;
    }

    const existente = await firestore.leerCrudo(`borradores/${idBorrador}`);
    if (existente && !estaAbierto(existente.campos)) {
      salida.notas.push(`${tituloDePeriodo(periodo)}: el borrador ${idBorrador} está ${existente.campos.estado}; no se vuelve a crear.`);
      continue;
    }

    // La última tabla cargada ANTES del período es la base de la copia.
    const anterior = elegirPeriodo(idsDeTablas.filter((id) => id !== periodo), periodo).periodo;
    const base = anterior ? tablaDe(anterior) : null;
    if (!base) {
      salida.notas.push(`${tituloDePeriodo(periodo)}: no hay ninguna tabla anterior cargada de la que copiar; hay que cargarla a mano.`);
      continue;
    }

    const conocido = estado.ffepConocido || null;
    const partes = {
      bases_art9: bases
        ? parteDesdeHallazgo(bases, { minima: bases.datos.minima, maxima: bases.datos.maxima })
        : { origen: "arrastrado", valor: base.bases_art9, de: anterior },
      ffep: ffep
        ? parteDesdeHallazgo(ffep, ffep.datos.monto)
        : conocido && conocido.periodo <= periodo
          ? { origen: "arrastrado", valor: conocido.monto, de: conocido.periodo, norma: conocido.norma || null, avisoUrl: conocido.avisoUrl || null }
          : { origen: "arrastrado", valor: ffepDe(base), de: anterior },
    };
    if (existente) {
      // El borrador ya existía (por ejemplo, nació con las bases y ahora llega el FFEP): se completa sin pisar lo que ya tenía del Boletín.
      const viejas = existente.campos.partes || {};
      if (!bases && viejas.bases_art9 && viejas.bases_art9.origen === "boletin") partes.bases_art9 = viejas.bases_art9;
      if (!ffep && viejas.ffep && viejas.ffep.origen === "boletin") partes.ffep = viejas.ffep;
    }
    const datos = armarTablaDelMes(base, { periodo, bases: partes.bases_art9.valor, ffep: partes.ffep.valor });
    const erroresForma = erroresDeTabla(datos);
    const arrastrado = partes.bases_art9.origen === "arrastrado" || partes.ffep.origen === "arrastrado";
    const advertencias = [];
    if (partes.bases_art9.origen === "arrastrado") advertencias.push("Las bases del art. 9 son las del mes anterior: todavía no salió la Resolución de ANSES.");
    if (partes.ffep.origen === "arrastrado") advertencias.push(`El FFEP es el de ${tituloDePeriodo(partes.ffep.de || anterior)}: todavía no salió la Disposición de la SRT.`);
    advertencias.push(...erroresForma.map((e) => `Revisá: ${e}`));

    const borrador = nuevoBorrador({
      tipo: "contribuciones", periodo, datos, origen: "boletin",
      resumen: resumenContribuciones({ periodo, partes }),
      fuente: fuenteDe(bases || ffep), partes, advertencias,
      baseComparacion: { periodo: anterior }, requiereRevision: arrastrado || erroresForma.length > 0,
      corridaId, ahora,
    });
    if (existente) {
      await actualizar(firestore, idBorrador, existente, borrador, salida, escribir);
    } else {
      await guardar(firestore, borrador, salida, escribir, "nuevo");
    }

    if (ffep) {
      const nuevo = { periodo, monto: ffep.datos.monto, norma: ffep.norma || null, avisoUrl: (ffep.aviso && ffep.aviso.url) || null };
      if (!conocido || conocido.periodo <= periodo) estado.ffepConocido = nuevo;
      await completarArrastrados(firestore, nuevo, salida, escribir, ahora);
    }
  }
  return salida;
}

function fuenteDe(h) {
  const a = (h && h.aviso) || {};
  return { nombre: "boletinOficial", url: a.url || "", titulo: a.titulo || h.norma || "", fecha: a.fecha || null, idItem: a.id || null };
}

async function guardar(firestore, borrador, salida, escribir, accion) {
  const errores = validarBorrador(borrador);
  if (errores.length) throw new Error(`El borrador ${borrador.id} salió mal armado: ${errores.join(" ")}`);
  const { id, ...datos } = borrador;
  if (escribir) {
    const r = await firestore.crear(`borradores/${id}`, datos);
    if (!r.creado) {
      salida.notas.push(`${id} ya existía (otra corrida lo creó); no se tocó.`);
      return;
    }
  }
  salida.borradores.push({ id, accion, borrador });
}

async function actualizar(firestore, id, existente, nuevo, salida, escribir) {
  const cambios = {
    datos: nuevo.datos, partes: nuevo.partes, resumen: nuevo.resumen, advertencias: nuevo.advertencias,
    estado: nuevo.estado, fuente: nuevo.fuente, actualizadoEl: nuevo.creadoEl,
  };
  if (escribir) {
    const r = await firestore.actualizar(`borradores/${id}`, cambios, { updateTime: existente.updateTime });
    if (!r.actualizado) {
      salida.notas.push(`${id} cambió mientras se preparaba; se reintenta en la próxima corrida.`);
      return;
    }
  }
  salida.borradores.push({ id, accion: "completado", borrador: { ...existente.campos, ...cambios, id } });
}

/** Un FFEP nuevo completa los borradores abiertos de meses posteriores que lo tenían arrastrado. */
async function completarArrastrados(firestore, ffep, salida, escribir, ahora) {
  const abiertos = (await firestore.listar("borradores")).filter(
    (b) => b.id.startsWith(PREFIJO) && !b.id.includes("--revision-") && estaAbierto(b) && b.periodo > ffep.periodo && b.partes && b.partes.ffep && b.partes.ffep.origen === "arrastrado"
  );
  for (const b of abiertos) {
    const partes = { ...b.partes, ffep: { origen: "arrastrado", valor: ffep.monto, de: ffep.periodo, norma: ffep.norma, avisoUrl: ffep.avisoUrl } };
    const datos = armarTablaDelMes(b.datos, { periodo: b.periodo, ffep: ffep.monto });
    const cambios = { datos, partes, resumen: resumenContribuciones({ periodo: b.periodo, partes }), actualizadoEl: ahora };
    if (escribir) await firestore.actualizar(`borradores/${b.id}`, cambios, { updateTime: b._updateTime || undefined });
    salida.borradores.push({ id: b.id, accion: "ffep arrastrado actualizado", borrador: { ...b, ...cambios } });
  }
}
