// lib/motorLiquidacion.js

import { calcularGananciasMensual } from "./calculoGanancias.js";

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

  if (convenio.reglas_calculo.antiguedad && valoresUsuario.antiguedad_años > 0) {
    const pctAnt = convenio.reglas_calculo.antiguedad.porcentaje_por_año || 0.01;
    antiguedad = basico * pctAnt * valoresUsuario.antiguedad_años;
    antiguedadNR = noRemuFijo * pctAnt * valoresUsuario.antiguedad_años;
    antig48 = basico48 * pctAnt * valoresUsuario.antiguedad_años;
    antigNR48 = nrEscala48 * pctAnt * valoresUsuario.antiguedad_años;
    lineasRecibo.push({ concepto: "Antigüedad", tipo: "remunerativo", monto: antiguedad });
  }

  let presentismo = 0; let presentismoNR = 0;
  let pres48 = 0;      let presNR48 = 0;

  if (convenio.reglas_calculo.presentismo) {
    const pctPres = convenio.reglas_calculo.presentismo.porcentaje || 0.08333;
    presentismo = (basico + antiguedad) * pctPres;
    presentismoNR = (noRemuFijo + antiguedadNR) * pctPres;
    pres48 = (basico48 + antig48) * pctPres;
    presNR48 = (nrEscala48 + antigNR48) * pctPres;
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
      let monto = basico * pct;
      let montoNR = noRemuFijo * pct;
      
      if (monto > 0) {
        lineasRecibo.push({ concepto: regla.label || id_adicional, tipo: "remunerativo", monto: monto });
        extraAdicionalesRem += monto;
        extraAdicionalesNR += montoNR;
        extraAdicionales48 += basico48 * pct;
        extraAdicionalesNR48 += nrEscala48 * pct;

        // Se guarda el desglose No Remunerativo para inyectarlo ordenado abajo
        if (montoNR > 0) {
          lineasNRDinamicas.push({ concepto: `${regla.label} s/ No Remunerativo`, tipo: "no_remunerativo", monto: montoNR });
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
      if (id_retencion === "obra_social_extra") continue;
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
    ganancias: gananciasInfo
  };
}