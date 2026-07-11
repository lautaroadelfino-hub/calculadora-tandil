// lib/novedades.js
// Lectura y escritura de novedades en Firestore (colección "novedades").
// Reemplaza a la vieja API /api/news (Cloudflare D1), que quedó inaccesible
// cuando la web pasó a next-on-pages.
//
// Documento: { date: "YYYY-MM-DD", title, url|null, tag: "release"|"acuerdo"|"aviso", published: boolean }

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Trae novedades publicadas, ordenadas por fecha descendente.
 * Se filtra y ordena en el cliente para no requerir índices compuestos
 * (el volumen es chico: decenas de documentos).
 */
export async function getNovedades({ limit = 20, incluirNoPublicadas = false } = {}) {
  const snap = await getDocs(collection(db, "novedades"));
  const items = [];
  snap.forEach((d) => items.push({ id: d.id, ...d.data() }));

  const visibles = incluirNoPublicadas
    ? items
    : items.filter((n) => n.published !== false && n.published !== 0);

  visibles.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return visibles.slice(0, limit);
}

/** Crea una novedad nueva (requiere sesión de admin por reglas de Firestore). */
export async function crearNovedad({ date, title, url = null, tag = "release", published = true }) {
  if (!date || !title) throw new Error("Fecha y título son obligatorios.");
  const ref = await addDoc(collection(db, "novedades"), {
    date,
    title,
    url: url || null,
    tag,
    published: !!published,
  });
  return ref.id;
}

/** Actualiza (o crea con ID fijo) una novedad. */
export async function guardarNovedad(id, data) {
  await setDoc(doc(db, "novedades", id), data, { merge: true });
}

/** Elimina una novedad. */
export async function borrarNovedad(id) {
  await deleteDoc(doc(db, "novedades", id));
}

/**
 * Historial rescatado de la vieja base D1 de Cloudflare (2026-07-11).
 * Se usa una sola vez desde el panel admin ("Importar historial").
 */
export const HISTORIAL_D1 = [
  { id: "d1-14", date: "2025-11-16", title: "Nueva calculadora disponible costo total para empleador", url: null, tag: "release", published: true },
  { id: "d1-13", date: "2025-11-15", title: "Cargado acuerdo octubre 2025 a abril 2026 Hoteles y Gastronomía (UTGHRA–FEHGRA)", url: null, tag: "acuerdo", published: true },
  { id: "d1-12", date: "2025-11-12", title: "Nueva calculadora disponible Hoteles y Gastronomía (UTGHRA–FEHGRA)", url: null, tag: "release", published: true },
  { id: "d1-9",  date: "2025-11-03", title: "Cargado acuerdo octubre Empleados de Comercio", url: null, tag: "acuerdo", published: true },
];

/** Importa el historial D1 (idempotente: usa IDs fijos, se puede repetir sin duplicar). */
export async function importarHistorialD1() {
  for (const n of HISTORIAL_D1) {
    const { id, ...data } = n;
    await guardarNovedad(id, data);
  }
  return HISTORIAL_D1.length;
}
