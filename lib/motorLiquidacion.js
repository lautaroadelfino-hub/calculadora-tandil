// lib/motorLiquidacion.js

export function procesarRecibo(convenio, datosEscala, valoresUsuario) {
  const categoriaElegida = valoresUsuario.categoria;
  const sueldoBase = datosEscala.categorias[categoriaElegida];

  if (!sueldoBase) {
    throw new Error("La categoría seleccionada no existe en la escala de este mes.");
  }

  let lineasRecibo = [];

  // --- 1. PRORRATEO ---
  const cargaHoraria = valoresUsuario.carga_horaria ? Number(valoresUsuario.carga_horaria) : 48;
  const factorCH = cargaHoraria / 48;

  // --- 2. SUELDOS BASE (A 48hs vs Prorrateados) ---
  const basico48 = sueldoBase.basico || 0;
  const nrEscala48 = sueldoBase.no_remunerativo || 0;

  const basico = basico48 * factorCH;
  const noRemuFijo = nrEscala48 * factorCH;

  lineasRecibo.push({ concepto: "Sueldo Básico", tipo: "remunerativo", monto: basico });

  // --- 3. ADICIONALES ---
  let antiguedad = 0; let antiguedadNR = 0;
  let antig48 = 0;    let antigNR48 = 0;

  if (convenio.reglas_calculo.antiguedad && valoresUsuario.antiguedad_años > 0) {
    const pctAnt = convenio.reglas_calculo.antiguedad.porcentaje_por_año || 0.01;
    
    // Antigüedad sobre sueldo real (prorrateado)
    antiguedad = basico * pctAnt * valoresUsuario.antiguedad_años;
    antiguedadNR = noRemuFijo * pctAnt * valoresUsuario.antiguedad_años;

    // Antigüedad "Fantasma" sobre 48hs para la Obra Social
    antig48 = basico48 * pctAnt * valoresUsuario.antiguedad_años;
    antigNR48 = nrEscala48 * pctAnt * valoresUsuario.antiguedad_años;

    lineasRecibo.push({ concepto: "Antigüedad", tipo: "remunerativo", monto: antiguedad });
  }

  let presentismo = 0; let presentismoNR = 0;
  let pres48 = 0;      let presNR48 = 0;

  if (convenio.reglas_calculo.presentismo) {
    const pctPres = convenio.reglas_calculo.presentismo.porcentaje || 0.08333;
    
    // Presentismo sobre sueldo real
    presentismo = (basico + antiguedad) * pctPres;
    presentismoNR = (noRemuFijo + antiguedadNR) * pctPres;

    // Presentismo "Fantasma" sobre 48hs para la Obra Social
    pres48 = (basico48 + antig48) * pctPres;
    presNR48 = (nrEscala48 + antigNR48) * pctPres;

    if (presentismo > 0) {
      lineasRecibo.push({ concepto: "Presentismo", tipo: "remunerativo", monto: presentismo });
    }
  }

  // --- 3.5 HORAS EXTRAS ---
  let montoHorasExtras50 = 0;
  let montoHorasExtras100 = 0;
  let montoHorasExtrasTotal = 0;

  const horas50 = valoresUsuario.horas_extras_50 ? Number(valoresUsuario.horas_extras_50) : 0;
  const horas100 = valoresUsuario.horas_extras_100 ? Number(valoresUsuario.horas_extras_100) : 0;

  if (horas50 > 0 || horas100 > 0) {
    const divisorHoras = 200; // Divisor universal por defecto
    const horasMensuales = divisorHoras * factorCH;
    
    const baseHora = basico + antiguedad + presentismo;
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

  // DESGLOSE NO REMUNERATIVO
  if (noRemuFijo > 0) lineasRecibo.push({ concepto: "Asignación No Remunerativa Base", tipo: "no_remunerativo", monto: noRemuFijo });
  if (antiguedadNR > 0) lineasRecibo.push({ concepto: "Antigüedad No Remunerativa", tipo: "no_remunerativo", monto: antiguedadNR });
  if (presentismoNR > 0) lineasRecibo.push({ concepto: "Presentismo No Remunerativo", tipo: "no_remunerativo", monto: presentismoNR });

  // --- 4. CONSTRUCCIÓN DE LAS BASES EXACTAS ---
  // Sumamos las horas extras al total remunerativo
  const totalRemunerativo = basico + antiguedad + presentismo + montoHorasExtrasTotal; 
  const totalNoRemunerativo = noRemuFijo + antiguedadNR + presentismoNR;

  const REM_REAL = totalRemunerativo;
  const TOTAL_REAL = totalRemunerativo + totalNoRemunerativo;

  // Base 48 completa (pura) para Obra Social
  const rem48_total = basico48 + antig48 + pres48;
  const nr48_total = nrEscala48 + antigNR48 + presNR48;
  const OS_48 = rem48_total + nr48_total;
  
  // Las horas extras son trabajo efectivo y suman base para OSECAC
  const baseOS = OS_48 + montoHorasExtrasTotal; 

  // --- 5. RETENCIONES LEY NACIONAL ---
  let totalRetenciones = 0;

  // Jubilación y PAMI (Siempre sobre REM_REAL)
  const retencionesNacionales = [
    { nombre: "Jubilación (11%)", porcentaje: 0.11 },
    { nombre: "Ley 19.032 PAMI (3%)", porcentaje: 0.03 }
  ];

  retencionesNacionales.forEach(ret => {
    let monto = REM_REAL * ret.porcentaje;
    lineasRecibo.push({ concepto: ret.nombre, tipo: "retencion", monto: monto });
    totalRetenciones += monto;
  });

  // Obra Social 3%
  let montoOS = baseOS * 0.03;
  lineasRecibo.push({ concepto: "Obra Social (3%)", tipo: "retencion", monto: montoOS });
  totalRetenciones += montoOS;

  // --- 6. RETENCIONES SINDICALES (Desde Firebase) ---
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

  const netoAPagar = totalRemunerativo + totalNoRemunerativo - totalRetenciones;

  return {
    detalle: lineasRecibo,
    totales: {
      bruto: totalRemunerativo,
      retenciones: totalRetenciones,
      noRemunerativo: totalNoRemunerativo,
      neto: netoAPagar
    }
  };
}