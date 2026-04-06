/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'cdn.jne.gob.pe'],
  },
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig