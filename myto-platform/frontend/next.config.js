/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Frontend: 3000 (Docker and local). Backend: 8000. Allow dev from LAN and localhost on 3000/3002.
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.2.39:3000', 'http://localhost:3002', 'http://192.168.2.39:3002'],
  // /api/v1/* is proxied by Route Handler app/api/v1/[...path]/route.ts (uses BACKEND_INTERNAL_URL at runtime)
};

module.exports = nextConfig;
