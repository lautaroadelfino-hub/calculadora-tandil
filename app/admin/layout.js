// app/admin/layout.js
// El panel no tiene que aparecer en Google. La página es de cliente y no puede
// declarar metadata, así que el noindex va en este layout. robots.js ya no lo
// bloquea: si Google no puede recorrer la URL, tampoco ve el noindex.
export const metadata = { title: "Panel de administración", robots: { index: false, follow: false } };

export default function LayoutAdmin({ children }) {
  return children;
}
