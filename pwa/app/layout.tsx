import type { Metadata, Viewport } from 'next';
import { RegistrarServiceWorker } from '@/components/registrar-service-worker';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM-123',
  description: 'Gestión comercial de calzado y moda',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CRM-123', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0088b0',
  width: 'device-width',
  initialScale: 1,
  // Los elementos fijos (botón de envío y navegación inferior) respetan
  // `env(safe-area-inset-bottom)`; para eso hace falta `viewport-fit=cover`.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-ES" dir="ltr">
      <body className="min-h-screen bg-lienzo font-cuerpo text-cuerpo text-tinta antialiased">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
