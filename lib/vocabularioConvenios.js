// lib/vocabularioConvenios.js
//
// EL MODELO DE UN CONVENIO, ESCRITO EN UN SOLO LUGAR.
//
// Esto es la lista completa de lo que un convenio puede decir. No es
// documentación que acompaña al código: es la definición contra la que se
// verifica el código. Si algo no está acá, no existe.
//
// POR QUÉ EXISTE: el error más caro y más repetido del proyecto fue siempre el
// mismo — un campo que el panel guarda y el motor no lee, o al revés. Pasó con
// `aplica_sobre` del presentismo, con los `adicionales_remunerativos`, y con
// `aplica_sobre` de la antigüedad. Las tres veces el convenio se guardaba
// "bien" y liquidaba mal sin un solo mensaje.
//
// Mientras el modelo vivía repartido entre el formulario y el motor, no había
// forma de notar la diferencia. Ahora hay una sola lista, y test/vocabulario.test.js
// la usa para comprobar que los tres lados coinciden: lo que se guarda, lo que
// el motor lee, y lo que dice esta hoja.
//
// CÓMO SE AGREGA UNA REGLA NUEVA: primero se agrega acá. Si no está acá, el
// test se pone rojo apenas aparezca guardada en un convenio.

/**
 * Las reglas de cálculo que un convenio puede declarar.
 *
 * - `campos`: los campos propios de esa regla.
 * - `porCada`: para las reglas que son una lista (los nombres de cada ítem los
 *   pone el usuario, así que lo que se define es la forma de cada uno).
 * - `anidado`: la forma de un campo que a su vez es una lista de objetos.
 * - `opcionesDe`: para los campos que sólo aceptan ciertas palabras. El motor
 *   tiene que FRENAR con cualquier otra, nunca elegir una por su cuenta.
 * - `opcionesDeLista`: igual que `opcionesDe`, pero las opciones son una lista
 *   exportada de este archivo y se la nombra. El motor la importa y la usa.
 */
export const REGLAS_DE_CALCULO = {
  no_remunerativo_genera_adicionales: {
    descripcion:
      "Si las sumas no remunerativas de la escala generan antigüedad, presentismo " +
      "y adicionales, o si sólo los genera el básico. Por defecto sí, que es lo " +
      "que el motor venía haciendo. Es criterio contable y cambia por convenio.",
    campos: [],
  },
  jornada: {
    descripcion:
      "La jornada completa del convenio y el divisor para el valor de la hora. " +
      "Si el convenio no la declara, se usan 48 horas semanales y divisor 200.",
    campos: ["horas_semanales_completas", "divisor_horas_mensuales"],
  },
  antiguedad: {
    descripcion: "Cuánto suma la antigüedad. Se calcula siempre sobre el básico.",
    campos: ["porcentaje_por_año", "modo", "tramos"],
    anidado: { tramos: ["desde_años", "porcentaje"] },
    opcionesDe: { modo: ["tramos"] },
  },
  presentismo: {
    descripcion: "El premio por asistencia, como porcentaje.",
    campos: ["porcentaje", "aplica_sobre"],
    opcionesDe: { aplica_sobre: ["basico", "basico_mas_antiguedad"] },
  },
  adicionales_remunerativos: {
    descripcion:
      "Conceptos propios del convenio que suman al sueldo. Con `depende_de` se " +
      "cuelgan de una pregunta, en vez de aplicarse siempre.",
    porCada: ["label", "porcentaje", "aplica_sobre", "depende_de", "cuando"],
    opcionesDe: { aplica_sobre: ["basico", "basico_mas_antiguedad"] },
  },
  retenciones_sindicales: {
    descripcion: "Descuentos del gremio.",
    porCada: [
      "label", "porcentaje", "valor_fijo", "base", "condicion",
      "reemplaza_obra_social", "depende_de", "cuando",
    ],
    opcionesDe: {
      base: ["remunerativo", "remunerativo_mas_no_remunerativo", "no_remunerativo"],
      condicion: ["siempre", "solo_afiliado", "solo_no_afiliado"],
    },
  },
  contribuciones_convenio: {
    descripcion:
      "Lo que el convenio manda pagar al EMPLEADOR por cada trabajador: aportes a " +
      "cámaras, fondos, seguros propios del CCT. La cara patronal de " +
      "retenciones_sindicales. Van al recibo en la sección del costo laboral.",
    porCada: ["label", "porcentaje", "valor_fijo", "base", "rubro"],
    opcionesDe: { base: ["remunerativo", "remunerativo_mas_no_remunerativo"] },
    // Los rubros son los siete del Decreto 407/2026, una lista con nombre.
    opcionesDeLista: { rubro: "RUBROS_DEL_COSTO_LABORAL" },
  },
  art: {
    descripcion:
      "La alícuota de ART típica de la actividad, en fracción (0.03 = 3%). Es el " +
      "valor por defecto de la pregunta: cada empleador negocia la suya y el " +
      "recibo la muestra siempre como estimada. Si el convenio no la declara y la " +
      "persona no la carga, la fila queda sin monto y se avisa: no se inventa.",
    campos: ["alicuota_tipica"],
  },
};

