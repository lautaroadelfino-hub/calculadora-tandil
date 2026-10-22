// lib/vigia/bandeja.js
// Lo que la Bandeja de /admin calcula antes de pintar: hace cuánto corrió el
// vigía, si está en rojo, y el orden de los borradores. Puro, con tests.

export const HORAS_SIN_CORRIDA_TOLERADAS = 48;

/** Horas entre una fecha ISO y ahora; null si la fecha no se entiende. */
export function horasDesde(iso, ahora = new Date()) {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? (ahora.getTime() - t) / 3600000 : null;
}

/** "hace 6 horas", "hace 3 días", "recién", "nunca". */
export function textoHace(iso, ahora = new Date()) {
  const h = horasDesde(iso, ahora);
  if (h == null) return "nunca";
  if (h < 1) return "recién";
  if (h < 48) {
    const horas = Math.floor(h);
    return `hace ${horas} hora${horas === 1 ? "" : "s"}`;
  }
  return `hace ${Math.floor(h / 24)} días`;
}

/**
 * La franja de arriba de la Bandeja: { nivel: "ok"|"alerta"|"sin_datos", texto, fallando }.
 * Rojo si el vigía no corre hace más de 48 horas o alguna fuente viene fallando.
 */
export function estadoDelVigia(estado, ahora = new Date()) {
  const ultima = estado && estado.ultimaCorrida;
  if (!ultima) return { nivel: "sin_datos", texto: "El vigía todavía no corrió.", fallando: [] };
  const cuando = ultima.fin || ultima.inicio;
  const horas = horasDesde(cuando, ahora);
  const fallando = Object.entries((estado && estado.fuentes) || {})
    .filter(([, f]) => f && Number(f.fallasSeguidas) > 0)
    .map(([nombre]) => nombre);
  const tarde = horas == null || horas > HORAS_SIN_CORRIDA_TOLERADAS;
  let texto = `Última corrida ${textoHace(cuando, ahora)}`;
  if (tarde) texto += " (el vigía no está corriendo: revisá Actions en GitHub)";
  if (fallando.length) texto += ` · falla ${fallando.join(", ")}`;
  return { nivel: tarde || fallando.length ? "alerta" : "ok", texto, fallando };
}

/** Los borradores más nuevos primero, sin los de prueba. */
export function ordenarBorradores(lista) {
  return (lista || [])
    .filter((b) => b && !String(b.id || "").startsWith("_prueba"))
    .sort((a, b) => String(b.creadoEl || "").localeCompare(String(a.creadoEl || "")));
}
