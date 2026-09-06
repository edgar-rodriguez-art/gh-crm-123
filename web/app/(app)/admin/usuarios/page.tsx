import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { ErrorEstado } from '@/components/estados';
import { GestionUsuarios, type Usuario } from './gestion-usuarios';

export const metadata: Metadata = { title: 'Usuarios · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Administración › Usuarios.  DESIGN_BRIEF §8.8.
 *
 * Se listan TODOS, activos y desactivados: un usuario desactivado sigue
 * existiendo y hay que poder reactivarlo. Lo que no existe en ninguna parte
 * es borrarlo.
 */
export default async function PaginaUsuarios() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const { data, error } = await createClient()
    .from('profiles')
    .select('id, username, full_name, email, role, is_active, created_at, deactivated_at')
    .order('is_active', { ascending: false })
    .order('username');

  if (error) {
    return (
      <div className="rounded border border-filete bg-superficie">
        <ErrorEstado />
      </div>
    );
  }

  return <GestionUsuarios usuarios={(data ?? []) as Usuario[]} yoId={perfil.id} />;
}
