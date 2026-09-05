'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export function CerrarSesion() {
  const router = useRouter();
  const [saliendo, setSaliendo] = React.useState(false);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);

    await fetch('/api/auth/logout', { method: 'POST' });

    // Al cerrar sesión se borran las cachés del dispositivo. En un móvil
    // compartido, dejar el armazón cacheado con datos del equipo sería
    // exactamente lo que README.handoff §5 prohíbe.
    navigator.serviceWorker?.controller?.postMessage('crm123:cerrar-sesion');

    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      className="inline-flex h-12 items-center rounded text-cuerpo text-marca-700
                 hover:underline disabled:text-neutro-500
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      {saliendo ? 'Saliendo…' : 'Salir'}
    </button>
  );
}
