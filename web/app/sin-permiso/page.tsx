import type { Metadata } from 'next';
import { TEXTO } from '@crm123/core/labels';

export const metadata: Metadata = { title: 'Sin permiso · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Pantalla de error de permisos.  DESIGN_BRIEF §6.4.
 *
 * El middleware REESCRIBE aquí (no redirige) cuando un vendedor pide una ruta
 * de supervisor, así que la URL se queda donde está.
 *
 * NO ofrece reintentar: reintentar no va a cambiar el resultado, y un botón
 * que no sirve para nada es peor que no tener botón.
 */
export default function PaginaSinPermiso() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-lienzo px-s4">
      <div className="max-w-[420px] text-center">
        <h1 className="font-titulo text-h2">{TEXTO.sinPermiso}</h1>
        <p className="mt-s3 text-secundario text-neutro-800">
          <a
            href="/tablero"
            className="text-marca-700 hover:underline
                       focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-marca"
          >
            Volver al tablero del día
          </a>
        </p>
      </div>
    </main>
  );
}
