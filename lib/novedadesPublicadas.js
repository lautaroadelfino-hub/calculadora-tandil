// lib/novedadesPublicadas.js
// Qué novedades se muestran y en qué orden: las publicadas, de la más nueva a
// la más vieja. Es la misma regla que getNovedades() en lib/novedades.js, pero
// pura (sin Firestore), para poder aplicarla en el servidor y en los tests.
//
// Desde octubre de 2026 una novedad puede llevar `convenioId`: es una novedad
// de ese sindicato y se ve en /novedades/<convenio>. Sin el campo es general
// del sitio. La lista general (/novedades) muestra todas, con y sin convenio.
export function novedadesPublicadas(items, limite = 20, { incluirNoPublicadas = false, convenioId = null } = {}) {
  let visibles = incluirNoPublicadas
    ? [...(items || [])]
    : (items || []).filter((n) => n.published !== false && n.published !== 0);
  if (convenioId) visibles = visibles.filter((n) => n.convenioId === convenioId);
  visibles.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return visibles.slice(0, limite);
}
