// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // genera HTML estático
  images: { unoptimized: true }, // evita Image Optimization (no hay server)
};
export default nextConfig;
