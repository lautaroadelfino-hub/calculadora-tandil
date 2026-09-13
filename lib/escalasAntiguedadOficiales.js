// lib/escalasAntiguedadOficiales.js
//
// Escalas de antigüedad copiadas del texto OFICIAL del convenio, para poder
// cargarlas de un botón en vez de tipear veinte tramos a mano.
//
// POR QUÉ ESTÁ ACÁ Y NO EN LA BASE: es el mismo patrón que ya usa la pestaña de
// Ganancias con `data/ganancias.seed.json`. El archivo es una SEMILLA: no lo lee
// la calculadora, lo lee el panel para ofrecerte cargarlo. El dato que manda
// sigue siendo el de Firestore, que cargás vos.
//
// REGLA PARA AGREGAR UNA ESCALA ACÁ: sólo del texto oficial del convenio, con el
// link y la fecha en que se leyó. Nunca de un resumen ni de una calculadora de
// terceros. Al buscar la del CCT 389/04, una página que salía primera en Google
// daba 6% para el tramo de 7 a 9 años; el texto oficial dice 5%. Un resumen mal
// hecho se ve exactamente igual que uno bien hecho.

export const ESCALAS_ANTIGUEDAD = [
  {
    id: "cct-389-04",
    nombre: "Gastronómicos y hoteleros (UTHGRA – FEHGRA)",
    cct: "389/04",
    articulo: "11.3.1",
    fuente: "https://servicios.infoleg.gob.ar/infolegInternet/anexos/95000-99999/99666/norma.htm",
    leidoEl: "2026-09-13",
    // El artículo dice textualmente "sin resultar acumulable": el porcentaje de
    // cada tramo es el TOTAL que se paga, no se multiplica por los años.
    //
    // El texto oficial repite cada porcentaje en dos renglones (por ejemplo "a 1
    // año cumplido y hasta los 2" y "de los 2 años hasta los 3", ambos 1%). Acá
    // se anota sólo el año en que el porcentaje CAMBIA, que es lo que el motor
    // necesita.
    //
    // Ojo, el texto oficial tiene una errata propia: dice "De los 18 años hasta
    // los 14 años el doce por ciento". Por el resto de la escala se entiende que
    // son 19, que es donde arranca el 14%.
    tramos: [
      { desde_años: 1, porcentaje: 0.01 },
      { desde_años: 3, porcentaje: 0.02 },
      { desde_años: 5, porcentaje: 0.04 },
      { desde_años: 7, porcentaje: 0.05 },
      { desde_años: 9, porcentaje: 0.06 },
      { desde_años: 11, porcentaje: 0.07 },
      { desde_años: 13, porcentaje: 0.08 },
      { desde_años: 15, porcentaje: 0.1 },
      { desde_años: 17, porcentaje: 0.12 },
      { desde_años: 19, porcentaje: 0.14 },
    ],
    // Lo que el mismo artículo dice sobre la base, en el 11.3.3, y que hay que
    // decidir con criterio contable: "los salarios básicos que sirven de base de
    // cálculo del presente Adicional por Antigüedad estarán constituidos
    // únicamente por el importe equivalente a los salarios básicos
    // correspondiente a la categoría o nivel del trabajador".
    notaSobreLaBase:
      "El artículo 11.3.3 dice que la base son únicamente los salarios básicos de la categoría. " +
      "Si las sumas no remunerativas de la escala generan o no antigüedad es una decisión contable: " +
      "se configura con la casilla de sumas no remunerativas del convenio.",
  },
];

/** Busca una escala oficial por su id. */
export function escalaOficial(id) {
  return ESCALAS_ANTIGUEDAD.find((e) => e.id === id) || null;
}

/** Los tramos, en el formato que usa el formulario del panel. */
export function tramosParaElFormulario(id) {
  const escala = escalaOficial(id);
  if (!escala) return [];
  return escala.tramos.map((t) => ({
    desdeAños: t.desde_años,
    porcentajePct: Math.round(t.porcentaje * 10000) / 100,
  }));
}
