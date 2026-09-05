import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { FormularioContrasena } from './formulario-contrasena';

export const metadata: Metadata = { title: 'Elige tu contraseña · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Cambio de contraseña obligatorio.  DESIGN_BRIEF §8.2.
 *
 * SIN barra lateral, SIN navegación, SIN botón de volver. No hay forma de
 * saltarla: el middleware devuelve aquí cualquier otra ruta mientras
 * `must_change_password` siga en `true` (DESIGN_BRIEF §14.9).
 *
 * No pide la contraseña actual: el usuario acaba de autenticarse.
 */
export default async function PaginaCambioContrasena() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  return (
    <main className="flex min-h-screen items-center justify-center bg-lienzo px-s4 py-s8">
      <div className="w-full max-w-[400px]">
        <div className="rounded border border-filete bg-superficie p-s6 shadow-sm">
          <h1 className="font-titulo text-h2">Elige tu contraseña</h1>
          <p className="mt-s2 text-secundario text-neutro-800">
            Es tu primer acceso. Crea una contraseña personal para continuar.
          </p>

          <div className="mt-s4">
            <FormularioContrasena username={perfil.username} />
          </div>
        </div>
      </div>
    </main>
  );
}
