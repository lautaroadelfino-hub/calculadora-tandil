// lib/motorLiquidacion.js

import { calcularGananciasMensual } from "./calculoGanancias.js";

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
function baseSegunRegla(aplicaSobre, bases, porDefecto) {
  const elegida = aplicaSobre || porDefecto;
  if (!(elegida in bases)) {
    throw new Error(
      `El convenio dice que un adicional se calcula sobre "${elegida}", que el motor no conoce. Revisalo en el panel de administracion.`
    );
  }
  return bases[elegida];
}


export function procesarRecibo(convenio, datosEscala, valoresUsuario, paramsGanancias = null) {
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
  const cargaHoraria = valoresUsuario.carga_horaria ? Number(valoresUsuario.carga_horaria) : 48;
  const factorCH = cargaHoraria / 48;

  // --- 2. SUELDOS BASE ---
  const basico48 = sueldoBase.basico || 0;
  const nrEscala48 = sueldoBase.no_remunerativo || 0;

  const basico = basico48 * factorCH;
  const noRemuFijo = nrEscala48 * factorCH;

  lineasRecibo.push({ concepto: "Sueldo Básico", tipo: "remunerativo", monto: basico });

  // --- 3. ADICIONALES FIJOS (Comercio / General) ---
  let antiguedad = 0; let antiguedadNR = 0;
  let antig48 = 0;    let antigNR48 = 0;

  const reglaAntiguedad = convenio.reglas_calculo.antiguedad;
  if (!reglaAntiguedad && Number(valoresUsuario.antiguedad_años) > 0) {
    avisos.push(
      "Este convenio no tiene cargada una regla de antigüedad, así que los años que pusiste no cambian el resultado."
    );
  }
  if (reglaAntiguedad && valoresUsuario.antiguedad_años > 0) {
    // pctAnt ya es el porcentaje TOTAL: en modo tramos no se multiplica por anios.
    const pctAnt = porcentajeAntiguedad(reglaAntiguedad, valoresUsuario.antiguedad_años);
    antiguedad = basico * pctAnt;
    antiguedadNR = noRemuFijo * pctAnt;
    antig48 = basico48 * pctAnt;
    antigNR48 = nrEscala48 * pctAnt;
    if (antiguedad > 0) {
      lineasRecibo.push({ concepto: "Antigüedad", tipo: "remunerativo", monto: antiguedad });
    }
  }

  let presentismo = 0; let presentismoNR = 0;
  let pres48 = 0;      let presNR48 = 0;

  const reglaPresentismo = convenio.reglas_calculo.presentismo;
  if (reglaPresentismo) {
    // Antes, si faltaba el porcentaje se usaba 0.08333 (el de Comercio).
    if (reglaPresentismo.porcentaje === undefined || reglaPresentismo.porcentaje === null) {
      throw new Error(
        "El convenio tiene una regla de presentismo pero no tiene cargado el porcentaje. Revisalo en el panel de administracion."
      );
    }
    const pctPres = Number(reglaPresentismo.porcentaje) || 0;
    // `aplica_sobre` ahora se respeta de verdad.
    const basesPres = (rem, nr, ant, antNr) => ({
      basico: { rem, nr },
      basico_mas_antiguedad: { rem: rem + ant, nr: nr + antNr },
    });
    const realPres = baseSegunRegla(
      reglaPresentismo.aplica_sobre,
      basesPres(basico, noRemuFijo, antiguedad, antiguedadNR),
      "basico_mas_antiguedad"
    );
    const jornadaPres = baseSegunRegla(
      reglaPresentismo.aplica_sobre,
      basesPres(basico48, nrEscala48, antig48, antigNR48),
      "basico_mas_antiguedad"
    );
    presentismo = realPres.rem * pctPres;
    presentismoNR = realPres.nr * pctPres;
    pres48 = jornadaPres.rem * pctPres;
    presNR48 = jornadaPres.nr * pctPres;
    if (presentismo > 0) {
      lineasRecibo.push({ concepto: "Presentismo", tipo: "remunerativo", monto: presentismo });
    }
  }

  // --- 3.5 ADICIONALES DINÁMICOS (Para Gastronómicos y futuros gremios) ---
  let extraAdicionalesRem = 0;
  let extraAdicionalesNR = 0;
  let extraAdicionales48 = 0;
  let extraAdicionalesNR48 = 0;
  let lineasNRDinamicas = [];

  if (convenio.reglas_calculo.adicionales_remunerativos) {
    const adicionales = convenio.reglas_calculo.adicionales_remunerativos;
    for (const [id_adicional, regla] of Object.entries(adicionales)) {
      let pct = regla.porcentaje || 0;
      const basesAdicional = {
        basico: { rem: basico, nr: noRemuFijo, rem48: basico48, nr48: nrEscala48 },
        basico_mas_antiguedad: {
          rem: basico + antiguedad, nr: noRemuFijo + antiguedadNR,
          rem48: basico48 + antig48, nr48: nrEscala48 + antigNR48,
        },
      };
      const baseAdicional = baseSegunRegla(regla.aplica_sobre, basesAdicional, "basico");
      let monto = baseAdicional.rem * pct;
      let montoNR = baseAdicional.nr * pct;
      
      if (monto > 0) {
        lineasRecibo.push({ concepto: regla.label || id_adicional, tipo: "remunerativo", monto: monto });
        extraAdicionalesRem += monto;
        extraAdicionalesNR += montoNR;
        extraAdicionales48 += baseAdicional.rem48 * pct;
        extraAdicionalesNR48 += baseAdicional.nr48 * pct;

        // Se guarda el desglose No Remunerativo para inyectarlo ordenado abajo
        if (montoNR > 0) {
          lineasNRDinamicas.push({ concepto: `${regla.label || id_adicional} s/ No Remunerativo`, tipo: "no_remunerativo", monto: montoNR });
        }
      }
    }
  }

  // --- 4. HORAS EXTRAS ---
  let montoHorasExtras50 = 0;
  let montoHorasExtras100 = 0;
  let montoHorasExtrasTotal = 0;

  const horas50 = valoresUsuario.horas_extras_50 ? Number(valoresUsuario.horas_extras_50) : 0;
  const horas100 = valoresUsuario.horas_extras_100 ? Number(valoresUsuario.horas_extras_100) : 0;

  if (horas50 > 0 || horas100 > 0) {
    const divisorHoras = 200; 
    const horasMensuales = divisorHoras * factorCH;
    
    // Valor hora calculado sobre el total de fijos
    const baseHora = basico + antiguedad + presentismo + extraAdicionalesRem;
    const valorHora = horasMensuales > 0 ? (baseHora / horasMensuales) : 0;

    if (horas50 > 0) {
      montoHorasExtras50 = valorHora * 1.5 * horas50;
      lineasRecibo.push({ concepto: `Horas Extras 50% (${horas50} hs)`, tipo: "remunerativo", monto: montoHorasExtras50 });
    }
    
    if (horas100 > 0) {
      montoHorasExtras100 = valorHora * 2.0 * horas100;
      lineasRecibo.push({ concepto: `Horas Extras 100% (${horas100} hs)`, tipo: "remunerativo", monto: montoHorasExtras100 });
    }

    montoHorasExtrasTotal = montoHorasExtras50 + montoHorasExtras100;
  }

  // --- 4.5 SAC (MEDIO AGUINALDO) Y PLUS VACACIONAL ---
  // Conceptos opcionales que el usuario activa para simular un mes concreto
  // (SAC se cobra en junio/diciembre; el plus vacacional, el mes de vacaciones).
  const baseHabitual = basico + antiguedad + presentismo + extraAdicionalesRem;

  let sac = 0;
  if (valoresUsuario.incluir_sac) {
    // Medio aguinaldo: 50% de la mejor remuneración mensual del semestre.
    // En la simulación se toma la remuneración habitual del mes.
    sac = baseHabitual * 0.5;
    lineasRecibo.push({ concepto: "SAC (medio aguinaldo)", tipo: "remunerativo", monto: sac });
  }

  let plusVacacional = 0;
  const diasVac = valoresUsuario.dias_vacaciones ? Number(valoresUsuario.dias_vacaciones) : 0;
  if (diasVac > 0) {
    // El día de vacaciones se paga sobre base/25 (en vez de /30): el "plus"
    // por día equivale a base/150. (base/25 - base/30 = base/150)
    const plusPorDia = baseHabitual / 150;
    plusVacacional = plusPorDia * diasVac;
    lineasRecibo.push({ concepto: `Plus vacacional (${diasVac} días)`, tipo: "remunerativo", monto: plusVacacional });
  }

  const extrasVariables = montoHorasExtrasTotal + sac + plusVacacional;

  // --- 5. DESGLOSE NO REMUNERATIVO ---
  if (noRemuFijo > 0) lineasRecibo.push({ concepto: "Asignación No Remunerativa Base", tipo: "no_remunerativo", monto: noRemuFijo });
  if (antiguedadNR > 0) lineasRecibo.push({ concepto: "Antigüedad No Remunerativa", tipo: "no_remunerativo", monto: antiguedadNR });
  if (presentismoNR > 0) lineasRecibo.push({ concepto: "Presentismo No Remunerativo", tipo: "no_remunerativo", monto: presentismoNR });
  
  lineasNRDinamicas.forEach(linea => lineasRecibo.push(linea));

  // --- 6. CONSTRUCCIÓN DE LAS BASES EXACTAS ---
  const totalRemunerativo = basico + antiguedad + presentismo + extraAdicionalesRem + extrasVariables;
  const totalNoRemunerativo = noRemuFijo + antiguedadNR + presentismoNR + extraAdicionalesNR;

  const REM_REAL = totalRemunerativo;
  const TOTAL_REAL = totalRemunerativo + totalNoRemunerativo;

  const rem48_total = basico48 + antig48 + pres48 + extraAdicionales48;
  const nr48_total = nrEscala48 + antigNR48 + presNR48 + extraAdicionalesNR48;
  const OS_48 = rem48_total + nr48_total;

  const baseOS = OS_48 + extrasVariables;

  // --- 7. RETENCIONES LEY NACIONAL ---
  let totalRetenciones = 0;

  const retencionesNacionales = [
    { nombre: "Jubilación (11%)", porcentaje: 0.11 },
    { nombre: "Ley 19.032 PAMI (3%)", porcentaje: 0.03 }
  ];

  retencionesNacionales.forEach(ret => {
    let monto = REM_REAL * ret.porcentaje;
    lineasRecibo.push({ concepto: ret.nombre, tipo: "retencion", monto: monto });
    totalRetenciones += monto;
  });

  let montoOS = baseOS * 0.03;
  lineasRecibo.push({ concepto: "Obra Social (3%)", tipo: "retencion", monto: montoOS });
  totalRetenciones += montoOS;

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
      if (regla.condicion === "solo_afiliado" && !valoresUsuario.afiliado_sindicato) continue;
      if (regla.condicion === "solo_no_afiliado" && valoresUsuario.afiliado_sindicato) continue;

      let baseCalculo = REM_REAL;
      if (regla.base === "remunerativo_mas_no_remunerativo") baseCalculo = TOTAL_REAL;
      else if (regla.base === "no_remunerativo") baseCalculo = totalNoRemunerativo;

      let monto = 0;
      if (regla.valor_fijo) {
        monto = regla.valor_fijo;
      } else if (regla.porcentaje) {
        monto = baseCalculo * regla.porcentaje;
      }

      if (monto > 0) {
        let nombreConcepto = regla.label || id_retencion.replace(/_/g, ' ').toUpperCase();
        lineasRecibo.push({ concepto: nombreConcepto, tipo: "retencion", monto: monto });
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
      });
      totalRetenciones += gananciasInfo.impuesto;
    }
  }

  const netoAPagar = totalRemunerativo + totalNoRemunerativo - totalRetenciones;

  return {
    detalle: lineasRecibo,
    totales: {
      bruto: totalRemunerativo,
      retenciones: totalRetenciones,
      noRemunerativo: totalNoRemunerativo,
      neto: netoAPagar
    },
    ganancias: gananciasInfo,
    avisos,
  };
}