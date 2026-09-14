// components/Analitica.jsx
// Cloudflare Web Analytics: cuántas visitas hay y a qué páginas, sin cookies
// y sin identificar a nadie (por eso no pide consentimiento). El token es
// público (viaja en el HTML de todas formas) y se configura como variable
// NEXT_PUBLIC_CF_BEACON_TOKEN en el proyecto de Cloudflare Pages; sin token,
// el componente no dibuja nada y la página sigue igual.
//
// Cómo conseguir el token: en el panel de Cloudflare, "Analytics & Logs" →
// "Web Analytics" → "Add a site" → liquidar.ar → instalación manual: el
// snippet trae `"token": "…"`.

const TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || "";

export default function Analitica() {
  if (!TOKEN) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: TOKEN })}
    />
  );
}
