// lib/acuerdos.js
// Lectura y escritura de acuerdos en Firestore (colección "acuerdos"), con el
// SDK: lo usa el panel de administración. El sitio público los lee por REST
// (lib/firestoreRest.js) y aplica las mismas reglas con lib/acuerdosPublicados.js.
//
// La forma del documento está documentada en lib/acuerdosPublicados.js.

import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { acuerdosPublicados } from "./acuerdosPublicados";

/** Todos los acuerdos, del más nuevo al más viejo. El admin pide también los borradores. */
export async function getAcuerdos({ incluirNoPublicadas = false, convenioId = null } = {}) {
  const snap = await getDocs(collection(db, "acuerdos"));
  const items = [];
  snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
  return acuerdosPublicados(items, { incluirNoPublicadas, convenioId });
}

/** Crea un acuerdo (requiere sesión de admin por reglas de Firestore). Devuelve el id. */
export async function crearAcuerdo(datos) {
  const ref = await addDoc(collection(db, "acuerdos"), {
    convenioId: datos.convenioId,
    fecha: datos.fecha,
    titulo: datos.titulo,
    tipo: datos.tipo || "otro",
    vigencia: datos.vigencia || null,
    archivoUrl: datos.archivoUrl || null,
    archivoNombre: datos.archivoNombre || null,
    archivoTipo: datos.archivoTipo || null,
    archivoRuta: datos.archivoRuta || null,
    fuenteUrl: datos.fuenteUrl || null,
    // El último tramo de la URL de la página del acuerdo. Se fija acá y no se
    // toca al editar: la URL ya puede estar en Google o compartida.
    slug: datos.slug || null,
    published: datos.published !== false,
    creadoEl: new Date().toISOString(),
  });
  return ref.id;
}

/** Actualiza parte de un acuerdo. La fecha de cambio alimenta el sitemap. */
export async function guardarAcuerdo(id, datos) {
  await setDoc(doc(db, "acuerdos", id), { ...datos, actualizadoEl: new Date().toISOString() }, { merge: true });
}

/** Elimina el documento. El archivo en Storage lo borra quien llama (lib/archivos.js). */
export async function borrarAcuerdo(id) {
  await deleteDoc(doc(db, "acuerdos", id));
}
