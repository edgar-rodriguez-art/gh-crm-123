import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/users/:id/activate · Reactiva un usuario desactivado. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  try {
    // La restricción `profiles_deactivation_coherent` exige que al reactivar
    // se limpie `deactivated_at`, o la fila no entra.
    const { data, error } = await createClient()
      .from('profiles')
      .update({ is_active: true, deactivated_at: null, deactivated_by: null })
      .eq('id', params.id)
      .select('id, is_active')
      .maybeSingle();

    if (error) {
      registrarFallo('admin/users/:id/activate', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    await auditar({ action: 'user.reactivated', entityType: 'profile', entityId: data.id });
    return jsonOk(data);
  } catch (e) {
    registrarFallo('POST /api/admin/users/:id/activate', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
