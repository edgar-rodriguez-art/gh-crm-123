'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { ROL } from '@crm123/core/labels';
import type { Database } from '@crm123/core/types';
import { cn } from '@/lib/utils';

type Rol = Database['public']['Enums']['user_role'];

/**
 * Barra lateral izquierda, 240 px, fija.  DESIGN_BRIEF §7.
 * Marca arriba, navegación en medio, usuario abajo. NO hay barra superior:
 * la cabecera de cada pantalla vive dentro del área de contenido.
 *
 * Lo que un rol no puede hacer NO SE DIBUJA. Nada aparece deshabilitado
 * (README.handoff §2, DESIGN_BRIEF §14.7): el vendedor no ve «Equipo» ni
 * «Administración» porque no existen para él, no porque estén apagados.
 */

const NAV_VENDEDOR = [
  { href: '/tablero', texto: 'Tablero del día' },
  { href: '/oportunidades', texto: 'Oportunidades' },
  { href: '/clientes', texto: 'Clientes' },
] as const;

const NAV_SUPERVISOR = [
  { href: '/equipo', texto: 'Equipo' },
  { href: '/admin/usuarios', texto: 'Administración' },
] as const;

export function BarraLateral({
  nombre,
  rol,
}: {
  nombre: string;
  rol: Rol;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [saliendo, setSaliendo] = React.useState(false);

  const enlaces = rol === 'supervisor' ? [...NAV_VENDEDOR, ...NAV_SUPERVISOR] : NAV_VENDEDOR;

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 flex w-barra flex-col border-r border-filete bg-superficie"
    >
      <div className="px-s4 py-s4">
        <Link
          href="/tablero"
          className="font-titulo text-h2menor tracking-tight text-tinta
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          CRM-123
        </Link>
      </div>

      <ul className="flex-1 px-s2">
        {enlaces.map((e) => {
          // «Administración» se queda activa en cualquiera de sus tres pestañas.
          const activo =
            e.href === '/admin/usuarios'
              ? pathname.startsWith('/admin')
              : pathname === e.href || pathname.startsWith(`${e.href}/`);

          return (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'block rounded px-s2 py-s2 text-cuerpo transition-colors duration-150',
                  'focus-visible:outline focus-visible:outline-2',
                  'focus-visible:outline-offset-2 focus-visible:outline-marca',
                  activo
                    ? 'bg-marca-100 font-semibold text-marca-800'
                    : 'text-tinta hover:bg-neutro-100',
                )}
              >
                {e.texto}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-filete px-s4 py-s3">
        <p className="truncate text-secundario text-tinta">{nombre}</p>
        <p className="text-nota text-neutro-800">{ROL[rol]}</p>
        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="mt-s2 rounded text-nota text-marca-700 hover:underline
                     disabled:text-neutro-500
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          {saliendo ? 'Saliendo…' : 'Salir'}
        </button>
      </div>
    </nav>
  );
}
