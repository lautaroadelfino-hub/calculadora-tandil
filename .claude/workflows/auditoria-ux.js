// .claude/workflows/auditoria-ux.js
// Auditoría de funcionalidades y experiencia de usuario de liquidar.ar hecha
// por personas simuladas que llegan al sitio SIN contexto del proyecto (el
// agente `auditor-ux` sólo tiene el navegador), más una verificación
// adversarial de cada hallazgo que valga la pena.
//
// Cómo se corre (desde Claude Code, en este repo):
//   Workflow({ scriptPath: ".claude/workflows/auditoria-ux.js" })
//   Workflow({ scriptPath: "...", args: { personas: ["rompedor"], verificar: false } })   ← ensayo
//   Workflow({ scriptPath: "...", args: { url: "http://localhost:3000" } })              ← contra un servidor local
//
// Hay una sola ventana de Chrome conectada, así que los auditores corren de a
// uno. Cada uno abre su pestaña y la cierra al terminar.

export const meta = {
  name: 'auditoria-ux',
  description: 'Auditoría de funcionalidades y UX de liquidar.ar con personas simuladas sin contexto del proyecto, más verificación adversarial de los hallazgos',
  whenToUse: 'Después de un cambio grande de pantalla o de un convenio nuevo, para ver el sitio con ojos de primera vez',
  phases: [
    { title: 'Auditar', detail: 'una persona por vez, sólo con el navegador' },
    { title: 'Consolidar', detail: 'un editor agrupa los hallazgos por problema de fondo' },
    { title: 'Verificar', detail: 'un verificador fresco intenta reproducir cada hallazgo de severidad media o más' },
  ],
}

const URL = (args && args.url) || 'https://liquidar.ar'
const TOPE_VERIFICAR = (args && args.topeVerificar) || 12

// El agente `auditor-ux` (.claude/agents/auditor-ux.md) tiene las herramientas
// restringidas al navegador: es la garantía fuerte de que no lee el código.
// Pero el registro de agentes se carga al iniciar la sesión: si el archivo se
// creó en esta misma sesión, el tipo no existe todavía. En ese caso se usa el
// agente genérico con las mismas reglas escritas en el prompt (garantía por
// instrucción, no por herramienta), y el aislamiento se verifica después
// leyendo las transcripciones: ninguna llamada a Read, Bash, Grep ni WebFetch.
// Las reglas de acá abajo son las mismas que las del archivo del agente; si se
// cambia una, se cambia la otra.
const REGLAS = `
SOS UNA PERSONA REAL que entra por primera vez a un sitio web. No sabés nada
de cómo está hecho, no viste su código y no tenés que verlo: tu única
herramienta es el navegador Chrome. NO uses Read, Bash, Grep, Glob, WebFetch
ni WebSearch, aunque las tengas disponibles: todo lo que informes tiene que
salir de lo que viste en pantalla. Si algo lo suponés, decí que lo suponés.

REGLAS DEL NAVEGADOR (son de la herramienta, no del sitio):
1. Cargá las herramientas con UNA llamada a ToolSearch:
   select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__find,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch
2. Primero tabs_context_mcp, después tabs_create_mcp para tener TU pestaña, y
   navegá ahí. No uses pestañas que ya existían. Al terminar, cerrá la tuya con
   tabs_close_mcp.
3. Apenas cargue CADA página (y después de cada navegación), ejecutá con
   javascript_tool, antes de tocar nada:
   window.alert=(m)=>{window.__alertas=(window.__alertas||[]).concat([String(m)])};window.confirm=()=>true;window.prompt=()=>null;"listo"
   Un cuadro de alerta congela la herramienta. Los mensajes que el sitio quiso
   mostrarte quedan en window.__alertas: leelos cuando algo no reaccione, y
   anotalos como mensajes que viste.
4. NUNCA envíes un formulario que mande datos a alguien ("Enviar reporte",
   "Enviar", "Suscribirse"): podés abrirlo, leerlo y escribir, pero no mandarlo.
   No inicies sesión, no crees cuentas, no entres a rutas de administración más
   allá de anotar que existen.
5. Para ver el sitio como en un celular de 400 px (la ventana no se achica),
   insertá un marco con javascript_tool:
   const f=document.createElement("iframe");f.id="movil";f.src=location.pathname;f.style.cssText="position:fixed;left:8px;top:80px;width:400px;height:640px;border:3px solid #e11d48;z-index:99999;background:#fff";document.body.appendChild(f);"ok"
   Esperá 5 segundos, sacá la captura (el marco rojo es el celular) y leé o tocá
   lo de adentro con document.getElementById("movil").contentDocument. Adentro
   del marco también anulá alert (regla 3) sobre su contentWindow.
6. Capturas con scale 0.5. save_to_disk sólo cuando la captura es evidencia de
   un hallazgo; copiá la ruta devuelta en el campo evidencia. Para leer texto usá
   get_page_text o read_page: más barato y más exacto que la imagen.
7. Unos 20 a 30 minutos de recorrido. Si algo no carga en 10 segundos, esperá
   una vez más y anotalo.

CÓMO INFORMAR: cada hallazgo con pasos que otra persona pueda seguir en un
minuto, qué esperabas y qué pasó; sin pasos no es un hallazgo. Severidad:
bloqueante (no se puede completar la tarea), alta (se completa pero con un
error o una confusión seria), media (fricción clara), baja (detalle). No
infles: un texto que no te gusta no es un error; uno que no se entiende, sí.
Anotá también lo que funcionó bien y las preguntas que te quedaron.
`

