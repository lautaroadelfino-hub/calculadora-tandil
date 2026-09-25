/** @type {import('next').NextConfig} */

// Cabeceras de seguridad. Van acá y no sólo en public/_headers porque las
// páginas que la gente usa (/ y /calcular/…) las rinde la función del edge, y
// Cloudflare no aplica _headers a las respuestas de funciones: sólo a los
// archivos estáticos. Lo que se declara acá queda en el manifiesto de rutas
// que el adaptador de Cloudflare aplica a todas las respuestas.
const CABECERAS_DE_SEGURIDAD = [
  // El navegador no vuelve a entrar por http durante un año.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // No adivina tipos de contenido.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Al salir del sitio no viaja la URL completa: la de una simulación lleva
  // los datos cargados en los parámetros.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El sitio no usa cámara, micrófono ni ubicación.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Nadie puede meter el sitio en un iframe ajeno.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig = {
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_DE_SEGURIDAD }];
  },
};

export default nextConfig;
