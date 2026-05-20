// lib/motorLiquidacion.js

export function procesarRecibo(convenio, datosEscala, valoresUsuario) {
  const categoriaElegida = valoresUsuario.categoria;
  const sueldoBase = datosEscala.categorias[categoriaElegida];

  if (!sueldoBase) {
    throw new Error("La categoría seleccionada no existe en la escala de este mes.");
  }

  // Inicializamos el recibo
  let lineasRecibo = [];
  let basico = sueldoBase.basico || 0;
  let noRemunerativoBase = sueldoBase.no_remunerativo || 0;
  
  lineasRecibo.push({ concepto: "Sueldo Básico", tipo: "remunerativo", monto: basico });

  // --- MOTOR DINÁMICO DE CONCEPTOS REMUNERATIVOS Y NO REMUNERATIVOS ---
  let totalRemunerativo = basico;
  let totalNoRemunerativo = noRemunerativoBase;

  let acumuladorAntiguedadRem = 0;
  let acumuladorAntiguedadNoRem = 0;

  // 1. Regla: Antigüedad
  if (convenio.reglas_calculo.antiguedad && valoresUsuario.antiguedad_años > 0) {
    const reglaAnt = convenio.reglas_calculo.antiguedad;
    
    if (reglaAnt.aplica_sobre === "basico") {
      acumuladorAntiguedadRem = basico * reglaAnt.porcentaje_por_año * valoresUsuario.antiguedad_años;
      lineasRecibo.push({ concepto: "Antigüedad", tipo: "remunerativo", monto: acumuladorAntiguedadRem });
      totalRemunerativo += acumuladorAntiguedadRem;

      if (noRemunerativoBase > 0) {
        acumuladorAntiguedadNoRem = noRemunerativoBase * reglaAnt.porcentaje_por_año * valoresUsuario.antiguedad_años;
      }
    }
  }

  // 2. Regla: Presentismo
  let montoPresentismoRem = 0;
  let montoPresentismoNoRem = 0;

  if (convenio.reglas_calculo.presentismo) {
    const reglaPres = convenio.reglas_calculo.presentismo;

    switch (reglaPres.tipo || "porcentaje") {
      case "suma_fija":
        montoPresentismoRem = reglaPres.valor_fijo;
        break;
      case "porcentaje":
        let pct = reglaPres.porcentaje || reglaPres.valor;
        if (reglaPres.aplica_sobre === "basico_mas_antiguedad") {
          montoPresentismoRem = (basico + acumuladorAntiguedadRem) * pct;
          if (noRemunerativoBase > 0) {
            montoPresentismoNoRem = (noRemunerativoBase + acumuladorAntiguedadNoRem) * pct;
          }
        } else if (reglaPres.aplica_sobre === "basico") {
          montoPresentismoRem = basico * pct;
          if (noRemunerativoBase > 0) {
            montoPresentismoNoRem = noRemunerativoBase * pct;
          }
        }
        break;
    }

    if (montoPresentismoRem > 0) {
      lineasRecibo.push({ concepto: "Presentismo", tipo: "remunerativo", monto: montoPresentismoRem });
      totalRemunerativo += montoPresentismoRem;
    }
  }

  // --- DESGLOSE EXCLUSIVO DE CONCEPTOS NO REMUNERATIVOS ---
  if (noRemunerativoBase > 0) {
    lineasRecibo.push({ concepto: "Asignación No Remunerativa Base", tipo: "no_remunerativo", monto: noRemunerativoBase });
  }
  if (acumuladorAntiguedadNoRem > 0) {
    lineasRecibo.push({ concepto: "Antigüedad No Remunerativa", tipo: "no_remunerativo", monto: acumuladorAntiguedadNoRem });
  }
  if (montoPresentismoNoRem > 0) {
    lineasRecibo.push({ concepto: "Presentismo No Remunerativo", tipo: "no_remunerativo", monto: montoPresentismoNoRem });
  }

  totalNoRemunerativo = noRemunerativoBase + acumuladorAntiguedadNoRem + montoPresentismoNoRem;

  // --- MOTOR DINÁMICO DE RETENCIONES ---
  let totalRetenciones = 0;
  const baseTotal = totalRemunerativo + totalNoRemunerativo;

  // Leyes Nacionales (siempre presentes)
  const retencionesLey = [
    { nombre: "Jubilación (11%)", porcentaje: 0.11 },
    { nombre: "Ley 19.032 (3%)", porcentaje: 0.03 },
    { nombre: "Obra Social (3%)", porcentaje: 0.03 } // Esta obra social es sobre lo remunerativo
  ];

  retencionesLey.forEach(retencion => {
    let monto = totalRemunerativo * retencion.porcentaje;
    lineasRecibo.push({ concepto: retencion.nombre, tipo: "retencion", monto: monto });
    totalRetenciones += monto;
  });

  // Retenciones Sindicales UNIVERSALES (Lee Firebase sin importar el gremio)
  if (convenio.reglas_calculo.retenciones_sindicales) {
    const retenciones = convenio.reglas_calculo.retenciones_sindicales;

    // Iteramos sobre todos los campos que existan en Firebase para este convenio
    for (const [id_retencion, regla] of Object.entries(retenciones)) {
      
      // 1. Filtro Condicional (Ej: si la regla dice "solo_afiliado" y el usuario no lo es, la saltamos)
      if (regla.condicion === "solo_afiliado" && !valoresUsuario.afiliado_sindicato) continue;
      if (regla.condicion === "solo_no_afiliado" && valoresUsuario.afiliado_sindicato) continue;

      // 2. Determinar la base de cálculo exigida
      let baseCalculo = totalRemunerativo; // Default
      if (regla.base === "remunerativo_mas_no_remunerativo") {
        baseCalculo = baseTotal;
      } else if (regla.base === "no_remunerativo") {
        baseCalculo = totalNoRemunerativo;
      }

      // 3. Calcular el monto (porcentaje o suma fija)
      let monto = 0;
      if (regla.valor_fijo) {
        monto = regla.valor_fijo;
      } else if (regla.porcentaje) {
        monto = baseCalculo * regla.porcentaje;
      }

      // 4. Si hay monto a descontar, lo empujamos al recibo
      if (monto > 0) {
        // Leemos el nombre desde Firebase, y si te olvidaste de cargarlo, formatea el ID
        let nombreConcepto = regla.label || id_retencion.replace(/_/g, ' ').toUpperCase();
        lineasRecibo.push({ concepto: nombreConcepto, tipo: "retencion", monto: monto });
        totalRetenciones += monto;
      }
    }
  }

  // Cálculo final
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