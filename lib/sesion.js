// lib/sesion.js
// Una marca en localStorage que dice "en este navegador alguien entró a /admin".
//
// POR QUÉ EXISTE: el botón flotante de Admin/Salir (AuthNavFloating) está en
// todas las páginas y preguntaba a Firebase Auth si había sesión. Para eso
// cada visitante bajaba el SDK de Firebase entero (auth y Firestore, cientos
// de KB), aunque el 99,9% nunca entró al panel. Con la marca, el SDK se carga
// sólo en el navegador del administrador; para los demás la página no lo trae.
// La marca no da ningún permiso: los permisos los siguen dando las reglas de
// Firestore con el token de la sesión real.

export const MARCA_SESION = "liquidar:sesion";

export function haySesionMarcada() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(MARCA_SESION) === "1";
  } catch {
    return false;
  }
}

export function marcarSesion() {
  try { window.localStorage.setItem(MARCA_SESION, "1"); } catch { /* sin localStorage no pasa nada */ }
}

export function borrarMarcaDeSesion() {
  try { window.localStorage.removeItem(MARCA_SESION); } catch { /* ídem */ }
}
