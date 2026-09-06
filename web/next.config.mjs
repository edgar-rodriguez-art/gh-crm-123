/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // El paquete común se publica como TypeScript sin compilar: Next lo
  // transpila con la aplicación. Un paso de compilación menos que mantener.
  transpilePackages: ['@crm123/core'],

  experimental: {
    // Sin esto, `instrumentation.ts` NO se ejecuta y la comprobación de
    // arranque de TECHNICAL_SPEC §10 es código muerto. Estuvo así desde el
    // Hito 2 sin que se notara. Si se quita esta línea, hay que quitar
    // también `instrumentation.ts`.
    instrumentationHook: true,
    // Vercel, con «Root Directory» en esta carpeta, necesita saber dónde está
    // la raíz del monorepo para resolver los node_modules del workspace.
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
