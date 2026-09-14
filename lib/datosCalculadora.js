// lib/datosCalculadora.js
// Arma, en el servidor, todo lo que la calculadora de un convenio necesita
// para pintarse de una vez: el convenio, sus períodos, la escala del período
// inicial y las tablas de contribuciones y de Ganancias que le corresponden,
// más los valores con los que arranca el formulario (incluida una simulación
// que venga en la URL). Antes esto lo hacía el navegador con el SDK de
// Firebase, en cinco lecturas encadenadas, y la persona esperaba mirando
// "Cargando las escalas…".
//
// Es una función pura salvo por `io`, que se puede reemplazar en los tests.

import { cache } from "react";
import { leerDocumento, listarColeccion, listarIds } from "./firestoreRest";
import { periodoDeTabla } from "./periodos";
import { valoresIniciales } from "./inputsIniciales";
import { regimenPredeterminado } from "./contribucionesForm";
import { entradasDesdeParams } from "./permalink";

export const LECTOR_REAL = { leerDocumento, listarColeccion, listarIds };
const IO = LECTOR_REAL;

/**
 * El documento del convenio, leído una sola vez por pedido: lo usan el layout
 * (para responder 404 antes de empezar a mandar la página), la metadata y la
 * página. `cache` de React memoiza mientras dura el render del pedido.
 */
export const convenioCacheado = cache((convenioId) => leerDocumento(`convenios/${convenioId}`));

/** Un id de convenio válido: letras, números, guiones, puntos y guiones bajos (nunca "." ni ".."). */
export const ID_DE_CONVENIO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const esIdDeConvenio = (id) => ID_DE_CONVENIO.test(String(id || "")) && id !== "." && id !== "..";

/** Los valores con los que arranca el formulario: los del convenio, la ART típica y lo que traiga la URL. */
export function valoresDeArranque(convenio, enLaUrl, tablaContribuciones) {
  const artTipica = convenio.reglas_calculo?.art?.alicuota_tipica;
  const valores = {
    ...valoresIniciales(convenio.inputs_requeridos),
    // La ART arranca en la alícuota típica que el convenio declara (en
    // fracción; acá se muestra en %). Si no declara ninguna, queda vacía y el
    // recibo lo avisa: no se inventa un 3%.
    art_alicuota: artTipica != null ? +(Number(artTipica) * 100).toFixed(4) : "",
    art_suma_fija: 0,
    ...(enLaUrl && enLaUrl.valores ? enLaUrl.valores : {}),
  };
  // El régimen por defecto es el que la tabla marca, salvo que la URL traiga
  // uno que exista en ella.
  const predeterminado = tablaContribuciones ? regimenPredeterminado(tablaContribuciones) : null;
  const elegido = valores.regimen_contribuciones;
  const sigueExistiendo =
    elegido && tablaContribuciones && tablaContribuciones.regimenes && tablaContribuciones.regimenes[elegido];
  valores.regimen_contribuciones = sigueExistiendo ? elegido : predeterminado || "";
  return valores;
}

/**
 * @param {string} convenioId
 * @param {string|URLSearchParams} busqueda  la query string de la página ("?periodo=2026-08&…" o vacía)
 * @returns lo que recibe <CalculadoraConvenio inicial={…}>, o null si el convenio no existe.
 */
export async function cargarDatosDeCalculadora(convenioId, busqueda = "", io = IO) {
  // El convenio y sus escalas son imprescindibles: si fallan, falla la página.
  // Las tablas de contribuciones y de Ganancias no: sin ellas el recibo sale
  // igual y avisa que faltan, como cuando no están cargadas. Un tropiezo
  // pasajero de Firestore en una tabla no tiene que tumbar la calculadora.
  const [convenio, escalas, periodosContribuciones, periodosGanancias] = await Promise.all([
    io.leerDocumento(`convenios/${convenioId}`),
    io.listarColeccion(`convenios/${convenioId}/escalas`, { campos: ["mes_vigencia"] }),
    io.listarIds("parametros_contribuciones").catch(() => []),
    io.listarIds("parametros_ganancias").catch(() => []),
  ]);
  if (!convenio) return null;

  // Los períodos con escala cargada, los más nuevos arriba.
  const periodos = escalas
    .map((e) => ({ id: e.id, nombre: e.mes_vigencia }))
    .sort((a, b) => b.id.localeCompare(a.id));

  // Si la URL trae una simulación (un link compartido, un F5), se vuelve a
  // cargar tal cual y se calcula sola.
  const enLaUrl = entradasDesdeParams(convenio, busqueda);
  const pedido = enLaUrl.periodo && periodos.some((p) => p.id === enLaUrl.periodo) ? enLaUrl.periodo : null;
  const periodoInicial = pedido || (periodos.length ? periodos[0].id : "");

  const contrib = periodoDeTabla(periodosContribuciones, periodoInicial);
  const gan = periodoDeTabla(periodosGanancias, periodoInicial);
  const [escala, tablaContribuciones, tablaGanancias] = await Promise.all([
    periodoInicial ? io.leerDocumento(`convenios/${convenioId}/escalas/${periodoInicial}`) : null,
    contrib.periodo ? io.leerDocumento(`parametros_contribuciones/${contrib.periodo}`).catch(() => null) : null,
    gan.periodo ? io.leerDocumento(`parametros_ganancias/${gan.periodo}`).catch(() => null) : null,
  ]);

  return {
    convenio,
    periodos,
    periodoInicial,
    autoCalcular: Boolean(enLaUrl.periodo),
    valores: valoresDeArranque(convenio, enLaUrl, tablaContribuciones),
    escalas: periodoInicial && escala ? { [periodoInicial]: escala } : {},
    // La tabla del período inicial ya elegida (null = se buscó y no hay), y la
    // lista de períodos cargados para elegir la de otro mes sin volver a listar.
    tablaContribuciones: { periodo: contrib.periodo, datos: tablaContribuciones || null },
    contribuciones: {
      periodos: periodosContribuciones,
      tablas: contrib.periodo && tablaContribuciones ? { [contrib.periodo]: tablaContribuciones } : {},
    },
    ganancias: {
      periodos: periodosGanancias,
      tablas: gan.periodo && tablaGanancias ? { [gan.periodo]: tablaGanancias } : {},
    },
  };
}

/** La query string de `searchParams` (Next la entrega como objeto) tal como la leería el navegador. */
export function busquedaDesdeSearchParams(searchParams) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else if (v != null) q.set(k, String(v));
  }
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}
