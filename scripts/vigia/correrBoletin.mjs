// scripts/vigia/correrBoletin.mjs
// El recorrido del Boletín Oficial en una corrida: qué días mirar, qué avisos
// bajar, qué dijo cada uno y qué borradores dejar.
//
// El estado de la fuente (vigia/estado → fuentes.boletinOficial) guarda:
//   ultimaFechaRevisada  el último día CERRADO. Hoy se lee en cada corrida
//                        pero no se cierra hasta mañana: a las 09:00 el día
//                        puede estar a medio publicar.
//   vistos               los avisos ya leídos (para no repetir hoy, ni al
//                        rellenar con --desde)
//   reintentos           los avisos que no se pudieron bajar; se prueban
//                        primero en la corrida siguiente
//   diasVaciosSeguidos   tres días hábiles sin avisos = cambió el formato
//   limitadoSeguidos     corridas seguidas que el Boletín cortó con HTTP 429;
//                        a la tercera se da por falla
//
// Si el Boletín limita los pedidos (HTTP 429) después de los reintentos de
// http.mjs, la corrida de esta fuente termina ahí, PARCIAL: lo ya leído queda
// guardado, el día en curso no se cierra y lo que falta sigue mañana. No es
// una falla de la fuente, salvo que pase tres corridas seguidas.
//
// Recibe el cliente de Firestore y el estado; escribe sólo a través de ellos.
// En ensayo (`escribir: false`) no toca la base y el estado queda en memoria.

import { listarDia, bajar, interesa, diasARevisar, itemDesdeUrl, nombre as NOMBRE, MAX_DIAS_POR_CORRIDA } from "./fuentes/boletinOficial.mjs";
import { clasificarAviso } from "../../lib/vigia/boletin.js";
import { prepararContribuciones } from "./preparadores/contribuciones.mjs";
import { fueVisto, marcarVisto } from "./estado.mjs";

export const TOPE_REINTENTOS = 50;
export const DIAS_VACIOS_TOLERADOS = 3;
export const CORRIDAS_LIMITADAS_TOLERADAS = 3;

const esDiaHabil = (fecha) => {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return d >= 1 && d <= 5;
};

export const diaAnterior = (fecha) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const esLimitado = (e) => Boolean(e) && e.status === 429;

const describir = (clas) => {
  if (!clas) return "sin interés";
  if (clas.tipo === "alerta") return `alerta: ${clas.temas.join(", ")}`;
  const d = clas.datos || {};
  return clas.tipo === "bases_art9"
    ? `bases del art. 9 de ${d.periodo}: ${d.minima} / ${d.maxima}`
    : `FFEP de ${d.periodo}: ${d.monto}`;
};

/**
 * @returns {{ items, nuevos, hallazgos, alertas, borradores, notas, diasRevisados, parcial }}
 */
