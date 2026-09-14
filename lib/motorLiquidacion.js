// lib/motorLiquidacion.js

import { calcularGananciasMensual } from "./calculoGanancias.js";
import { calcularContribuciones, resumenPorRubro } from "./calculoContribuciones.js";
import { POR_DEFECTO, RUBROS_DEL_COSTO_LABORAL } from "./vocabularioConvenios.js";
import {
  aplicarTopeArt9, APORTES_PERSONALES, AGUINALDO, RECARGOS_HORA_EXTRA, DIVISORES,
} from "./parametrosLaborales.js";

/**
 * Porcentaje TOTAL de antiguedad que corresponde a una cantidad de anios.
 *
 * Dos modos:
 *  - "lineal" (el default): porcentaje_por_anio multiplicado por los anios.
 *    Es lo que usa Comercio: 1% por anio.
 *  - "tramos": una tabla de {desde_años, porcentaje} donde el porcentaje es
 *    el TOTAL del tramo y NO se multiplica por los anios. Asi funcionan los
 *    convenios gastronomicos: a los 5 anios corresponde 4% del basico, no 5%.
 *
 * El motor anterior de gastronomicos (lib/calculoFEHGRA.js, borrado en la
 * limpieza de julio de 2026) tenia estos tramos y se perdieron al migrar al
 * motor unico: desde entonces ese convenio aproxima su antiguedad con un
 * porcentaje lineal, que paga de mas y cada vez mas a mayor antiguedad.
 */
/** El tramo de antigüedad que corresponde a estos años (modo tramos), o null. */
export function tramoDeAntiguedad(regla, años) {
  if (!regla || regla.modo !== "tramos" || !Array.isArray(regla.tramos)) return null;
  const anios = Number(años) || 0;
  let elegido = null;
  for (const tramo of [...regla.tramos].sort((a, b) => (Number(a.desde_años) || 0) - (Number(b.desde_años) || 0))) {
    if (anios >= (Number(tramo.desde_años) || 0)) elegido = tramo;
  }
  return elegido;
}

/** Cómo se nombra, en el recibo, la base de una retención sindical. */
const NOMBRE_BASE_RETENCION = {
  remunerativo: "remunerativo",
  remunerativo_mas_no_remunerativo: "remunerativo + no remunerativo con incidencia",
  no_remunerativo: "no remunerativo con incidencia",
  remunerativo_habitual: "remuneración habitual, sin horas extras, SAC ni vacaciones",
};

export function porcentajeAntiguedad(regla, años) {
  if (!regla) return 0;
  const anios = Number(años) || 0;
  if (anios <= 0) return 0;

  if (regla.modo === "tramos") {
    const tramos = Array.isArray(regla.tramos) ? regla.tramos : [];
    if (tramos.length === 0) {
      throw new Error(
        "El convenio dice que la antiguedad se calcula por tramos, pero no tiene ningun tramo cargado. Revisalo en el panel de administracion."
      );
    }
    const ordenados = [...tramos].sort((a, b) => (Number(a.desde_años) || 0) - (Number(b.desde_años) || 0));
    let porcentaje = 0;
    for (const tramo of ordenados) {
      if (anios >= (Number(tramo.desde_años) || 0)) porcentaje = Number(tramo.porcentaje) || 0;
    }
    return porcentaje;
  }

  // Modo lineal. Antes, si faltaba el porcentaje se usaba 0.01 (el de
  // Comercio): un convenio mal cargado se liquidaba como un Comercio
  // disfrazado y nadie se enteraba. Ahora avisa.
  if (regla.porcentaje_por_año === undefined || regla.porcentaje_por_año === null) {
    throw new Error(
      "El convenio tiene una regla de antiguedad pero no tiene cargado el porcentaje por anio. Revisalo en el panel de administracion."
    );
  }
  return (Number(regla.porcentaje_por_año) || 0) * anios;
}

/**
 * Resuelve sobre que monto se aplica un adicional, segun `aplica_sobre`.
 * Antes este campo se guardaba desde el panel pero el motor lo IGNORABA y
 * usaba siempre una base fija: un convenio con presentismo solo sobre el
 * basico se guardaba "bien" y liquidaba mal, en silencio.
 */
/**
 * ¿Corresponde aplicar esta regla, según lo que contestó la persona?
 *
 * Una regla que depende de la situación del empleado no puede estar siempre
 * prendida: tiene que preguntarse. El caso que lo destapó fue la asistencia
 * perfecta de gastronómicos, que sumaba un 10% TODOS los meses, hubiera
 * faltado o no. En el motor anterior era opcional y se perdió en la migración.
 *
 * La regla dice `depende_de: "<id de una pregunta>"` y, si quiere, `cuando:
 * false` para invertirla. La pregunta se declara en `inputs_requeridos` y la
 * pantalla ya la dibuja sola.
 *
 * `condicion: "solo_afiliado"` es la versión vieja de lo mismo, atada a mano a
 * la pregunta `afiliado_sindicato`. Se sigue aceptando.
 */
export function reglaCorresponde(regla, valoresUsuario, convenio, queEs) {
  if (regla.condicion === "solo_afiliado") return Boolean(valoresUsuario.afiliado_sindicato);
  if (regla.condicion === "solo_no_afiliado") return !valoresUsuario.afiliado_sindicato;

  if (!regla.depende_de) return true;

  // Si la pregunta no está declarada, la respuesta sería siempre "no" y el
  // concepto desaparecería del recibo sin que nadie se entere. Eso no se
  // adivina: se avisa.
  const declarada = (convenio.inputs_requeridos || []).some((i) => i.id === regla.depende_de);
  if (!declarada) {
    throw new Error(
      `${queEs} depende de la pregunta "${regla.depende_de}", que este convenio no le hace al usuario. ` +
        `Agregala en el panel de administración o sacale la condición.`
    );
  }

  const activaCon = regla.cuando === undefined ? true : Boolean(regla.cuando);
  return Boolean(valoresUsuario[regla.depende_de]) === activaCon;
}

/** Cómo se nombra cada unidad de los adicionales por unidad en el recibo. */
const UNIDADES_POR_UNIDAD = {
  dia: { singular: "día", plural: "días" },
  km: { singular: "km", plural: "km" },
  viaje: { singular: "viaje", plural: "viajes" },
  mes: { singular: "mes", plural: "meses" },
};

