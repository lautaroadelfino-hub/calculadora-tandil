// lib/motorLiquidacion.js

export function procesarRecibo(convenio, datosEscala, valoresUsuario) {
  const categoriaElegida = valoresUsuario.categoria;
  const sueldoBase = datosEscala.categorias[categoriaElegida];

  if (!sueldoBase) {
    throw new Error("La categoría seleccionada no existe en la escala de este mes.");
  }

  // Inicializamos el recibo
  let lineasRecibo = [];
  let basico = sueldoBase.basico;
  let noRemunerativo = sueldoBase.no_remunerativo || 0;
  
  lineasRecibo.push({ concepto: "Sueldo Básico", tipo: "remunerativo", monto: basico });

  // --- MOTOR DINÁMICO DE CONCEPTOS REMUNERATIVOS ---
  let totalRemunerativo = basico;
  let acumuladorAntiguedad = 0; // Guardamos esto por si otro concepto lo necesita como base

  // 1. Regla: Antigüedad
  if (convenio.reglas_calculo.antiguedad && valoresUsuario.antiguedad_años > 0) {
    const reglaAnt = convenio.reglas_calculo.antiguedad;
    
    // Leemos qué tipo de cálculo pide Firestore
    if (reglaAnt.aplica_sobre === "basico") {
      acumuladorAntiguedad = basico * reglaAnt.porcentaje_por_año * valoresUsuario.antiguedad_años;
      
      lineasRecibo.push({ concepto: "Antigüedad", tipo: "remunerativo", monto: acumuladorAntiguedad });
      totalRemunerativo += acumuladorAntiguedad;
    }
  }

  // 2. Regla: Presentismo (O cualquier otro concepto futuro)
  if (convenio.reglas_calculo.presentismo) {
    const reglaPres = convenio.reglas_calculo.presentismo;
    let montoPresentismo = 0;

    // Nuestro switch dinámico que se adapta a las locuras paritarias
    switch (reglaPres.tipo || "porcentaje") {
      case "suma_fija":
        montoPresentismo = reglaPres.valor_fijo;
        break;
      case "porcentaje":
        if (reglaPres.aplica_sobre === "basico_mas_antiguedad") {
          montoPresentismo = (basico + acumuladorAntiguedad) * (reglaPres.porcentaje || reglaPres.valor);
        } else if (reglaPres.aplica_sobre === "basico") {
          montoPresentismo = basico * (reglaPres.porcentaje || reglaPres.valor);
        }
        break;
    }

    if (montoPresentismo > 0) {
      lineasRecibo.push({ concepto: "Presentismo", tipo: "remunerativo", monto: montoPresentismo });
      totalRemunerativo += montoPresentismo;
    }
  }

  // --- MOTOR DINÁMICO DE RETENCIONES ---
  let totalRetenciones = 0;

  // Leyes estándar (Podrían venir de Firebase también en el futuro)
  const retencionesLey = [
    { nombre: "Jubilación (11%)", porcentaje: 0.11 },
    { nombre: "Ley 19.032 (3%)", porcentaje: 0.03 },
    { nombre: "Obra Social (3%)", porcentaje: 0.03 }
  ];

  retencionesLey.forEach(retencion => {
    let monto = totalRemunerativo * retencion.porcentaje;
    lineasRecibo.push({ concepto: retencion.nombre, tipo: "retencion", monto: monto });
    totalRetenciones += monto;
  });

  // Reglas Sindicales desde Firebase
  if (convenio.reglas_calculo.retenciones_sindicales) {
    const reglasSind = convenio.reglas_calculo.retenciones_sindicales;
    
    // Aporte solidario fijo para todos
    if (reglasSind.faecys) {
      let montoFaecys = totalRemunerativo * reglasSind.faecys;
      lineasRecibo.push({ concepto: "Aporte FAECYS", tipo: "retencion", monto: montoFaecys });
      totalRetenciones += montoFaecys;
    }

    // Aporte exclusivo si tildó "Afiliado" en el formulario
    if (valoresUsuario.afiliado_sindicato && reglasSind.sec_afiliado) {
      let montoAfiliado = totalRemunerativo * reglasSind.sec_afiliado;
      lineasRecibo.push({ concepto: "Cuota Afiliado Sindical", tipo: "retencion", monto: montoAfiliado });
      totalRetenciones += montoAfiliado;
    }
  }

  // Agregamos lo no remunerativo al final
  if (noRemunerativo > 0) {
    lineasRecibo.push({ concepto: "Asignación No Remunerativa", tipo: "no_remunerativo", monto: noRemunerativo });
  }

  // Cálculo final
  const netoAPagar = totalRemunerativo - totalRetenciones + noRemunerativo;

  // Devolvemos el paquete completo listo para que React lo dibuje
  return {
    detalle: lineasRecibo,
    totales: {
      bruto: totalRemunerativo,
      retenciones: totalRetenciones,
      noRemunerativo: noRemunerativo,
      neto: netoAPagar
    }
  };
}