export async function correrBoletinOficial({
  firestore, estado, hoy, desde = null, item = null, escribir = true, registrar = () => {}, pedirFn, corridaId,
  guardarAvance = async () => {},
}) {
  const f = estado.fuentes[NOMBRE];
  const salida = { items: 0, nuevos: 0, hallazgos: [], alertas: [], borradores: [], notas: [], diasRevisados: [], parcial: false };
  const red = pedirFn ? { pedirFn } : {};

  const leerAviso = async (it) => {
    const { titulo, cuerpo } = await bajar(it, red);
    const organismo = it.organismo || titulo.split(" - ")[0] || "";
    const clas = clasificarAviso({ organismo, titulo, texto: cuerpo });
    const aviso = { id: it.id, url: it.url, fecha: it.fecha, titulo: titulo || it.titulo };
    if (clas && clas.tipo === "alerta") salida.alertas.push({ ...clas, aviso });
    else if (clas) salida.hallazgos.push({ ...clas, aviso });
    marcarVisto(estado, NOMBRE, it.id);
    registrar(`  ${it.fecha} ${aviso.titulo}: ${describir(clas)}`);
    return clas;
  };
  // Un aviso que no se pudo bajar queda para la corrida siguiente; un 429 corta.
  const intentar = async (it) => {
    salida.nuevos += 1;
    try {
      await leerAviso(it);
    } catch (e) {
      if (esLimitado(e)) throw e;
      registrar(`  no se pudo leer ${it.url}: ${e.message}. Se reintenta en la próxima corrida.`);
      const pendiente = { id: it.id, url: it.url, fecha: it.fecha, organismo: it.organismo || "", titulo: it.titulo || "" };
      f.reintentos = [...(f.reintentos || []).filter((r) => r.id !== it.id), pendiente].slice(-TOPE_REINTENTOS);
    }
  };

  if (item) {
    // Un aviso pegado a mano: se lee aunque ya se haya visto, y no mueve los días.
    const it = itemDesdeUrl(item);
    salida.items = 1;
    salida.nuevos = 1;
    await leerAviso(it);
  } else {
    try {
      const pendientes = [...(f.reintentos || [])];
      f.reintentos = [];
      for (const it of pendientes) await intentar(it);

      // La primera vez se arranca hoy (o en --desde); nunca se cierra un día
      // que no se leyó.
      if (!f.ultimaFechaRevisada) f.ultimaFechaRevisada = diaAnterior(desde || hoy);
      const dias = diasARevisar({ desde, hasta: hoy, ultimaFechaRevisada: f.ultimaFechaRevisada });
      for (const dia of dias) {
        const lista = await listarDia(dia, red);
        salida.items += lista.length;
        if (!lista.length && esDiaHabil(dia)) {
          f.diasVaciosSeguidos = (f.diasVaciosSeguidos || 0) + 1;
          if (f.diasVaciosSeguidos >= DIAS_VACIOS_TOLERADOS) {
            throw new Error(`cambió el formato del listado del Boletín Oficial, o dejó de publicar: ${f.diasVaciosSeguidos} días hábiles seguidos sin avisos (último: ${dia})`);
          }
          registrar(`${dia}: día hábil sin avisos (${f.diasVaciosSeguidos} seguido/s; a los ${DIAS_VACIOS_TOLERADOS} se da por roto).`);
        } else if (lista.length) {
          f.diasVaciosSeguidos = 0;
        }
        const aLeer = lista.filter((it) => interesa(it) && !fueVisto(estado, NOMBRE, it.id));
        registrar(`${dia}: ${lista.length} aviso(s), ${aLeer.length} para leer.`);
        for (const it of aLeer) await intentar(it);
        if (dia < hoy && dia > f.ultimaFechaRevisada) f.ultimaFechaRevisada = dia;
        salida.diasRevisados.push(dia);
        await guardarAvance();
      }
      if (dias.length === MAX_DIAS_POR_CORRIDA && dias[dias.length - 1] < hoy) {
        salida.notas.push(`Quedan días por revisar desde el ${dias[dias.length - 1]}: siguen en la próxima corrida.`);
      }
      f.limitadoSeguidos = 0;
    } catch (e) {
      if (!esLimitado(e)) throw e;
      f.limitadoSeguidos = (f.limitadoSeguidos || 0) + 1;
      if (f.limitadoSeguidos >= CORRIDAS_LIMITADAS_TOLERADAS) {
        throw new Error(`${e.message}; ${f.limitadoSeguidos} corridas seguidas cortadas por el límite de pedidos del Boletín Oficial`);
      }
      salida.parcial = true;
      salida.notas.push(`${e.message}. La corrida quedó parcial: lo que falta sigue en la próxima (${f.limitadoSeguidos} seguida/s).`);
      await guardarAvance();
    }
  }

  if (salida.hallazgos.length) {
    const r = await prepararContribuciones({ hallazgos: salida.hallazgos, firestore, estado, corridaId, escribir });
    salida.borradores = r.borradores;
    salida.notas.push(...r.notas);
  }
  return salida;
}