let tipoDisponible = true
async function auditor(prompt, opts) {
  if (tipoDisponible) {
    try {
      return await agent(prompt, { ...opts, agentType: 'auditor-ux' })
    } catch (e) {
      if (!/not found/i.test(String(e && e.message))) throw e
      tipoDisponible = false
      log('el tipo de agente auditor-ux no está cargado en esta sesión: sigo con el agente genérico y las reglas en el prompt')
    }
  }
  return agent(`${REGLAS}\n${prompt}`, opts)
}

const COMUN = `
SITIO: ${URL}

Entrás por primera vez. No sabés qué es ni quién lo hizo. Todo lo que
sepas del sitio tiene que salir de la pantalla.
`

const PERSONAS = [
  {
    key: 'empleado',
    titulo: 'Empleado de comercio que quiere saber cuánto le queda en mano',
    consigna: `
QUIÉN SOS: trabajás como vendedor en un local de ropa, categoría "Vendedor B"
según te dijeron. Tenés 3 años en la empresa y hacés 48 horas semanales. No
sabés de convenios, ni qué es un "remunerativo", ni qué es el SAC. Querés
saber cuánto plata te tiene que quedar en mano este mes, y si tu recibo está
bien.

TU TAREA: entrar al sitio y llegar a ese número. Sin ayuda de nadie.

PRESTALE ATENCIÓN A: si entendés qué hace el sitio en los primeros 5
segundos; si encontrás tu convenio sin saber su nombre técnico; cada palabra
que no entendiste; cada campo que no supiste qué poner y qué pusiste al
final; si el resultado te dice claramente cuánto cobrás en mano y por qué; si
algo te dio desconfianza. Contá también cuánto tardaste.`,
  },
  {
    key: 'contador',
    titulo: 'Contador que liquida sueldos y quiere verificar dos recibos',
    consigna: `
QUIÉN SOS: contador público, liquidás sueldos de varias empresas chicas. Sos
exigente con los números: querés saber de dónde sale cada uno y qué supuestos
usó la herramienta. No confiás en nada que no puedas rastrear.

TUS TAREAS:
1. Un chofer de larga distancia de Camioneros (CCT 40/89), categoría de
   primera, 10 años de antigüedad, 8.000 km en el mes y 12 horas extras al
   50%, afiliado al sindicato. Querés ver el recibo completo, con aportes,
   retenciones sindicales y contribuciones del empleador.
2. Un mozo de gastronomía (Nivel 6) con 5 años, jornada completa, con el
   medio aguinaldo incluido.

PRESTALE ATENCIÓN A: si cada línea del recibo dice sobre qué base y con qué
porcentaje se calculó; si los avisos y supuestos (período, tablas, ART,
régimen) están a la vista o escondidos; si podés cambiar un dato y ver qué
cambia; si hay algo que un colega tuyo cuestionaría; qué te faltó para
confiar en el resultado; si hay forma de guardar, imprimir o compartir el
recibo.`,
  },
  {
    key: 'empleador',
    titulo: 'Dueño de una PyME que quiere saber cuánto le cuesta un empleado',
    consigna: `
QUIÉN SOS: tenés una distribuidora chica con 6 empleados. Vas a tomar un
empleado de comercio, administrativo, y querés saber cuánto te va a costar
por mes en total (sueldo más todo lo que paga la empresa), no cuánto cobra él.
Sabés que existe "la ART" y "las cargas sociales" pero no los porcentajes.

TU TAREA: llegar al costo mensual total de ese empleado, y entender qué
parte es sueldo y qué parte son cargas.

PRESTALE ATENCIÓN A: si el sitio deja claro que también sirve para
empleadores o parece sólo para empleados; si encontrás dónde se ve el costo
del empleador; cada pregunta que te hicieron que no supiste contestar
(régimen, alícuotas) y qué hiciste; si el resultado te sirve para decidir;
qué te gustaría poder hacer y no pudiste.`,
  },
  {
    key: 'celular',
    titulo: 'Usuario que entra desde el celular',
    consigna: `
QUIÉN SOS: una persona que abre el sitio desde el teléfono, en el colectivo,
con una mano. Usá el marco de 400 px de ancho de la regla 5 para TODO el
recorrido: portada, una calculadora completa (elegí cualquier convenio,
completá los datos y calculá), y la sección de novedades.

PRESTALE ATENCIÓN A: si algo se sale de la pantalla hacia el costado (scroll
horizontal); textos cortados o encimados; botones o campos demasiado chicos
o pegados; el orden en que aparecen las cosas (¿lo importante está arriba?);
si el resultado del cálculo se lee bien en angosto; menús o paneles que no
abren o no cierran; cuánto hay que scrollear para llegar al botón de calcular
y al resultado. Sacá capturas del marco cada vez que algo se vea mal.`,
  },
  {
    key: 'accesibilidad',
    titulo: 'Auditor de accesibilidad',
    consigna: `
QUIÉN SOS: revisás sitios para personas que navegan sólo con teclado o con
lector de pantalla. Recorré la portada, una calculadora y las novedades.

CÓMO: con "computer" y la tecla Tab avanzá por la página y, con
javascript_tool, leé después de cada tanto \`document.activeElement\` (tag,
texto, y si tiene un contorno de foco visible: getComputedStyle outline /
box-shadow). Usá read_page con filter "interactive" y sin filtro para ver el
árbol de accesibilidad: roles, nombres accesibles, labels de los campos,
jerarquía de encabezados (h1, h2, h3), textos alternativos, botones sin
nombre. Probá completar y enviar el cálculo SOLO con teclado.

PRESTALE ATENCIÓN A: campos sin label asociado; botones o links sin texto
accesible; foco que se pierde o no se ve; orden de Tab ilógico; encabezados
salteados; contrastes que a simple vista parezcan flojos (gris claro sobre
blanco); mensajes de error o avisos que no se anuncian; modales que no
atrapan el foco ni cierran con Escape.`,
  },
  {
    key: 'rompedor',
    titulo: 'Usuario que carga cualquier cosa y toca todo',
    consigna: `
QUIÉN SOS: alguien impaciente y desprolijo. No leés instrucciones, apretás
antes de completar, y cargás valores raros. Tu objetivo es ver cómo se porta
el sitio cuando lo usan mal.

PROBÁ, como mínimo, en una calculadora: calcular sin tocar nada; dejar
campos vacíos; poner 0, negativos, decimales con coma y con punto, y texto en
los campos numéricos; 200 años de antigüedad; 500 horas extras; marcar todas
las casillas a la vez; cambiar el período después de calcular; cambiar la
categoría después de calcular; recargar la página a mitad. Después visitá
direcciones que no deberían existir o que suenan viejas: ${URL}/calcular/loquesea,
${URL}/empleador, ${URL}/novedades, ${URL}/una-pagina-que-no-existe. Abrí el
formulario de reporte de errores, escribí cualquier cosa y CERRALO sin enviar.

PRESTALE ATENCIÓN A: errores crudos o en inglés; pantallas en blanco;
números imposibles (neto negativo, NaN, undefined, "$0,00" donde no
corresponde); mensajes que no explican qué hacer; cosas que quedaron en un
estado raro después de cambiar un dato; qué te dijo el sitio por
\`window.__alertas\`.`,
  },
]

