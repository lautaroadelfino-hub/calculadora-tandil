/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',              // genera la carpeta /out
  images: { unoptimized: true }, // evita el loader de imágenes en export estático
  trailingSlash: true,           // URLs con slash final (más compatible en hosting estático)
};
module.exports = nextConfig;
