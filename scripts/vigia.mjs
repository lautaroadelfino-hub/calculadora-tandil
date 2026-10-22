// scripts/vigia.mjs
// El vigía de novedades: todos los días lee las fuentes (Boletín Oficial,
// sindicatos, ARCA), detecta lo nuevo, lo deja preparado como "borrador" en
// Firestore para que el dueño lo publique desde la Bandeja de /admin, y avisa
// por Telegram. NUNCA publica nada: las reglas de Firestore y Storage sólo le
// dejan escribir en `borradores`, `vigia*` y la carpeta `borradores/` de Storage.
//
// Corre solo en GitHub Actions (.github/workflows/vigia.yml) y también a mano:
//
//   node scripts/vigia.mjs                        la corrida normal
//   node scripts/vigia.mjs --ensayo               no escribe nada ni avisa: muestra qué haría
//   node scripts/vigia.mjs --fuente boletinOficial   una sola fuente
//   node scripts/vigia.mjs --desde 2026-09-25     rellena días pasados del Boletín Oficial
//   node scripts/vigia.mjs --item <url>           lee un solo aviso del Boletín Oficial, pegado a mano
//   node scripts/vigia.mjs --sembrar              primera corrida: marca visto lo que ya está publicado, sin borradores
//   node scripts/vigia.mjs --probar-permisos      comprueba que la sesión del vigía NO pueda tocar lo público
//   node scripts/vigia.mjs --solo-bajar           comprueba que las fuentes respondan desde acá
//   node scripts/vigia.mjs --avisar-vivo          manda el "vigía vivo" por Telegram
//
// Variables: las públicas de Firebase salen de .env.local; VIGIA_EMAIL,
// VIGIA_PASSWORD, TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID se pasan sólo para la
// corrida (en Actions, desde Secrets). Ver scripts/vigia/entorno.mjs.
//
// Los avisos de Telegram se encolan en el estado (vigia/estado →
// avisosPendientes) antes de mandarse: si Telegram falla, la corrida termina en
// rojo y lo que no salió se manda en la corrida siguiente. Nada se pierde en
// silencio.
//
// Fuentes activas: Boletín Oficial (lote 2). Camioneros, FAECYS, UTHGRA y ARCA
// se suman en los lotes siguientes (ver docs/continuidad.md).

import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cargarEnvLocal, leerEntorno, exigir, enmascarar, RAIZ } from "./vigia/entorno.mjs";

// El entorno se carga ANTES de importar lib/: lib/firestoreRest.js lee el id
// del proyecto al importarse.
cargarEnvLocal();
const entorno = leerEntorno();

const { iniciarSesion, clienteFirestore } = await import("./vigia/firestore.mjs");
const { clienteStorage } = await import("./vigia/storage.mjs");
const telegram = await import("./vigia/telegram.mjs");
const estadoMod = await import("./vigia/estado.mjs");
const { pedir } = await import("./vigia/http.mjs");
const { correrBoletinOficial } = await import("./vigia/correrBoletin.mjs");
const { lineaDe } = await import("../lib/vigia/borradores.js");
const { tituloDePeriodo } = await import("../lib/periodos.js");

// --- Argumentos (línea de comandos o entradas del workflow) ----------------
const args = process.argv.slice(2);
const valorDe = (bandera) => {
  const i = args.indexOf(bandera);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};
const esVerdadero = (v) => String(v || "").toLowerCase() === "true";
const opciones = {
  ensayo: args.includes("--ensayo") || esVerdadero(process.env.VIGIA_ENSAYO),
  fuente: valorDe("--fuente") || process.env.VIGIA_FUENTE || null,
  desde: valorDe("--desde") || process.env.VIGIA_DESDE || null,
  item: valorDe("--item") || process.env.VIGIA_ITEM || null,
  comparar: valorDe("--comparar"),
  sembrar: args.includes("--sembrar") || esVerdadero(process.env.VIGIA_SEMBRAR),
  probarPermisos: args.includes("--probar-permisos"),
  soloBajar: args.includes("--solo-bajar"),
  avisarVivo: args.includes("--avisar-vivo"),
};
const modo = opciones.ensayo ? "ensayo" : process.env.GITHUB_EVENT_NAME === "schedule" ? "cron" : "manual";