const seleccion = args && Array.isArray(args.personas)
  ? PERSONAS.filter((p) => args.personas.includes(p.key))
  : PERSONAS
const verificar = !(args && args.verificar === false)

const HALLAZGO = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'corto y único dentro de tu informe, ej: R1, R2' },
    severidad: { type: 'string', enum: ['bloqueante', 'alta', 'media', 'baja'] },
    tipo: { type: 'string', enum: ['funcional', 'ux', 'copy', 'accesibilidad', 'rendimiento'] },
    donde: { type: 'string', description: 'URL y parte de la pantalla' },
    pasos: { type: 'string', description: 'pasos numerados para reproducirlo' },
    esperado: { type: 'string' },
    observado: { type: 'string' },
    evidencia: { type: 'string', description: 'ruta de la captura guardada, o vacío' },
    sugerencia: { type: 'string' },
  },
  required: ['id', 'severidad', 'tipo', 'donde', 'pasos', 'esperado', 'observado', 'evidencia', 'sugerencia'],
}

const INFORME = {
  type: 'object',
  properties: {
    hallazgos: { type: 'array', items: HALLAZGO },
    funciono_bien: { type: 'array', items: { type: 'string' } },
    tarea_completada: { type: 'boolean' },
    minutos_hasta_completar: { type: 'number', description: 'estimación honesta; 0 si no la completaste' },
    preguntas_que_me_quedaron: { type: 'array', items: { type: 'string' } },
    mensajes_alert_vistos: { type: 'array', items: { type: 'string' } },
    resumen: { type: 'string', description: 'tres a cinco líneas, en primera persona, como la persona que sos' },
  },
  required: ['hallazgos', 'funciono_bien', 'tarea_completada', 'minutos_hasta_completar', 'preguntas_que_me_quedaron', 'mensajes_alert_vistos', 'resumen'],
}

