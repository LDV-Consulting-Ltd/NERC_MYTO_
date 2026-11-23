/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Frontend: 3000 (Docker and local). Backend: 8000. Allow dev from LAN and localhost on 3000/3002.
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.2.39:3000', 'http://localhost:3002', 'http://192.168.2.39:3002'],
  // /api/v1/* is proxied by Route Handler app/api/v1/[...path]/route.ts (uses BACKEND_INTERNAL_URL at runtime)
  async redirects() {
    return [
      { source: '/preview/nerc-myto', destination: '/overview', permanent: false },
      { source: '/preview/nerc-myto/commitments', destination: '/explorer', permanent: false },
      { source: '/preview/nerc-myto/discos', destination: '/discos', permanent: false },
      { source: '/preview/nerc-myto/discos/:code', destination: '/disco/:code', permanent: false },
      { source: '/preview/nerc-myto/map', destination: '/map', permanent: false },
      { source: '/preview/nerc-myto/orders', destination: '/orders', permanent: false },
      { source: '/preview/nerc-myto/operations', destination: '/pipeline', permanent: false },
      { source: '/preview/nerc-myto/operations/runs', destination: '/runs', permanent: false },
      { source: '/preview/nerc-myto/operations/runs/:runId', destination: '/runs/:runId', permanent: false },
      { source: '/preview/nerc-myto/operations/quality', destination: '/dq', permanent: false },
      { source: '/preview/nerc-myto/operations/geocoding', destination: '/geocoding', permanent: false },
      { source: '/preview/nerc-myto/warehouse/:layer', destination: '/layers/:layer', permanent: false },
      { source: '/preview/nerc-myto/catalog', destination: '/datasets', permanent: false },
      { source: '/preview/nerc-myto/catalog/metadata', destination: '/metadata', permanent: false },
      { source: '/preview/nerc-myto/catalog/governance', destination: '/governance', permanent: false },
      { source: '/preview/nerc-myto/catalog/lineage', destination: '/lineage', permanent: false },
      { source: '/preview/nerc-myto/catalog/architecture', destination: '/architecture', permanent: false },
      { source: '/preview/nerc-myto/catalog/observability', destination: '/metrics', permanent: false },
      { source: '/preview/nerc-myto/catalog/apis', destination: '/api-docs', permanent: false },
      { source: '/preview/nerc-myto/catalog/coverage', destination: '/coverage', permanent: false },
      { source: '/preview/nerc-myto/agent', destination: '/agent', permanent: false },
      { source: '/preview/nerc-myto/admin', destination: '/admin', permanent: false },
      { source: '/preview/nerc-myto/:path*', destination: '/overview', permanent: false },
    ];
  },
};

module.exports = nextConfig;
