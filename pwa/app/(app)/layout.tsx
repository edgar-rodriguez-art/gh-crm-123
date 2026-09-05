import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { NavegacionInferior } from '@/components/navegacion-inferior';

export const dynamic = 'force-dynamic';

/**
 * Armazón de la PWA: una sola columna y navegación inferior de DOS elementos.
 * Nada más (DESIGN_BRIEF §9).
 *
 * La gestión pesada —crear usuarios, fijar cuotas, reasignar, archivar— no
 * existe aquí: vive solo en el escritorio (DESIGN_BRIEF §14.13).
 */
export default async function LayoutPwa({ children }: { children: React.ReactNode }) {
  const perfil = await perfilActual();

  if (!perfil) redirect('/login');
  if (perfil.must_change_password) redirect('/cambiar-contrasena');
  // Segunda cerradura tras el middleware: el rol viene de `profiles`.
  if (perfil.role !== 'supervisor') redirect('/login');

  return (
    <div className="min-h-[100dvh] bg-lienzo">
      {/* El hueco inferior deja sitio a la navegación fija y al área segura. */}
      <main className="px-s4 pb-[calc(56px+env(safe-area-inset-bottom)+24px)] pt-s4">
        {children}
      </main>
      <NavegacionInferior />
    </div>
  );
}