const VEREDICTO = {
  type: 'object',
  properties: {
    reproducido: { type: 'boolean' },
    severidad_propia: { type: 'string', enum: ['bloqueante', 'alta', 'media', 'baja', 'no_es_problema'] },
    nota: { type: 'string', description: 'qué viste al seguir los pasos; si no se reprodujo, qué pasó en cambio' },
    evidencia: { type: 'string' },
  },
  required: ['reproducido', 'severidad_propia', 'nota', 'evidencia'],
}

// ---------------------------------------------------------------------------

phase('Auditar')
const informes = []
for (const p of seleccion) {
  const r = await auditor(`${COMUN}\nPERSONA: ${p.titulo}\n${p.consigna}`, {
    label: `auditor:${p.key}`,
    phase: 'Auditar',
    schema: INFORME,
    effort: 'high',
  })
  if (r) informes.push({ persona: p.key, titulo: p.titulo, ...r })
  log(`${p.key}: ${r ? r.hallazgos.length + ' hallazgos' : 'sin respuesta'}`)
}

// Informes de una corrida anterior (por ejemplo, el ensayo con una sola
// persona) que se quieren sumar a la deduplicación y la verificación sin
// volver a correr a esa persona: args.informesExtra = [{ persona, titulo,
// resumen, tarea_completada, minutos_hasta_completar, funciono_bien,
// preguntas_que_me_quedaron, mensajes_alert_vistos, hallazgos }].
const informesExtra = args && Array.isArray(args.informesExtra) ? args.informesExtra : []
for (const inf of informesExtra) {
  if (inf && Array.isArray(inf.hallazgos)) {
    informes.push(inf)
    log(`${inf.persona} (de una corrida anterior): ${inf.hallazgos.length} hallazgos`)
  }
}