// --- Log: a la consola y a .vigia-log.txt (lo sube el workflow), siempre enmascarado
const ARCHIVO_LOG = join(RAIZ, ".vigia-log.txt");
const lineasDeLog = [];
let tokenDeSesion = null;
function registrar(texto) {
  const linea = enmascarar(`${new Date().toISOString()} ${texto}`, entorno, tokenDeSesion ? [tokenDeSesion] : []);
  console.log(linea);
  lineasDeLog.push(linea);
  try { appendFileSync(ARCHIVO_LOG, linea + "\n"); } catch { /* sin log en disco no se frena nada */ }
}
try { writeFileSync(ARCHIVO_LOG, ""); } catch { /* ídem */ }

const hoyArgentina = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

async function abrirSesion() {
  exigir(entorno, ["proyecto", "apiKey", "vigiaEmail", "vigiaPassword"]);
  const sesion = await iniciarSesion({ apiKey: entorno.valores.apiKey, email: entorno.valores.vigiaEmail, password: entorno.valores.vigiaPassword });
  tokenDeSesion = sesion.idToken;
  registrar(`Sesión abierta como ${sesion.email} (uid ${sesion.uid}).`);
  return { sesion, firestore: clienteFirestore({ proyecto: entorno.valores.proyecto, idToken: sesion.idToken }) };
}

// --- --probar-permisos ------------------------------------------------------
// Lo que el vigía NO tiene que poder hacer (escribir lo público) y lo que sí.
// Se corre en la PC y desde Actions después de pegar las reglas.
async function probarPermisos() {
  exigir(entorno, ["bucket"]);
  const { sesion, firestore } = await abrirSesion();
  const storage = clienteStorage({ bucket: entorno.valores.bucket, idToken: sesion.idToken });
  const resultados = [];
  const esperar = async (nombre, esperado, accion, limpiar) => {
    let obtenido;
    try {
      await accion();
      obtenido = "pudo";
      if (esperado === "403" && limpiar) await limpiar().catch(() => {});
    } catch (e) {
      obtenido = e && e.status ? String(e.status) : `error: ${e.message}`;
    }
    const ok = esperado === "403" ? obtenido === "403" : obtenido === "pudo";
    resultados.push({ nombre, esperado: esperado === "403" ? "403 (prohibido)" : "pudo", obtenido, ok });
  };
  const marca = { prueba: true, activo: false, creadoEl: new Date().toISOString() };
  await esperar("crear un convenio", "403", () => firestore.crear("convenios/_prueba_vigia", marca), () => firestore.borrar("convenios/_prueba_vigia"));
  await esperar("crear una escala", "403", () => firestore.crear("convenios/_prueba_vigia/escalas/2099-01", marca), () => firestore.borrar("convenios/_prueba_vigia/escalas/2099-01"));
  await esperar("crear una tabla de contribuciones", "403", () => firestore.crear("parametros_contribuciones/_prueba_vigia", marca), () => firestore.borrar("parametros_contribuciones/_prueba_vigia"));
  await esperar("crear un acuerdo", "403", () => firestore.crear("acuerdos/_prueba_vigia", marca), () => firestore.borrar("acuerdos/_prueba_vigia"));
  await esperar("escribir vigia/prueba", "pudo", () => firestore.reemplazar("vigia/prueba", marca));
  await esperar("borrar vigia/prueba", "pudo", () => firestore.borrar("vigia/prueba"));
  await esperar("crear un borrador", "pudo", () => firestore.crear("borradores/_prueba_vigia", { ...marca, tipo: "prueba", estado: "pendiente" }));
  await esperar("actualizar un borrador pendiente", "pudo", () => firestore.actualizar("borradores/_prueba_vigia", { estado: "descartado", descartadoEl: new Date().toISOString() }));
  await esperar("actualizar un borrador cerrado", "403", () => firestore.actualizar("borradores/_prueba_vigia", { resumen: "no debería poder" }));
  await esperar("borrar un borrador", "403", () => firestore.borrar("borradores/_prueba_vigia"));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  await esperar("subir a acuerdos/ un archivo fuera del patrón", "403", () => storage.subir({ ruta: "acuerdos/_prueba_vigia/prueba.txt", buffer: Buffer.from("x"), contentType: "text/plain" }), () => storage.borrar("acuerdos/_prueba_vigia/prueba.txt"));
  await esperar("subir a borradores/", "pudo", () => storage.subir({ ruta: "borradores/_prueba_vigia/prueba.png", buffer: png, contentType: "image/png" }));
  await esperar("borrar de borradores/", "pudo", () => storage.borrar("borradores/_prueba_vigia/prueba.png"));

  console.log("\nPermisos del vigía:");
  for (const r of resultados) console.log(`  ${r.ok ? "OK  " : "MAL "} ${r.nombre.padEnd(45)} esperado ${r.esperado.padEnd(16)} obtenido ${r.obtenido}`);
  const malos = resultados.filter((r) => !r.ok);
  console.log(malos.length ? `\n${malos.length} resultado(s) distinto(s) de lo esperado: revisá las reglas pegadas en la consola.` : "\nTodo como tiene que ser.");
  return malos.length ? 1 : 0;
}

