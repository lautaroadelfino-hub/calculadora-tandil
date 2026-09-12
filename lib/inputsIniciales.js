// lib/inputsIniciales.js
// Arma el estado inicial del formulario de la calculadora a partir de
// `inputs_requeridos` del convenio.
//
// POR QUÉ EXISTE ESTE ARCHIVO: el documento del convenio puede traer un
// `default` que no está entre sus propias `opciones` (pasó de verdad en
// gastronomicos-cct-389-04, cuyo default decía "Nivel 1 (Peón, Lavacopas,
// Guardarropas)" mientras las opciones decían "Nivel 1 (Peón - Lavacopas)").
// El <select> del navegador muestra igual la primera opción, así que el
// usuario ve una categoría elegida pero el estado de React guarda otra cosa.
// Si no toca el desplegable y aprieta "Procesar Recibo", el motor no encuentra
// la clave y le tira un error en la cara.
//
// La calculadora no puede depender de que el dato esté prolijo: si el default
// no es elegible, se usa la primera opción, que es lo que el usuario ve.

export function valoresIniciales(inputsRequeridos = []) {
  const valores = {};

  for (const input of inputsRequeridos || []) {
    if (!input || !input.id) continue;

    if (input.tipo === "select") {
      const opciones = Array.isArray(input.opciones) ? input.opciones : [];
      valores[input.id] = opciones.includes(input.default)
        ? input.default
        : opciones[0] ?? "";
      continue;
    }

    valores[input.id] = input.default;
  }

  return valores;
}

/**
 * Devuelve los inputs de tipo select cuyo `default` no está entre sus
 * `opciones`. Sirve para avisar en el panel de administración que el convenio
 * quedó con un default inválido, en vez de taparlo para siempre.
 */
export function selectsConDefaultInvalido(inputsRequeridos = []) {
  return (inputsRequeridos || [])
    .filter((i) => i && i.tipo === "select")
    .filter((i) => {
      const opciones = Array.isArray(i.opciones) ? i.opciones : [];
      return opciones.length > 0 && !opciones.includes(i.default);
    })
    .map((i) => ({ id: i.id, default: i.default, opciones: i.opciones }));
}

export default valoresIniciales;