function baseSegunRegla(aplicaSobre, bases, porDefecto) {
  const elegida = aplicaSobre || porDefecto;
  if (!(elegida in bases)) {
    throw new Error(
      `El convenio dice que un adicional se calcula sobre "${elegida}", que el motor no conoce. Revisalo en el panel de administracion.`
    );
  }
  return bases[elegida];
}


/**
 * Arma el recibo de un mes.
 *
 * @param convenio        el documento del convenio (reglas_calculo, inputs_requeridos).
 * @param datosEscala     la escala del mes: { categorias: { [clave]: { basico, no_remunerativo } } }.
 * @param valoresUsuario  lo que la persona contestó en pantalla.
 * @param paramsGanancias la tabla de Ganancias del período, o null si no hay.
 * @param opciones        { periodo, tablaContribuciones, periodoContribuciones }
 *   - periodo: el mes que se liquida, "AAAA-MM". El motor no lo usa para elegir
 *     nada (la escala y las tablas ya vienen elegidas): lo expone en `metodo`
 *     para que el recibo diga de qué mes es la cuenta.
 *   - tablaContribuciones: el documento de parametros_contribuciones del
 *     período, para la sección del empleador (art. 140 inc. j) LCT). Tres
 *     estados, a propósito: un documento = se calcula; null = la pantalla lo
 *     buscó y no hay, así que se avisa; undefined = quien llama no pidió la
 *     sección (tests, otras herramientas) y no se dice nada.
 *   - periodoContribuciones: de qué período salió esa tabla, para decirlo.
 */
