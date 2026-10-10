// lib/archivos.js
// Subir y borrar archivos en Firebase Storage. Lo usa sólo el panel de
// administración (los acuerdos de cada convenio); el sitio público recibe la
// URL de descarga ya guardada en Firestore y nunca importa este archivo.
//
// El SDK de Storage se carga con import dinámico, recién cuando el dueño sube
// algo: así el resto del panel no lo descarga, igual que hace
// components/AuthNavFloating.jsx con firebase/auth.

/** ¿Está configurado el bucket? Sin la variable no se puede subir nada. */
export const STORAGE_CONFIGURADO = Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

const FALTA_CONFIG =
  "Falta la variable NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET. Hay que agregarla en .env.local y en Cloudflare Pages, y volver a publicar.";

async function storage() {
  if (!STORAGE_CONFIGURADO) throw new Error(FALTA_CONFIG);
  const [{ app }, sdk] = await Promise.all([import("./firebase"), import("firebase/storage")]);
  if (!app) throw new Error("Storage sólo funciona en el navegador.");
  return { sdk, st: sdk.getStorage(app) };
}

/**
 * Sube un archivo y devuelve lo que se guarda en el documento del acuerdo.
 * @param {string} ruta  p. ej. "acuerdos/camioneros-cct-40-89/2026-08-03-escala.pdf"
 * @param {File} archivo
 * @param {string} contentType  el tipo MIME ya resuelto (lib/acuerdosPublicados.js)
 */
export async function subirArchivo(ruta, archivo, contentType) {
  const { sdk, st } = await storage();
  const ref = sdk.ref(st, ruta);
  await sdk.uploadBytes(ref, archivo, { contentType: contentType || archivo.type || undefined });
  const url = await sdk.getDownloadURL(ref);
  return { url, nombre: archivo.name, tipo: contentType || archivo.type || null, ruta };
}

/** Borra un archivo. Si ya no existe, no es un error: el objetivo era que no estuviera. */
export async function borrarArchivo(ruta) {
  if (!ruta) return;
  const { sdk, st } = await storage();
  try {
    await sdk.deleteObject(sdk.ref(st, ruta));
  } catch (error) {
    if (error && error.code === "storage/object-not-found") return;
    throw error;
  }
}
