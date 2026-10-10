// app/login/layout.js
// El acceso al panel no tiene que aparecer en Google (ver app/admin/layout.js).
export const metadata = { title: "Acceso", robots: { index: false, follow: false } };

export default function LayoutLogin({ children }) {
  return children;
}
