import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM-123',
  description: 'Gestión comercial de calzado y moda',
  // Es una herramienta interna: nada de esto debe acabar en un buscador.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0088b0',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-ES" dir="ltr">
      <body className="min-h-screen bg-lienzo font-cuerpo text-cuerpo text-tinta antialiased">
        {children}
      </body>
    </html>
  );
}
