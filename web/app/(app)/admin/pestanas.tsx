'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const PESTANAS = [
  { href: '/admin/usuarios', texto: 'Usuarios' },
  { href: '/admin/cuotas', texto: 'Cuotas' },
  { href: '/admin/auditoria', texto: 'Auditoría' },
] as const;

export function PestanasAdmin() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de administración">
      <ul className="flex gap-s1 border-b border-filete">
        {PESTANAS.map((p) => {
          const activa = pathname === p.href;
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  'block px-s3 py-s2 text-cuerpo transition-colors duration-150',
                  'focus-visible:outline focus-visible:outline-2',
                  'focus-visible:-outline-offset-2 focus-visible:outline-marca',
                  activa
                    ? 'border-b-2 border-marca font-semibold text-marca-800'
                    : 'text-neutro-800 hover:bg-neutro-100',
                )}
              >
                {p.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