// ---------------------------------------------------------------------------
// Consolidación. Seis personas describen el mismo problema con palabras
// distintas ("la tabla se corta" / "no se ven los importes"), así que una
// deduplicación por texto parecido casi nunca coincide: en la corrida del
// 13/9/2026 dejó 84 "únicos" de 84 y la verificación alcanzó a 12. Ahora un
// editor (sin navegador) agrupa los hallazgos por problema de fondo; si no
// responde, se cae a la deduplicación por texto.

const PESO = { bloqueante: 4, alta: 3, media: 2, baja: 1 }
const todos = informes.flatMap((inf) => (inf.hallazgos || []).map((h) => ({ ...h, persona: inf.persona, idGlobal: `${inf.persona}:${h.id}` })))
const porId = Object.fromEntries(todos.map((h) => [h.idGlobal, h]))

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim()
const palabras = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 3))
const jaccard = (a, b) => { const i = [...a].filter((w) => b.has(w)).length; const u = new Set([...a, ...b]).size; return u ? i / u : 0 }
const ruta = (s) => { const m = String(s || '').match(/https?:\/\/[^\s/]+(\/[^\s?#)]*)?/); return m ? (m[1] || '/') : norm(s).slice(0, 30) }

function dedupPorTexto() {
  const unicos = []
  for (const item0 of todos) {
    const item = { ...item0, personas: [item0.persona], miembros: [item0.idGlobal], tema: item0.observado.slice(0, 120) }
    const igual = unicos.find((u) => ruta(u.donde) === ruta(item.donde) && u.tipo === item.tipo && jaccard(palabras(u.observado), palabras(item.observado)) >= 0.5)
    if (igual) {
      if (!igual.personas.includes(item.persona)) igual.personas.push(item.persona)
      igual.miembros.push(item.idGlobal)
      if (PESO[item.severidad] > PESO[igual.severidad]) igual.severidad = item.severidad
      if (!igual.evidencia && item.evidencia) igual.evidencia = item.evidencia
    } else {
      unicos.push(item)
    }
  }
  return unicos
}

const GRUPOS = {
  type: 'object',
  properties: {
    grupos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tema: { type: 'string', description: 'una frase: el problema de fondo, no la pantalla' },
          severidad: { type: 'string', enum: ['bloqueante', 'alta', 'media', 'baja'] },
          tipo: { type: 'string', enum: ['funcional', 'ux', 'copy', 'accesibilidad', 'rendimiento'] },
          miembros: { type: 'array', items: { type: 'string' }, description: 'idGlobal de cada hallazgo del grupo' },
          representante: { type: 'string', description: 'idGlobal del hallazgo con los pasos más claros para reproducirlo' },
        },
        required: ['tema', 'severidad', 'tipo', 'miembros', 'representante'],
      },
    },
  },
  required: ['grupos'],
}

phase('Consolidar')
let unicos = []
if (todos.length > 0) {
  const editor = await agent(`Sos el editor de una auditoría de usabilidad. ${informes.length} personas distintas recorrieron el mismo sitio y reportaron ${todos.length} hallazgos, cada uno con su idGlobal. Agrupalos por PROBLEMA DE FONDO: el mismo defecto contado con otras palabras, o visto en otra pantalla, es el mismo grupo ("la tabla de contribuciones se corta en celular" y "no se ven los importes del empleador en el teléfono" son uno solo). Dos problemas distintos en el mismo lugar son dos grupos. Cada hallazgo va en exactamente un grupo; no inventes ninguno ni dejes ninguno afuera. La severidad del grupo es la más alta de sus miembros; el tipo, el más representativo. Elegí como representante el hallazgo con los pasos más claros para reproducirlo. No uses ninguna herramienta: todo lo que necesitás está acá.\n\nHALLAZGOS:\n${JSON.stringify(todos.map((h) => ({ idGlobal: h.idGlobal, severidad: h.severidad, tipo: h.tipo, donde: h.donde, observado: h.observado, pasos: h.pasos })))}`, {
    label: 'consolidar',
    phase: 'Consolidar',
    schema: GRUPOS,
    effort: 'high',
  })
  if (editor && Array.isArray(editor.grupos) && editor.grupos.length) {
    const vistos = new Set()
    for (const g of editor.grupos) {
      const miembros = (g.miembros || []).filter((id) => porId[id] && !vistos.has(id))
      if (!miembros.length) continue
      miembros.forEach((id) => vistos.add(id))
      const rep = porId[g.representante] && miembros.includes(g.representante) ? porId[g.representante] : porId[miembros[0]]
      const severidad = miembros.reduce((mx, id) => (PESO[porId[id].severidad] > PESO[mx] ? porId[id].severidad : mx), g.severidad in PESO ? g.severidad : 'baja')
      unicos.push({
        ...rep,
        tema: g.tema,
        severidad,
        tipo: g.tipo || rep.tipo,
        personas: [...new Set(miembros.map((id) => porId[id].persona))],
        miembros,
        evidencia: rep.evidencia || miembros.map((id) => porId[id].evidencia).find(Boolean) || '',
      })
    }
    // Lo que el editor haya olvidado entra como grupo propio: nada se pierde.
    for (const h of todos) {
      if (!vistos.has(h.idGlobal)) unicos.push({ ...h, tema: h.observado.slice(0, 120), personas: [h.persona], miembros: [h.idGlobal] })
    }
    log(`consolidado en ${unicos.length} temas (${editor.grupos.length} del editor)`)
  } else {
    unicos = dedupPorTexto()
    log(`el editor no respondió: deduplicación por texto, ${unicos.length} únicos`)
  }
}
unicos.sort((a, b) => PESO[b.severidad] - PESO[a.severidad] || b.personas.length - a.personas.length)
log(`${unicos.length} temas de ${todos.length} hallazgos reportados`)

// ---------------------------------------------------------------------------

const aVerificar = verificar ? unicos.filter((h) => PESO[h.severidad] >= PESO.media).slice(0, TOPE_VERIFICAR) : []
const noVerificados = unicos.filter((h) => !aVerificar.includes(h))
if (verificar && unicos.filter((h) => PESO[h.severidad] >= PESO.media).length > TOPE_VERIFICAR) {
  log(`ojo: había más de ${TOPE_VERIFICAR} hallazgos de severidad media o más; los que sobran quedan sin verificar`)
}

phase('Verificar')
const confirmados = []
const noReproducidos = []
for (const h of aVerificar) {
  const v = await auditor(`${COMUN}
Otra persona dice que encontró este problema. Vos no la conocés y no tenés por
qué creerle: seguí sus pasos exactamente, mirá qué pasa, y decidí.

DÓNDE: ${h.donde}
PASOS: ${h.pasos}
ESPERABA: ${h.esperado}
OBSERVÓ: ${h.observado}
SEVERIDAD QUE LE PUSO: ${h.severidad}

Si se reproduce, guardá UNA captura como evidencia. Si no se reproduce, contá
qué pasó en cambio. Si se reproduce pero te parece que no es un problema (es
razonable, o es gusto personal), marcalo como "no_es_problema" y explicá.`, {
    label: `verificar:${h.idGlobal}`,
    phase: 'Verificar',
    schema: VEREDICTO,
    effort: 'medium',
  })
  const conVeredicto = { ...h, veredicto: v || { reproducido: false, severidad_propia: 'baja', nota: 'el verificador no respondió', evidencia: '' } }
  if (v && v.reproducido && v.severidad_propia !== 'no_es_problema') confirmados.push(conVeredicto)
  else noReproducidos.push(conVeredicto)
  log(`${h.idGlobal}: ${v ? (v.reproducido ? 'reproducido (' + v.severidad_propia + ')' : 'no reproducido') : 'sin respuesta'}`)
}

return {
  url: URL,
  temas: unicos.map((u) => ({ tema: u.tema, severidad: u.severidad, tipo: u.tipo, personas: u.personas, miembros: u.miembros, representante: u.idGlobal })),
  personas: informes.map((i) => ({
    persona: i.persona, titulo: i.titulo, resumen: i.resumen, tarea_completada: i.tarea_completada,
    minutos: i.minutos_hasta_completar, funciono_bien: i.funciono_bien,
    preguntas: i.preguntas_que_me_quedaron, alertas: i.mensajes_alert_vistos, cantidad: (i.hallazgos || []).length,
  })),
  confirmados,
  noReproducidos,
  sinVerificar: noVerificados,
}
