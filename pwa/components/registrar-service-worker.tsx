'use client';

import { useEffect } from 'react';

/**
 * Un único registro, servido desde la raíz, para que su alcance sea todo el
 * sitio y no una subcarpeta (README.handoff §5).
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // En desarrollo estorba más que ayuda: sirve versiones viejas del armazón.
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Sin service worker la aplicación funciona igual; solo pierde el
      // aviso propio cuando no hay cobertura. No se molesta al usuario.
    });
  }, []);

  return null;
}
