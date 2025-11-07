/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // genera HTML estático en /out
  images: { unoptimized: true }, // evita el Image Loader en export
};
module.exports = nextConfig;