// --- --solo-bajar -----------------------------------------------------------
// Las fuentes responden desde donde corre el vigía (la PC o GitHub Actions).
const SONDAS = [
  ["boletinOficial", "https://www.boletinoficial.gob.ar/seccion/primera"],
  ["camioneros", "https://www.camioneros-ba.org.ar/index.php/gremiales/salarios/ultima-escala-salarial"],
  ["faecys", "https://www.faecys.org.ar/?s=130%2F75"],
  ["uthgra", "https://www.uthgra.org.ar/institucional/accion-gremial/escalas/"],
  ["arca", "https://www.afip.gob.ar/gananciasYBienes/ganancias/personas-humanas-sucesiones-indivisas/deducciones/deducciones-personales.asp"],
];
async function soloBajar() {
  let fallas = 0;
  for (const [nombre, url] of SONDAS) {
    const inicio = Date.now();
    try {
      const r = await pedir(url);
      registrar(`${nombre.padEnd(16)} HTTP ${r.status} ${String(r.buffer.length).padStart(8)} bytes ${Date.now() - inicio} ms  ${url}`);
      if (!r.ok) fallas += 1;
    } catch (e) {
      fallas += 1;
      registrar(`${nombre.padEnd(16)} FALLÓ: ${e.message}`);
    }
  }
  registrar(fallas ? `${fallas} fuente(s) no respondieron.` : "Las cinco fuentes responden.");
  return fallas ? 1 : 0;
}

// --- La corrida normal --------------------------------------------------------
const FUENTES_ACTIVAS = [
  { nombre: "boletinOficial", correr: correrBoletinOficial, aceptaItem: true },
];
const TOPE_AVISOS_PENDIENTES = 50;

