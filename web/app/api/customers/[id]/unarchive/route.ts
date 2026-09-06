import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/customers/:id/unarchive   ·   Solo supervisor.  R7
 *
 * Desarchivar no deja asiento: `customer.archived` está entre las 14 acciones
 * auditadas, pero su contraria no. No se inventa una decimoquinta acción —la
 * restricción `audit_log_action_allowed` la rechazaría— y el cambio queda
 * reflejado en `is_archived` y `archived_at`.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customers')
      .update({ is_archived: false, archived_at: null, archived_by: null })
      .eq('id', params.id)
      .select('id, is_archived')
      .maybeSingle();

    if (error) {
      registrarFallo('POST /api/customers/:id/unarchive', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    return jsonOk(data);
  } catch (e) {
    registrarFallo('POST /api/customers/:id/unarchive', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