export function procesarRecibo(convenio, datosEscala, valoresUsuario, paramsGanancias = null, opciones = {}) {
  const categoriaElegida = valoresUsuario.categoria;
  const zonaElegida = valoresUsuario.zona;

  // Búsqueda inteligente: Cruza Zona + Categoría. Si no hay Zona, busca solo Categoría.
  let claveBusqueda = zonaElegida ? `${zonaElegida}|${categoriaElegida}` : categoriaElegida;
  let sueldoBase = datosEscala.categorias[claveBusqueda];

  // Fallback por seguridad (por si en la base está guardado sin zona)
  if (!sueldoBase) {
    sueldoBase = datosEscala.categorias[categoriaElegida];
  }

  if (!sueldoBase) {
    throw new Error("La categoría y escala seleccionada no existe en los registros de este mes.");
  }

  let lineasRecibo = [];

  // Cosas que el usuario cargó y el recibo NO usó. Antes esto pasaba en
  // silencio: un convenio sin regla de antigüedad igual pedía los años, la
  // persona escribía 20, el neto no se movía un peso y no había ni un aviso.
  // Quien lo notaba no podía saber si el dato no contaba o la cuenta estaba
  // mal, y eso es lo peor que le puede pasar a una calculadora que se ofrece
  // como referencia.
  const avisos = [];

  // --- 1. PRORRATEO ---
  // La jornada completa sale del convenio. Estuvo clavada en 48 desde siempre,
  // y eso la hacía parecer universal: no lo es. Un convenio de 44 o de 36 horas
  // prorrateaba mal, porque su escala está publicada para SU jornada completa,
  // no para 48. El motor gastronómico que se borró en julio de 2026 ya tenía el
  // divisor de horas como parámetro, con 200 apenas como valor por defecto.
  const jornada = {
    ...POR_DEFECTO.jornada,
    ...(convenio.reglas_calculo.jornada || {}),
  };
  const horasCompletas = Number(jornada.horas_semanales_completas) || 0;
  if (horasCompletas <= 0) {
    throw new Error(
      "El convenio tiene cargada una jornada completa de cero horas semanales. Revisalo en el panel de administración."
    );
  }

  // Las horas del puesto. Por debajo de la jornada completa se prorratea; por
  // encima NO: lo que excede la jornada son horas extras, no más básico. Hasta
  // el 13/9/2026 el prorrateo funcionaba para arriba (60 hs en Comercio daban
  // básico × 60/48) y la auditoría en frío lo encontró. Vacío o cero: jornada
  // completa, y se avisa, porque la pantalla mostraba un dato que la persona
  // no había cargado.
  const cargaHorariaPedida =
    valoresUsuario.carga_horaria === "" || valoresUsuario.carga_horaria === null || valoresUsuario.carga_horaria === undefined
      ? null
      : Number(valoresUsuario.carga_horaria);
  let cargaHoraria = horasCompletas;
  if (cargaHorariaPedida === null || !(cargaHorariaPedida > 0)) {
    if (valoresUsuario.carga_horaria !== undefined) {
      avisos.push(
        `No cargaste las horas semanales (o pusiste 0): el recibo se calculó por la jornada completa del convenio, ${horasCompletas} hs.`
      );
    }
  } else if (cargaHorariaPedida > horasCompletas) {
    avisos.push(
      `Cargaste ${cargaHorariaPedida} hs semanales, más que la jornada completa de ${horasCompletas}: el básico se calculó por jornada completa. Las horas que exceden la jornada se pagan como horas extras, no como más básico.`
    );
  } else {
    cargaHoraria = cargaHorariaPedida;
  }
  const factorCH = cargaHoraria / horasCompletas;

  // --- 2. SUELDOS BASE ---
  const basicoSinProrratear = sueldoBase.basico || 0;
  const nrSinProrratear = sueldoBase.no_remunerativo || 0;

  const basico = basicoSinProrratear * factorCH;
  const noRemuFijo = nrSinProrratear * factorCH;

  // Una SEGUNDA suma no remunerativa, sin incidencia: no genera antigüedad,
  // presentismo ni adicionales, y no entra en ninguna base (obra social,
  // sindicales, contribuciones). Va derecho al neto. Es la "asignación
  // extraordinaria por única vez" de los acuerdos de Comercio, que convive con
  // la suma no remunerativa de siempre, que sí genera adicionales. Hasta
  // septiembre de 2026 el modelo tenía una sola suma por categoría y no había
  // forma de cargarla. Se prorratea por la jornada, como todo lo de la escala.
  const nrSinIncidenciaSinProrratear = Number(sueldoBase.no_remunerativo_sin_incidencia) || 0;
  const noRemuSinIncidencia = nrSinIncidenciaSinProrratear * factorCH;

  // ¿Las sumas no remunerativas de la escala generan antigüedad, presentismo y
  // adicionales, o sólo lo hace el básico?
  //
  // Es una decisión contable, no técnica, y cambia según el convenio y según
  // la paritaria. El art. 11.3.3 del CCT 389/04, por ejemplo, dice que la base
  // de la antigüedad son "únicamente los salarios básicos correspondientes a
  // la categoría"; otras paritarias dicen expresamente que las sumas no
  // remunerativas no generan adicionales.
  //
  // Por eso es un dato del convenio y no una regla del código. El valor por
  // defecto es `true`, que es lo que el motor venía haciendo: así ningún
  // convenio ya cargado cambia hasta que se lo configure a propósito.
  const nrGeneraAdicionales = convenio.reglas_calculo.no_remunerativo_genera_adicionales !== false;
  const nrParaAdicionales = nrGeneraAdicionales ? noRemuFijo : 0;
  const nrParaAdicionalesSinProrratear = nrGeneraAdicionales ? nrSinProrratear : 0;

  // Cada línea lleva un `detalle` con la cuenta que la produjo (base,
  // porcentaje, cantidad): la pantalla lo muestra debajo del concepto. Es lo
  // que la auditoría del 13/9/2026 pidió para poder confiar en el recibo.
  const detalleEscala = (base) => ({ tipo: "escala", base, factor: factorCH, horas: cargaHoraria, horasCompletas });
  lineasRecibo.push({ concepto: "Sueldo Básico", tipo: "remunerativo", monto: basico, detalle: detalleEscala(basicoSinProrratear) });

  // --- 3. ADICIONALES FIJOS (Comercio / General) ---
  let antiguedad = 0; let antiguedadNR = 0;
  let antiguedadSinProrratear = 0;    let antiguedadNrSinProrratear = 0;

  const reglaAntiguedad = convenio.reglas_calculo.antiguedad;
  if (!reglaAntiguedad && Number(valoresUsuario.antiguedad_años) > 0) {
    avisos.push(
      "Este convenio no tiene cargada una regla de antigüedad, así que los años que pusiste no cambian el resultado."
    );
  }
  // Sobre qué se calcula la antigüedad. Camioneros (ítem 6.1.5 del CCT 40/89) la
  // calcula "sobre todos los conceptos remunerativos": básico más adicionales. En
  // ese caso se calcula DESPUÉS de los adicionales (sección 3.8), y ningún
  // adicional puede a su vez calcularse sobre la antigüedad.
  const antiguedadSobre = baseSegunRegla(
    reglaAntiguedad && reglaAntiguedad.aplica_sobre,
    { basico: "basico", basico_mas_adicionales: "basico_mas_adicionales" },
    "basico"
  );
  const antiguedadDiferida = antiguedadSobre === "basico_mas_adicionales";
  let pctAnt = 0;
  const añosAntiguedad = Number(valoresUsuario.antiguedad_años) || 0;
  if (reglaAntiguedad && añosAntiguedad > 0) {
    // pctAnt ya es el porcentaje TOTAL: en modo tramos no se multiplica por anios.
    pctAnt = porcentajeAntiguedad(reglaAntiguedad, añosAntiguedad);
  }
  // Cómo se llegó al porcentaje: por tramos (el tramo que tocó) o lineal (tanto
  // por año × años). Va en el detalle de la línea y en `metodo`.
  const comoAntiguedad = !reglaAntiguedad
    ? null
    : reglaAntiguedad.modo === "tramos"
      ? { modo: "tramos", tramo: tramoDeAntiguedad(reglaAntiguedad, añosAntiguedad), tramos: reglaAntiguedad.tramos, años: añosAntiguedad, porcentajeTotal: pctAnt }
      : { modo: "lineal", porAño: Number(reglaAntiguedad.porcentaje_por_año) || 0, años: añosAntiguedad, porcentajeTotal: pctAnt };
  const detalleAntiguedad = (base, baseLabel) => ({
    tipo: "porcentaje",
    alicuota: pctAnt,
    base,
    baseLabel,
    años: añosAntiguedad,
    ...(comoAntiguedad && comoAntiguedad.modo === "tramos" ? { tramo: comoAntiguedad.tramo } : { porAño: comoAntiguedad ? comoAntiguedad.porAño : undefined }),
  });
  if (pctAnt > 0 && !antiguedadDiferida) {
    antiguedad = basico * pctAnt;
    antiguedadNR = nrParaAdicionales * pctAnt;
    antiguedadSinProrratear = basicoSinProrratear * pctAnt;
    antiguedadNrSinProrratear = nrParaAdicionalesSinProrratear * pctAnt;
    if (antiguedad > 0) {
      lineasRecibo.push({ concepto: "Antigüedad", tipo: "remunerativo", monto: antiguedad, detalle: detalleAntiguedad(basico, "el básico") });
    }
  }

  let presentismo = 0; let presentismoNR = 0;
  let presentismoSinProrratear = 0;      let presentismoNrSinProrratear = 0;
  let pctPres = 0;
  let basePresentismoLabel = "";

  const reglaPresentismo = convenio.reglas_calculo.presentismo;
  if (reglaPresentismo && antiguedadDiferida && reglaPresentismo.aplica_sobre === "basico_mas_antiguedad") {
    throw new Error(
      "El convenio calcula la antigüedad sobre básico más adicionales y el presentismo sobre básico más antigüedad: las dos cosas a la vez no se pueden. Revisalo en el panel de administración."
    );
  }
  if (reglaPresentismo) {
    // Antes, si faltaba el porcentaje se usaba 0.08333 (el de Comercio).
    if (reglaPresentismo.porcentaje === undefined || reglaPresentismo.porcentaje === null) {
      throw new Error(
        "El convenio tiene una regla de presentismo pero no tiene cargado el porcentaje. Revisalo en el panel de administracion."
      );
    }
    pctPres = Number(reglaPresentismo.porcentaje) || 0;
    basePresentismoLabel = (reglaPresentismo.aplica_sobre || "basico_mas_antiguedad") === "basico" ? "el básico" : "básico + antigüedad";
    // `aplica_sobre` ahora se respeta de verdad.
    const basesPres = (rem, nr, ant, antNr) => ({
      basico: { rem, nr },
      basico_mas_antiguedad: { rem: rem + ant, nr: nr + antNr },
    });
    const realPres = baseSegunRegla(
      reglaPresentismo.aplica_sobre,
      basesPres(basico, nrParaAdicionales, antiguedad, antiguedadNR),
      "basico_mas_antiguedad"
    );
    const jornadaPres = baseSegunRegla(
      reglaPresentismo.aplica_sobre,
      basesPres(basicoSinProrratear, nrParaAdicionalesSinProrratear, antiguedadSinProrratear, antiguedadNrSinProrratear),
      "basico_mas_antiguedad"
    );
    presentismo = realPres.rem * pctPres;
    presentismoNR = realPres.nr * pctPres;
    presentismoSinProrratear = jornadaPres.rem * pctPres;
    presentismoNrSinProrratear = jornadaPres.nr * pctPres;
    if (presentismo > 0) {
      lineasRecibo.push({
        concepto: "Presentismo", tipo: "remunerativo", monto: presentismo,
        detalle: { tipo: "porcentaje", alicuota: pctPres, base: realPres.rem, baseLabel: basePresentismoLabel },
      });
    }
  }

  // --- 3.5 ADICIONALES DINÁMICOS (Para Gastronómicos y futuros gremios) ---
  let extraAdicionalesRem = 0;
  let extraAdicionalesNR = 0;
  let adicionalesSinProrratear = 0;
  let adicionalesNrSinProrratear = 0;
  let lineasNRDinamicas = [];

  if (convenio.reglas_calculo.adicionales_remunerativos) {
    const adicionales = convenio.reglas_calculo.adicionales_remunerativos;
    for (const [id_adicional, regla] of Object.entries(adicionales)) {
      // Antes, todo adicional se aplicaba siempre. Ahora puede colgarse de una
      // pregunta, que es lo que corresponde cuando depende del empleado.
      if (!reglaCorresponde(regla, valoresUsuario, convenio, `El adicional "${regla.label || id_adicional}"`)) continue;

      if (antiguedadDiferida && regla.aplica_sobre === "basico_mas_antiguedad") {
        throw new Error(
          `El adicional "${regla.label || id_adicional}" se calcula sobre básico más antigüedad, pero en este convenio la antigüedad se calcula sobre básico más adicionales: es circular. Revisalo en el panel de administración.`
        );
      }
      let pct = regla.porcentaje || 0;
      const basesAdicional = {
        basico: { rem: basico, nr: nrParaAdicionales, remSinProrratear: basicoSinProrratear, nrSinProrratear: nrParaAdicionalesSinProrratear },
        basico_mas_antiguedad: {
          rem: basico + antiguedad, nr: nrParaAdicionales + antiguedadNR,
          remSinProrratear: basicoSinProrratear + antiguedadSinProrratear, nrSinProrratear: nrParaAdicionalesSinProrratear + antiguedadNrSinProrratear,
        },
      };
      const baseAdicional = baseSegunRegla(regla.aplica_sobre, basesAdicional, "basico");
      let monto = baseAdicional.rem * pct;
      let montoNR = baseAdicional.nr * pct;

      if (monto > 0) {
        const baseAdicionalLabel = (regla.aplica_sobre || "basico") === "basico" ? "el básico" : "básico + antigüedad";
        lineasRecibo.push({
          concepto: regla.label || id_adicional, tipo: "remunerativo", monto: monto,
          detalle: { tipo: "porcentaje", alicuota: pct, base: baseAdicional.rem, baseLabel: baseAdicionalLabel },
        });
        extraAdicionalesRem += monto;
        extraAdicionalesNR += montoNR;
        adicionalesSinProrratear += baseAdicional.remSinProrratear * pct;
        adicionalesNrSinProrratear += baseAdicional.nrSinProrratear * pct;

        // Se guarda el desglose No Remunerativo para inyectarlo ordenado abajo
        if (montoNR > 0) {
          lineasNRDinamicas.push({
            concepto: `${regla.label || id_adicional} s/ No Remunerativo`, tipo: "no_remunerativo", monto: montoNR,
            detalle: { tipo: "porcentaje", alicuota: pct, base: baseAdicional.nr, baseLabel: "la suma no remunerativa" },
          });
        }
      }
    }
  }

  // --- 3.7 ADICIONALES POR UNIDAD (por día, por km, por viaje, por mes) ---
  // La comida, el viático especial, la pernoctada y los kilómetros de
  // Camioneros: un importe que fija cada planilla, multiplicado por una cantidad
  // que la persona informa (días trabajados, km recorridos, pernoctes). El
  // importe vive en la escala del período; la regla, en el convenio. Si la
  // escala no trae el importe, se frena: no hay número razonable que inventar.
  // No se prorratean por la jornada: son por día o por km efectivos.
  let porUnidadRem = 0;
  let porUnidadNRConIncidencia = 0;
  let porUnidadNRSinIncidencia = 0;
  const lineasNRPorUnidad = [];
  const valoresDelPeriodo = datosEscala.valores_del_periodo || {};
  if (convenio.reglas_calculo.adicionales_por_unidad) {
    for (const [id_unidad, regla] of Object.entries(convenio.reglas_calculo.adicionales_por_unidad)) {
      const queEs = `El adicional "${regla.label || id_unidad}"`;
      if (!reglaCorresponde(regla, valoresUsuario, convenio, queEs)) continue;
      if (!(regla.unidad in UNIDADES_POR_UNIDAD)) {
        throw new Error(`${queEs} tiene la unidad "${regla.unidad}", que el motor no conoce. Revisalo en el panel de administración.`);
      }
      if (regla.naturaleza !== "remunerativo" && regla.naturaleza !== "no_remunerativo") {
        throw new Error(`${queEs} tiene la naturaleza "${regla.naturaleza}", que el motor no conoce. Revisalo en el panel de administración.`);
      }
      if (!(regla.valor in valoresDelPeriodo)) {
        throw new Error(
          `${queEs} usa el valor "${regla.valor}" y la escala de este período no lo trae. Cargalo en /admin → Escalas paritarias → Valores del período.`
        );
      }
      let cantidad = 1;
      if (regla.unidad !== "mes") {
        if (!regla.cantidad_de) {
          throw new Error(`${queEs} se paga por ${UNIDADES_POR_UNIDAD[regla.unidad].singular} pero no dice de qué pregunta sale la cantidad. Revisalo en el panel de administración.`);
        }
        const declarada = (convenio.inputs_requeridos || []).some((i) => i.id === regla.cantidad_de);
        if (!declarada) {
          throw new Error(`${queEs} toma la cantidad de la pregunta "${regla.cantidad_de}", que este convenio no le hace al usuario. Agregala en el panel de administración.`);
        }
        cantidad = Number(valoresUsuario[regla.cantidad_de]) || 0;
      }
      const valorUnitario = Number(valoresDelPeriodo[regla.valor]) || 0;
      const monto = valorUnitario * cantidad;
      if (monto <= 0) continue;
      const detallePorUnidad = { tipo: "por_unidad", cantidad, unidad: regla.unidad, valorUnitario };
      const u = UNIDADES_POR_UNIDAD[regla.unidad];
      const etiqueta = regla.unidad === "mes" ? (regla.label || id_unidad) : `${regla.label || id_unidad} (${cantidad} ${cantidad === 1 ? u.singular : u.plural})`;
      if (regla.naturaleza === "remunerativo") {
        porUnidadRem += monto;
        lineasRecibo.push({ concepto: etiqueta, tipo: "remunerativo", monto, porUnidad: true, detalle: detallePorUnidad });
      } else if (regla.con_incidencia === true) {
        porUnidadNRConIncidencia += monto;
        lineasNRPorUnidad.push({ concepto: etiqueta, tipo: "no_remunerativo", monto, porUnidad: true, detalle: detallePorUnidad });
      } else {
        porUnidadNRSinIncidencia += monto;
        lineasNRPorUnidad.push({ concepto: etiqueta, tipo: "no_remunerativo", monto, porUnidad: true, sinIncidencia: true, detalle: detallePorUnidad });
      }
    }
  }

  // --- 3.8 ANTIGÜEDAD SOBRE BÁSICO MÁS ADICIONALES ---
  // Recién ahora están todos los adicionales remunerativos. Los variables
  // (horas extras, SAC, vacaciones) no entran: se calculan después y sobre
  // una base que ya incluye la antigüedad.
  if (pctAnt > 0 && antiguedadDiferida) {
    antiguedad = (basico + extraAdicionalesRem + porUnidadRem) * pctAnt;
    antiguedadNR = nrParaAdicionales * pctAnt;
    antiguedadSinProrratear = (basicoSinProrratear + adicionalesSinProrratear + porUnidadRem) * pctAnt;
    antiguedadNrSinProrratear = nrParaAdicionalesSinProrratear * pctAnt;
    if (antiguedad > 0) {
      // Va justo después del básico, donde la espera cualquiera que lea un recibo.
      lineasRecibo.splice(1, 0, {
        concepto: "Antigüedad", tipo: "remunerativo", monto: antiguedad,
        detalle: detalleAntiguedad(basico + extraAdicionalesRem + porUnidadRem, "básico + adicionales remunerativos"),
      });
    }
  }

  // --- 4. HORAS EXTRAS ---
  let montoHorasExtras50 = 0;
  let montoHorasExtras100 = 0;
  let montoHorasExtrasTotal = 0;
  let valorHora = null;
  let horasMensuales = null;

  const horas50 = valoresUsuario.horas_extras_50 ? Number(valoresUsuario.horas_extras_50) : 0;
  const horas100 = valoresUsuario.horas_extras_100 ? Number(valoresUsuario.horas_extras_100) : 0;

  if (horas50 > 0 || horas100 > 0) {
    const divisorHoras = Number(jornada.divisor_horas_mensuales) || 0;
    if (divisorHoras <= 0) {
      throw new Error(
        "El convenio tiene cargado un divisor de horas mensuales de cero. Revisalo en el panel de administración."
      );
    }
    horasMensuales = divisorHoras * factorCH;

    // Valor hora calculado sobre el total de fijos. Los conceptos variables
    // (kilómetros, otras horas extras, SAC, vacaciones) no entran.
    const baseHora = basico + antiguedad + presentismo + extraAdicionalesRem;
    valorHora = horasMensuales > 0 ? (baseHora / horasMensuales) : 0;
    const detalleHora = (horas, recargo) => ({ tipo: "hora_extra", cantidad: horas, valorHora, recargo, baseHora, divisor: horasMensuales });

    if (horas50 > 0) {
      montoHorasExtras50 = valorHora * RECARGOS_HORA_EXTRA.al50 * horas50;
      lineasRecibo.push({ concepto: `Horas Extras 50% (${horas50} hs)`, tipo: "remunerativo", monto: montoHorasExtras50, detalle: detalleHora(horas50, RECARGOS_HORA_EXTRA.al50) });
    }

    if (horas100 > 0) {
      montoHorasExtras100 = valorHora * RECARGOS_HORA_EXTRA.al100 * horas100;
      lineasRecibo.push({ concepto: `Horas Extras 100% (${horas100} hs)`, tipo: "remunerativo", monto: montoHorasExtras100, detalle: detalleHora(horas100, RECARGOS_HORA_EXTRA.al100) });
    }

    montoHorasExtrasTotal = montoHorasExtras50 + montoHorasExtras100;
  }

  // --- 4.5 SAC (MEDIO AGUINALDO) Y PLUS VACACIONAL ---
  // Conceptos opcionales que el usuario activa para simular un mes concreto
  // (SAC se cobra en junio/diciembre; el plus vacacional, el mes de vacaciones).
  const baseHabitual = basico + antiguedad + presentismo + extraAdicionalesRem;

  let sac = 0;
  if (valoresUsuario.incluir_sac) {
    // Medio aguinaldo: la mitad de la mejor remuneración mensual del semestre.
    // En la simulación se toma la remuneración habitual del mes.
    sac = baseHabitual * AGUINALDO.proporcionDeLaMejorRemuneracion;
    lineasRecibo.push({
      concepto: "SAC (medio aguinaldo)", tipo: "remunerativo", monto: sac,
      detalle: { tipo: "proporcion", alicuota: AGUINALDO.proporcionDeLaMejorRemuneracion, base: baseHabitual, baseLabel: "la remuneración habitual del mes" },
    });
  }

  let plusVacacional = 0;
  const diasVac = valoresUsuario.dias_vacaciones ? Number(valoresUsuario.dias_vacaciones) : 0;
  if (diasVac > 0) {
    // El día de vacaciones se paga sobre base/25 (en vez de /30): el "plus"
    // por día equivale a base/150. (base/25 - base/30 = base/150)
    const plusPorDia = baseHabitual / DIVISORES.divisorVacaciones;
    plusVacacional = plusPorDia * diasVac;
    lineasRecibo.push({
      concepto: `Plus vacacional (${diasVac} días)`, tipo: "remunerativo", monto: plusVacacional,
      detalle: { tipo: "vacaciones", cantidad: diasVac, valorUnitario: plusPorDia, baseLabel: `remuneración habitual / ${DIVISORES.divisorVacaciones}` },
    });
  }

  const extrasVariables = montoHorasExtrasTotal + sac + plusVacacional;

  // --- 5. DESGLOSE NO REMUNERATIVO ---
  if (noRemuFijo > 0) lineasRecibo.push({ concepto: "Asignación No Remunerativa Base", tipo: "no_remunerativo", monto: noRemuFijo, detalle: detalleEscala(nrSinProrratear) });
  if (antiguedadNR > 0) lineasRecibo.push({ concepto: "Antigüedad No Remunerativa", tipo: "no_remunerativo", monto: antiguedadNR, detalle: detalleAntiguedad(nrParaAdicionales, "la suma no remunerativa") });
  if (presentismoNR > 0) lineasRecibo.push({ concepto: "Presentismo No Remunerativo", tipo: "no_remunerativo", monto: presentismoNR, detalle: { tipo: "porcentaje", alicuota: pctPres, base: presentismoNR / pctPres, baseLabel: "la suma no remunerativa" + (basePresentismoLabel === "el básico" ? "" : " + su antigüedad") } });

  lineasNRDinamicas.forEach(linea => lineasRecibo.push(linea));
  lineasNRPorUnidad.forEach((linea) => lineasRecibo.push(linea));

  if (noRemuSinIncidencia > 0) {
    lineasRecibo.push({
      concepto: datosEscala.nombre_sin_incidencia || "Suma no remunerativa sin incidencia",
      tipo: "no_remunerativo",
      monto: noRemuSinIncidencia,
      sinIncidencia: true,
      detalle: detalleEscala(nrSinIncidenciaSinProrratear),
    });
  }

  // --- 6. CONSTRUCCIÓN DE LAS BASES EXACTAS ---
  const totalRemunerativo = basico + antiguedad + presentismo + extraAdicionalesRem + extrasVariables + porUnidadRem;
  // Lo no remunerativo "con incidencia" es lo que entra en las bases (obra
  // social, sindicales, contribuciones); la suma sin incidencia sólo se cobra.
  const totalNoRemunerativoConIncidencia = noRemuFijo + antiguedadNR + presentismoNR + extraAdicionalesNR + porUnidadNRConIncidencia;
  const totalNoRemunerativo = totalNoRemunerativoConIncidencia + noRemuSinIncidencia + porUnidadNRSinIncidencia;

  const REM_REAL = totalRemunerativo;
  const TOTAL_REAL = totalRemunerativo + totalNoRemunerativoConIncidencia;

  // --- 6.5 LA TABLA DEL PERÍODO Y LOS CRITERIOS CONTABLES ---
  // La tabla de contribuciones (parametros_contribuciones) trae, además de las
  // alícuotas del empleador, las bases del art. 9 y tres criterios contables
  // que el dueño puede cambiar desde /admin sin desplegar. Tres estados, a
  // propósito: un documento = se usa; null = la pantalla la buscó y no hay;
  // undefined = quien llama no pidió la sección del empleador.
  const pideSeccionEmpleador = opciones.tablaContribuciones !== undefined;
  const tablaContribuciones = opciones.tablaContribuciones || null;
  const criteriosContables = (tablaContribuciones && tablaContribuciones.criterios_contables) || {};
  // Decidido con el dueño (13/9/2026): el SAC paga contribuciones.
  const sacIntegraBaseContribuciones = criteriosContables.sac_integra_base_contribuciones !== false;
  // Decidido con el dueño: la obra social del trabajador se calcula sobre la
  // remuneración de SU jornada, prorrateada, igual que jubilación y PAMI y que
  // Nacional Sistema. Hasta septiembre de 2026 se calculaba sobre la de jornada
  // completa, sin que estuviera escrito en ningún lado. Vale también sin tabla:
  // el default es el default.
  const obraSocialProrrateada = criteriosContables.obra_social_trabajador_prorratea_jornada !== false;
  // Decidido con el dueño: los topes mínimo y máximo del art. 9 (Ley 24.241) se
  // aplican a los aportes del trabajador. Las bases son dato del período: sin
  // tabla no hay bases, no se aplica, y `metodo` lo dice.
  const basesDelPeriodo = tablaContribuciones && tablaContribuciones.bases_art9;
  const topeArt9 =
    criteriosContables.tope_art9_en_aportes !== false && basesDelPeriodo && Number(basesDelPeriodo.maxima) > 0
      ? { minima: Number(basesDelPeriodo.minima) || 0, maxima: Number(basesDelPeriodo.maxima) }
      : null;
  const conTope = (base) => (topeArt9 ? aplicarTopeArt9(base, topeArt9) : base);

  const totalRemSinProrratear = basicoSinProrratear + antiguedadSinProrratear + presentismoSinProrratear + adicionalesSinProrratear;
  const totalNrSinProrratear = nrSinProrratear + antiguedadNrSinProrratear + presentismoNrSinProrratear + adicionalesNrSinProrratear;
  const baseOsSinProrratear = totalRemSinProrratear + totalNrSinProrratear;

  // La base de los aportes de ley y la de la obra social, con el tope si hay.
  // TOTAL_REAL ya trae remunerativo + no remunerativo de la jornada del puesto,
  // con las horas extras; la otra forma es la de jornada completa más los
  // variables, que es lo que se hacía antes y queda disponible con el criterio.
  const baseAportes = conTope(REM_REAL);
  const baseOS = conTope(obraSocialProrrateada ? TOTAL_REAL : baseOsSinProrratear + extrasVariables);

  // --- 7. RETENCIONES LEY NACIONAL ---
  let totalRetenciones = 0;

  // Los aportes de ley son constantes de parametrosLaborales.js (Regla 2 del
  // criterio: ningún número suelto adentro del motor). Cada uno dice sobre qué
  // base va y a qué rubro del Decreto 407/2026 pertenece, para la composición
  // del costo laboral que el recibo muestra al final (lo que pone cada lado).
  for (const aporte of APORTES_PERSONALES) {
    let base;
    if (aporte.base === "remunerativo") base = baseAportes;
    else if (aporte.base === "obra_social") base = baseOS;
    else throw new Error(`El aporte "${aporte.label}" se calcula sobre "${aporte.base}", que el motor no conoce.`);
    const monto = base * aporte.porcentaje;
    const baseLabel =
      (aporte.base === "remunerativo" ? "remunerativo" : "remunerativo + no remunerativo con incidencia") +
      (topeArt9 ? ", con los topes del art. 9" : "");
    lineasRecibo.push({
      concepto: aporte.label, tipo: "retencion", monto, rubro: aporte.rubro,
      detalle: { tipo: "porcentaje", alicuota: aporte.porcentaje, base, baseLabel },
    });
    totalRetenciones += monto;
  }

  // --- 8. RETENCIONES SINDICALES ---
  if (convenio.reglas_calculo.retenciones_sindicales) {
    const retenciones = convenio.reglas_calculo.retenciones_sindicales;

    for (const [id_retencion, regla] of Object.entries(retenciones)) {
      // Esta retencion reemplaza la obra social del 3%, asi que no se suma.
      // El flag explicito es el que manda; el id "obra_social_extra" se sigue
      // aceptando por compatibilidad con los convenios ya cargados, pero es
      // fragil: si alguien borra esa retencion en el panel y la vuelve a
      // agregar, el id se regenera a partir del nombre y deja de coincidir,
      // con lo cual la obra social se descontaria dos veces.
      if (regla.reemplaza_obra_social === true || id_retencion === "obra_social_extra") continue;
      if (!reglaCorresponde(regla, valoresUsuario, convenio, `La retención "${regla.label || id_retencion}"`)) continue;

      // La base de la retención. Una palabra que no se conoce FRENA: antes caía
      // callada al remunerativo.
      let baseCalculo = REM_REAL;
      if (regla.base === "remunerativo_mas_no_remunerativo") baseCalculo = TOTAL_REAL;
      else if (regla.base === "no_remunerativo") baseCalculo = totalNoRemunerativoConIncidencia;
      // Los conceptos mensuales normales y habituales, sin horas extras, SAC ni
      // vacaciones: la base de la contribución solidaria con el tope del
      // Decreto 612/26.
      else if (regla.base === "remunerativo_habitual") baseCalculo = baseHabitual;
      else if (regla.base && regla.base !== "remunerativo") {
        throw new Error(
          `La retención "${regla.label || id_retencion}" se calcula sobre "${regla.base}", que el motor no conoce. Revisala en el panel de administración.`
        );
      }

      let monto = 0;
      if (regla.valor_fijo) {
        monto = regla.valor_fijo;
      } else if (regla.porcentaje) {
        monto = baseCalculo * regla.porcentaje;
      }

      if (monto > 0) {
        let nombreConcepto = regla.label || id_retencion.replace(/_/g, ' ').toUpperCase();
        const detalle = regla.valor_fijo
          ? { tipo: "suma_fija", baseLabel: regla.condicion === "solo_afiliado" ? "sólo afiliados" : regla.condicion === "solo_no_afiliado" ? "sólo no afiliados" : "" }
          : { tipo: "porcentaje", alicuota: Number(regla.porcentaje) || 0, base: baseCalculo, baseLabel: NOMBRE_BASE_RETENCION[regla.base || "remunerativo"] + (regla.condicion === "solo_afiliado" ? "; sólo afiliados" : regla.condicion === "solo_no_afiliado" ? "; sólo no afiliados" : "") };
        lineasRecibo.push({ concepto: nombreConcepto, tipo: "retencion", monto: monto, rubro: "sindical", detalle });
        totalRetenciones += monto;
      }
    }
  }

  // --- 9. IMPUESTO A LAS GANANCIAS (estimación mensual, automática) ---
  // Se aplica SIEMPRE que haya tablas cargadas para el período (desde Firestore).
  // Si el sueldo no supera el mínimo, el impuesto da 0 y no se muestra línea.
  // Los aportes ya calculados (jubilación, PAMI, OS, sindicato) son deducibles.
  let gananciasInfo = null;
  if (paramsGanancias) {
    gananciasInfo = calcularGananciasMensual({
      gananciaBrutaMensual: REM_REAL,
      aportesDeduciblesMensual: totalRetenciones,
      params: paramsGanancias,
      cargas: {
        conyuge: valoresUsuario.conyuge,
        hijos: valoresUsuario.hijos,
        hijosIncapacitados: valoresUsuario.hijos_incapacitados,
      },
    });
    if (gananciasInfo.impuesto > 0) {
      lineasRecibo.push({
        concepto: "Impuesto a las Ganancias (estimado)",
        tipo: "retencion",
        monto: gananciasInfo.impuesto,
        detalle: { tipo: "ganancias", alicuota: gananciasInfo.alicuotaTramo, base: gananciasInfo.baseImponible },
      });
      totalRetenciones += gananciasInfo.impuesto;
    }
  }

  // --- 10. CONTRIBUCIONES DEL EMPLEADOR (art. 140 inc. j) LCT) ---
  // Desde el Decreto 407/2026 el recibo tiene que mostrar lo que el empleador
  // paga por este trabajador, antes del bruto. La aritmética vive en
  // lib/calculoContribuciones.js, que recibe la tabla del período como
  // Ganancias recibe la suya. Acá se lee del convenio lo que es del convenio
  // (la ART típica y las contribuciones propias del CCT) y se decide la base.

  // La ART: la persona la escribe en porcentaje (3 = 3%), como la ve; el
  // convenio guarda la típica de su actividad en fracción. Manda la persona.
  const reglaArt = convenio.reglas_calculo.art;
  const artDelUsuario = valoresUsuario.art_alicuota;
  const artInformada = artDelUsuario !== undefined && artDelUsuario !== null && artDelUsuario !== "";
  const artTipica = reglaArt && reglaArt.alicuota_tipica != null ? Number(reglaArt.alicuota_tipica) : null;
  const artAlicuota = artInformada ? (Number(artDelUsuario) || 0) / 100 : artTipica;
  // La pantalla prefija el campo con la típica: si la persona la dejó como
  // estaba, el recibo dice que es la del convenio, no que la informó ella.
  const artLaInformoLaPersona = artInformada && (artTipica === null || Math.abs(artAlicuota - artTipica) > 1e-9);

  // Lo que el convenio manda pagar al empleador. El rubro se valida acá, como
  // todo lo que viene del convenio: si no es uno de los siete, se frena.
  const contribucionesDelConvenio = Object.entries(convenio.reglas_calculo.contribuciones_convenio || {}).map(
    ([id_contribucion, regla]) => {
      if (!RUBROS_DEL_COSTO_LABORAL.some((r) => r.id === regla.rubro)) {
        throw new Error(
          `La contribución "${regla.label || id_contribucion}" del convenio tiene el rubro "${regla.rubro}", ` +
            `que el motor no conoce. Revisala en el panel de administración.`
        );
      }
      return {
        id: id_contribucion,
        label: regla.label || id_contribucion.replace(/_/g, " ").toUpperCase(),
        porcentaje: regla.porcentaje,
        valor_fijo: regla.valor_fijo,
        base: regla.base,
        rubro: regla.rubro,
      };
    }
  );

  let contribuciones = { lineas: [], total: 0, regimen: null, detraccion: null, avisos: [] };
  if (pideSeccionEmpleador) {
    contribuciones = calcularContribuciones({
      remunerativo: totalRemunerativo - (sacIntegraBaseContribuciones ? 0 : sac),
      noRemunerativo: totalNoRemunerativoConIncidencia,
      basico,
      factorJornada: factorCH,
      tabla: tablaContribuciones,
      regimenId: valoresUsuario.regimen_contribuciones || null,
      art: { alicuota: artAlicuota, sumaFija: Number(valoresUsuario.art_suma_fija) || 0 },
      delConvenio: contribucionesDelConvenio,
    });
    contribuciones.lineas.forEach((l) => lineasRecibo.push(l));
    contribuciones.avisos.forEach((a) => avisos.push(a));
  }
  const totalContribuciones = contribuciones.total;
  const costoLaboral = totalRemunerativo + totalNoRemunerativo + totalContribuciones;
  const horasMensualesDelPuesto = (Number(jornada.divisor_horas_mensuales) || 0) * factorCH;

  const netoAPagar = totalRemunerativo + totalNoRemunerativo - totalRetenciones;

  return {
    detalle: lineasRecibo,
    totales: {
      bruto: totalRemunerativo,
      retenciones: totalRetenciones,
      noRemunerativo: totalNoRemunerativo,
      neto: netoAPagar,
      // Del lado del empleador. Claves planas a propósito: `totales` es un
      // objeto de números y hay un invariante que lo exige.
      contribuciones: totalContribuciones,
      costoEmpleador: costoLaboral,
    },
    ganancias: gananciasInfo,
    // La sección del empleador, o null si no hay tabla para el período.
    costoEmpleador: contribuciones.regimen
      ? {
          regimen: contribuciones.regimen,
          periodoTabla: opciones.periodoContribuciones || null,
          detraccion: contribuciones.detraccion,
          totalContribuciones,
          costoLaboral,
          porcentajeSobreBruto: totalRemunerativo > 0 ? (totalContribuciones / totalRemunerativo) * 100 : 0,
          costoPorHora: horasMensualesDelPuesto > 0 ? costoLaboral / horasMensualesDelPuesto : null,
          costoPorDia: costoLaboral / DIVISORES.diasDelMes,
          // Los siete rubros del decreto, con lo que pone cada lado, el % sobre
          // el total de las cargas y el % sobre el costo laboral (no son lo
          // mismo, y la auditoría encontró que el recibo los confundía).
          rubros: resumenPorRubro(lineasRecibo, costoLaboral).rubros,
          totalCargas: resumenPorRubro(lineasRecibo, costoLaboral).total,
          art: { alicuota: artAlicuota, estimada: true, pendiente: artAlicuota === null },
          sacIntegraBase: sacIntegraBaseContribuciones,
        }
      : null,
    avisos,
    // Con qué supuestos se hizo la cuenta. El criterio pide que, cuando un
    // parámetro puede venir del convenio, el recibo diga cuál se usó: si no,
    // no hay forma de saber por qué dos convenios dan distinto.
    metodo: {
      jornadaCompletaSemanal: horasCompletas,
      jornadaDelPuesto: cargaHoraria,
      jornadaPedida: cargaHorariaPedida,
      divisorHorasMensuales: Number(jornada.divisor_horas_mensuales) || null,
      laDeclaraElConvenio: Boolean(convenio.reglas_calculo.jornada),
      noRemunerativoGeneraAdicionales: nrGeneraAdicionales,
      noRemunerativoSinIncidencia: noRemuSinIncidencia + porUnidadNRSinIncidencia,
      noRemunerativoConIncidencia: totalNoRemunerativoConIncidencia,
      antiguedadSobre,
      antiguedad: comoAntiguedad,
      valorHora,
      horasMensualesDelPuesto: horasMensuales,
      periodo: opciones.periodo || null,
      // Del lado del empleador.
      periodoTablaContribuciones: opciones.periodoContribuciones || null,
      regimenContribuciones: contribuciones.regimen ? contribuciones.regimen.id : null,
      artAlicuota,
      artLaInformoLaPersona,
      sacIntegraBaseContribuciones,
      // Del lado del trabajador (criterios de la tabla, encendidos por defecto).
      obraSocialProrrateada,
      topeArt9: topeArt9 ? { minima: topeArt9.minima, maxima: topeArt9.maxima } : null,
    },
  };
}