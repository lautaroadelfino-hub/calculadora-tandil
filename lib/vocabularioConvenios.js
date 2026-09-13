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
 */
export const REGLAS_DE_CALCULO = {
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
    descripcion: "Conceptos propios del convenio que suman al sueldo.",
    porCada: ["label", "porcentaje", "aplica_sobre"],
    opcionesDe: { aplica_sobre: ["basico", "basico_mas_antiguedad"] },
  },
  retenciones_sindicales: {
    descripcion: "Descuentos del gremio.",
    porCada: ["label", "porcentaje", "valor_fijo", "base", "condicion", "reemplaza_obra_social"],
    opcionesDe: {
      base: ["remunerativo", "remunerativo_mas_no_remunerativo", "no_remunerativo"],
      condicion: ["siempre", "solo_afiliado", "solo_no_afiliado"],
    },
  },
};

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
];

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
