import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { TablaDensa } from './tabla-densa';

export const metadata: Metadata = { title: 'Oportunidades · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Oportunidades — la tabla densa.  DESIGN_BRIEF §8.4.
 *
 * La lista de vendedores solo se pide si quien mira es supervisor: para un
 * vendedor no se consulta siquiera, porque no hay ninguna pantalla donde
 * pueda ver a un compañero (R9). Y aunque se pidiera, RLS solo le devolvería
 * su propio perfil.
 */
export default async function PaginaOportunidades({
  searchParams,
}: {
  searchParams: { atrasadas?: string; vendedor?: string };
}) {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const esSupervisor = perfil.role === 'supervisor';

  const vendedores = esSupervisor
    ? ((
        await createClient()
          .from('profiles')
          .select('id, full_name')
          .eq('is_active', true)
          .order('full_name')
      ).data ?? [])
    : [];

  return (
    <>
      <header className="mb-s4">
        <h1 className="font-titulo text-h1">Oportunidades</h1>
      </header>

      <TablaDensa
        esSupervisor={esSupervisor}
        vendedores={vendedores}
        filtrosIniciales={{
          atrasadas: searchParams.atrasadas === '1',
          vendedor: esSupervisor ? (searchParams.vendedor ?? '') : '',
        }}
      />
    </>
  );
}
