// lib/metadataConvenio.js
// El título de la pestaña de cada calculadora.
//
// POR QUÉ EXISTE: las tres calculadoras compartían el mismo título que la
// portada ("LiquidAR — Calculadora de sueldos por convenio colectivo"). Un
// lector de pantalla anuncia el título al cargar cada página, así que al pasar
// de la portada a Comercio y de ahí a Camioneros se oía siempre lo mismo; y
// con varias pestañas abiertas no se distinguían. Para Google tampoco ayudaba.
// Es puro: recibe lo que devuelve Firestore y arma el título.

/** Los campos de un documento de Firestore (formato REST) a un objeto plano con nombre y cct. */
export function convenioDesdeRest(json) {
  const f = json && json.fields;
  if (!f) return null;
  return {
    nombre: f.nombre && f.nombre.stringValue ? f.nombre.stringValue : null,
    cct: f.cct && f.cct.stringValue ? f.cct.stringValue : null,
  };
}

/** "Camioneros (CCT 40/89)" o, si no hay nombre, "Calculadora". */
export function tituloDeConvenio(convenio) {
  if (!convenio || !convenio.nombre) return "Calculadora";
  return convenio.cct ? `${convenio.nombre} (CCT ${convenio.cct})` : convenio.nombre;
}

export function metadataDeConvenio(convenio, convenioId) {
  const meta = { title: tituloDeConvenio(convenio), alternates: { canonical: `/calcular/${convenioId}` } };
  if (convenio && convenio.nombre) {
    meta.description = `Simulá el recibo de sueldo de ${convenio.nombre}: escalas vigentes, antigüedad, horas extras, aportes y el costo laboral del empleador.`;
  }
  return meta;
}
