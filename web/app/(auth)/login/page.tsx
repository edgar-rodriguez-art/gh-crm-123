import type { Metadata } from 'next';
import { FormularioIngreso } from './formulario-ingreso';

export const metadata: Metadata = { title: 'Entrar · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Inicio de sesión.  DESIGN_BRIEF §8.1.
 *
 * Lo que esta pantalla NO lleva, y no es un olvido (DESIGN_BRIEF §8.1 y §14.8):
 * enlace de registro, enlace de «he olvidado mi contraseña», acceso con
 * Google, casilla de «recordarme» y cualquier texto de marketing.
 *
 * Tampoco lleva las credenciales de demostración que traía el prototipo:
 * README.handoff §6 las marca como chrome de prototipo, a borrar en el primer
 * commit.
 */
export default function PaginaIngreso() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-lienzo px-s4 py-s8">
      <div className="w-full max-w-[400px]">
        <div className="rounded border border-filete bg-superficie p-s6 shadow-sm">
          <h1 className="font-titulo text-h1 tracking-tight">CRM-123</h1>
          <div className="mt-s6">
            <FormularioIngreso />
          </div>
        </div>

        <p className="mt-s4 text-center text-nota text-neutro-800">
          Si has olvidado tu contraseña, pídesela a tu supervisor.
        </p>
      </div>
    </main>
  );
}