// El FFEP sale en una Disposición de la SRT a mitad o fin del mismo mes. Si el
// 28 todavía no se leyó y la tabla del mes no está publicada, se recuerda una
// vez por mes.
async function recordarFfep(firestore, estado, hoy, encolar) {
  const mes = hoy.slice(0, 7);
  if (Number(hoy.slice(8, 10)) < 28 || estado.ultimoAvisoFfep === mes) return;
  const conocido = estado.ffepConocido || null;
  if (conocido && conocido.periodo >= mes) return;
  if (await firestore.leer(`parametros_contribuciones/${mes}`)) return;
  encolar(
    `Falta el FFEP de ${tituloDePeriodo(mes)}: el vigía no leyó la Disposición de la SRT y la tabla de ${tituloDePeriodo(mes)} no está publicada.` +
    (conocido ? ` Último conocido: $${conocido.monto} de ${tituloDePeriodo(conocido.periodo)}.` : "") +
    " Si ya salió, pasale el aviso con --item; si no, cargá el mes a mano en liquidar.ar/admin → Contribuciones."
  );
  estado.ultimoAvisoFfep = mes;
}

async function corrida() {
  if (!opciones.ensayo) exigir(entorno, ["telegramToken", "telegramChatId"]);
  const { firestore } = await abrirSesion();
  const inicio = new Date();
  const corridaDoc = {
    id: estadoMod.idDeCorrida(inicio),
    inicio: inicio.toISOString(), fin: null, modo,
    argumentos: args.join(" "),
    fuentes: {}, borradores: [], avisosEnviados: 0, log: [],
  };
  const estado = await estadoMod.leerEstado(firestore);
  const escribir = !opciones.ensayo;
  const guardarAvance = async () => { if (escribir) await estadoMod.guardarEstado(firestore, estado); };
  const encolar = (texto) => { estado.avisosPendientes = [...(estado.avisosPendientes || []), texto].slice(-TOPE_AVISOS_PENDIENTES); };
  const hoy = hoyArgentina();
  registrar(`Corrida ${corridaDoc.id} (${modo}), hoy ${hoy}. Última corrida: ${estado.ultimaCorrida ? `${estado.ultimaCorrida.id}, ${estado.ultimaCorrida.resumen}` : "ninguna"}.`);
  const sinMandar = (estado.avisosPendientes || []).length;
  if (sinMandar) registrar(`${sinMandar} aviso(s) quedaron sin mandar en corridas anteriores; se mandan ahora.`);

  const nombreFuente = opciones.fuente || (opciones.item ? "boletinOficial" : null);
  const fuentesAcorrer = FUENTES_ACTIVAS.filter((f) => !nombreFuente || f.nombre === nombreFuente);
  if (nombreFuente && !fuentesAcorrer.length) registrar(`No existe la fuente "${nombreFuente}" (todavía). Fuentes: ${FUENTES_ACTIVAS.map((f) => f.nombre).join(", ")}.`);
  if (opciones.item && !fuentesAcorrer.some((f) => f.aceptaItem)) registrar("--item sólo sirve con el Boletín Oficial.");

  for (const fuente of fuentesAcorrer) {
    const registro = { estado: "saltada", items: 0, nuevos: 0, alertas: 0, borradores: [], error: null };
    corridaDoc.fuentes[fuente.nombre] = registro;
    if (opciones.sembrar) {
      registrar(`${fuente.nombre}: con --sembrar no se lee (esta fuente no tiene nada que sembrar).`);
      continue;
    }
    registrar(`Fuente ${fuente.nombre}:`);
    try {
      const r = await fuente.correr({
        firestore, estado, hoy, desde: opciones.desde, item: fuente.aceptaItem ? opciones.item : null,
        escribir, registrar, corridaId: corridaDoc.id, guardarAvance,
      });
      registro.estado = "ok";
      registro.items = r.items;
      registro.nuevos = r.nuevos;
      registro.alertas = r.alertas.length;
      registro.borradores = r.borradores.map((b) => b.id);
      for (const n of r.notas) registrar(`  ${n}`);
      for (const b of r.borradores) {
        corridaDoc.borradores.push({ id: b.id, accion: b.accion });
        registrar(`  borrador ${b.accion}: ${b.id}`);
        encolar(`${lineaDe(b.borrador)}\nRevisalo en liquidar.ar/admin → Bandeja`);
      }
      for (const a of r.alertas) encolar(`Boletín Oficial ${a.aviso.fecha} · ${a.norma}: ${a.temas.join(", ")}.\n${a.aviso.url}`);
      estadoMod.registrarResultadoFuente(estado, fuente.nombre, { ok: true });
    } catch (e) {
      registro.estado = "fallo";
      registro.error = String(e && e.message ? e.message : e).slice(0, 500);
      registrar(`  ${fuente.nombre} FALLÓ: ${registro.error}`);
      const { avisar } = estadoMod.registrarResultadoFuente(estado, fuente.nombre, { ok: false, error: e });
      if (avisar) encolar(`El vigía no pudo leer ${fuente.nombre}: ${registro.error} (${estado.fuentes[fuente.nombre].fallasSeguidas} falla/s seguida/s).`);
    }
  }

  await recordarFfep(firestore, estado, hoy, encolar);

  // El "vigía vivo": una vez por mes, o cuando se pide. Con el mes argentino.
  const mesActual = hoy.slice(0, 7);
  if (opciones.avisarVivo || estado.ultimoAvisoVivo !== mesActual) {
    encolar(`Vigía vivo (${hoy}). Fuentes activas: ${FUENTES_ACTIVAS.map((f) => f.nombre).join(", ")}. Última corrida: ${estado.ultimaCorrida ? estado.ultimaCorrida.id : "ninguna"}.`);
    estado.ultimoAvisoVivo = mesActual;
  }

  const fin = new Date();
  corridaDoc.fin = fin.toISOString();
  const fallidas = Object.entries(corridaDoc.fuentes).filter(([, f]) => f.estado === "fallo").map(([n]) => n);
  const pendientes = [...(estado.avisosPendientes || [])];
  const resumen = `${fuentesAcorrer.length} fuente(s)${fallidas.length ? ` (falló ${fallidas.join(", ")})` : ""}, ${corridaDoc.borradores.length} borrador(es), ${pendientes.length} aviso(s)`;
  estado.ultimaCorrida = { id: corridaDoc.id, inicio: corridaDoc.inicio, fin: corridaDoc.fin, ok: fallidas.length === 0, resumen };

  if (opciones.ensayo) {
    registrar(`ENSAYO: no se escribe nada ni se avisa. ${resumen}. Se habría(n) mandado ${pendientes.length} aviso(s):`);
    for (const a of pendientes) registrar(`  → ${a.replace(/\n/g, " | ")}`);
    return 0;
  }

  let fallaTelegram = null;
  for (const texto of pendientes) {
    try {
      await telegram.enviar({ token: entorno.valores.telegramToken, chatId: entorno.valores.telegramChatId, texto });
    } catch (e) {
      fallaTelegram = e;
      break;
    }
    estado.avisosPendientes = (estado.avisosPendientes || []).filter((t) => t !== texto);
    corridaDoc.avisosEnviados += 1;
    registrar(`Telegram: ${texto.split("\n")[0]}`);
  }
  corridaDoc.log = lineasDeLog.slice(-200);
  await estadoMod.registrarCorrida(firestore, corridaDoc);
  await estadoMod.guardarEstado(firestore, estado);
  const podadas = await estadoMod.podarCorridas(firestore);
  registrar(`Corrida guardada (${resumen}${podadas ? `; ${podadas} corrida(s) vieja(s) borrada(s)` : ""}).`);
  if (fallaTelegram) {
    throw new Error(`Telegram falló: ${fallaTelegram.message}. ${(estado.avisosPendientes || []).length} aviso(s) quedan pendientes para la próxima corrida.`);
  }
  return 0;
}

try {
  let codigo;
  if (opciones.probarPermisos) codigo = await probarPermisos();
  else if (opciones.soloBajar) codigo = await soloBajar();
  else codigo = await corrida();
  process.exit(codigo);
} catch (error) {
  registrar(`FALLÓ: ${error && error.message ? error.message : error}`);
  process.exit(1);
}
