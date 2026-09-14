// lib/novedadesPublicadas.js
// Qué novedades se muestran y en qué orden: las publicadas, de la más nueva a
// la más vieja. Es la misma regla que getNovedades() en lib/novedades.js, pero
// pura (sin Firestore), para poder aplicarla en el servidor y en los tests.
export function novedadesPublicadas(items, limite = 20, { incluirNoPublicadas = false } = {}) {
  const visibles = incluirNoPublicadas
    ? [...(items || [])]
    : (items || []).filter((n) => n.published !== false && n.published !== 0);
  visibles.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return visibles.slice(0, limite);
}
