/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // El paquete común se publica como TypeScript sin compilar: Next lo
  // transpila con la aplicación. Un paso de compilación menos que mantener.
  transpilePackages: ['@crm123/core'],

  // Vercel con «Root Directory: web» necesita saber dónde está la raíz del
  // monorepo para resolver node_modules del workspace.
  experimental: {
    outputFileTracingRoot: new URL('..', import.meta.url).pathname,
  },

  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
