'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Navegación inferior de DOS elementos: Panel · Equipo. Nada más
 * (DESIGN_BRIEF §9).
 *
 * «Equipo» no es una pantalla propia: es el semáforo del Panel. Es el valor
 * por defecto que fija README.handoff §6 ante una pregunta que el brief deja
 * abierta, así que el elemento ancla al semáforo en vez de navegar a otra
 * ruta. Si el cliente decide que sí debe serlo, se cambia este `href`.
 *
 * Altura de 56 px y respeto del área segura del dispositivo.
 */
const ELEMENTOS = [
  { href: '/panel', texto: 'Panel' },
  { href: '/panel#semaforo', texto: 'Equipo' },
] as const;

export function NavegacionInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 border-t border-filete bg-superficie
                 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {ELEMENTOS.map((e) => {
          const activo = pathname === e.href.split('#')[0];
          return (
            <li key={e.texto} className="flex-1">
              <Link
                href={e.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'flex h-[56px] items-center justify-center text-cuerpo',
                  'focus-visible:outline focus-visible:outline-2',
                  'focus-visible:-outline-offset-2 focus-visible:outline-marca',
                  activo ? 'font-semibold text-marca-800' : 'text-neutro-800',
                )}
              >
                {e.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