/**
 * CÓMO SE CUELGA UNA REGLA DE UNA PREGUNTA
 *
 * Una regla que depende de la situación del empleado no puede estar siempre
 * prendida: tiene que preguntarse. El caso que lo destapó fue la asistencia
 * perfecta de gastronómicos, que sumaba un 10% TODOS los meses, hubiera faltado
 * o no. En el motor anterior era opcional y se perdió en la migración.
 *
 *   depende_de: "<id de una pregunta de sí/no que el convenio declare>"
 *   cuando:     true | false   (qué respuesta la activa; si falta, es `true`)
 *
 * La pregunta se declara en `inputs_requeridos` como cualquier otra, y la
 * pantalla ya la dibuja sola. Si una regla apunta a una pregunta que el convenio
 * no declara, el motor FRENA: sin la pregunta, la respuesta sería siempre "no" y
 * el concepto desaparecería del recibo sin que nadie se entere.
 *
 * `condicion: "solo_afiliado"` / `"solo_no_afiliado"` es la versión vieja de lo
 * mismo, atada a mano a la pregunta `afiliado_sindicato`. Se sigue aceptando
 * para no romper lo ya cargado.
 */
export const CAMPOS_DE_CONDICION = ["depende_de", "cuando", "condicion"];

/**
 * Los valores que usa el motor cuando el convenio no dice nada.
 *
 * Viven acá y no en `parametrosLaborales.js` a propósito: son parte del modelo
 * del convenio (lo que vale cuando el convenio no lo dice), no constantes de
 * ley ni datos que cambian por período.
 *
 * OJO CON EL 48 Y EL 200: estuvieron escritos adentro del motor desde siempre y
 * eso los hacía parecer universales. No lo son. El motor gastronómico que se
 * borró en julio de 2026 tenía el divisor como PARÁMETRO, con 200 apenas como
 * valor por defecto. Son los valores más comunes, no los únicos.
 */
export const POR_DEFECTO = {
  jornada: {
    horas_semanales_completas: 48,
    divisor_horas_mensuales: 200,
  },
  // Para el costo diario informativo del empleador (costo laboral / 30). Es el
  // criterio que usaba el panel del empleador; no es de ley.
  diasDelMesParaCostoDiario: 30,
};

/**
 * Los siete rubros en que el Decreto 407/2026 (Anexo I, art. 5°) manda agrupar
 * la composición del costo laboral total en el recibo. Cada contribución —de
 * la tabla del período o del convenio— dice a cuál pertenece, y el motor arma
 * el resumen. No se inventan rubros: lo que no encaja en ninguno va a "otros".
 */
export const RUBROS_DEL_COSTO_LABORAL = [
  { id: "sindical", label: "Sindical" },
  { id: "seguridad_social", label: "Seguridad social" },
  { id: "obra_social", label: "Obra social" },
  { id: "inssjp", label: "I.N.S.S.J.P." },
  { id: "art", label: "A.R.T." },
  { id: "camaras", label: "Cámaras y entidades empresariales" },
  { id: "otros", label: "Otros" },
];

/** Los datos generales del documento, fuera de reglas_calculo. */
export const CAMPOS_GENERALES = [
  "id", "nombre", "cct", "activo", "sector",
  "inputs_requeridos",
  "ultimo_periodo", "ultimo_periodo_nombre",
];

/**
 * Las preguntas que la calculadora le hace a la persona.
 *
 * DEL CONVENIO: la respuesta sale del documento del convenio o de su escala.
 * Para saber cuánto vale hay que ir a /admin.
 *
 * UNIVERSAL: la respuesta sale de la ley y vale igual para todos los convenios.
 * Para saber cuánto vale hay que ir al Boletín Oficial.
 *
 * Un aviso que conviene tener presente: que un número esté escrito fijo adentro
 * del motor NO prueba que sea universal. Prueba que todavía nadie necesitó otro.
 */
export const PREGUNTAS_DEL_CONVENIO = ["categoria", "zona", "antiguedad_años", "afiliado_sindicato"];

export const PREGUNTAS_UNIVERSALES = [
  "carga_horaria",
  "horas_extras_50",
  "horas_extras_100",
  "incluir_sac",
  "dias_vacaciones",
  "conyuge",
  "hijos",
  "hijos_incapacitados",
  // Del lado del empleador. El régimen se elige (MiPyME por defecto, desde la
  // tabla); la ART la escribe la persona en porcentaje y, si no, vale la típica
  // que el convenio declara en `art.alicuota_tipica`.
  "regimen_contribuciones",
  "art_alicuota",
  "art_suma_fija",
];

/**
 * Los tipos de línea que el motor produce en `detalle`. La pantalla dibuja cada
 * uno en su sección. Lo que no está acá no existe: una línea con otro tipo es
 * un error que tiene que verse, no desaparecer en silencio (que es lo que
 * pasaba: la pantalla filtraba por tres tipos sin `else`).
 */
export const TIPOS_DE_LINEA = ["remunerativo", "no_remunerativo", "retencion", "contribucion"];

/** Preguntas que no todo convenio tiene que declarar. */
export const PREGUNTAS_OPCIONALES = ["zona"];

/** Todos los campos estructurales que el modelo define, con su ruta. */
export function camposDelModelo() {
  const rutas = [];
  for (const [regla, forma] of Object.entries(REGLAS_DE_CALCULO)) {
    rutas.push(regla);
    for (const campo of forma.campos || []) rutas.push(`${regla}.${campo}`);
    for (const campo of forma.porCada || []) rutas.push(`${regla}.*.${campo}`);
    for (const [padre, hijos] of Object.entries(forma.anidado || {})) {
      for (const hijo of hijos) rutas.push(`${regla}.${padre}[].${hijo}`);
    }
  }
  return rutas;
}
