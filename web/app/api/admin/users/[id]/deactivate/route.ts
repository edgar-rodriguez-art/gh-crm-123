import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/:id/deactivate   ·   R7
 *
 * Se llama DESACTIVAR, nunca «eliminar». El usuario no puede iniciar sesión y
 * sus funciones de RLS devuelven falso, pero su cartera sigue visible para el
 * supervisor y se puede reasignar. La palabra prohibida no aparece ni aquí ni
 * en la interfaz (CLAUDE.md regla 2).
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }
  // Desactivarse a uno mismo dejaría el CRM sin supervisor al siguiente clic.
  if (params.id === perfil.id) {
    return jsonError(422, 'cannot_deactivate_self', 'No puedes desactivar tu propia cuenta.');
  }

  try {
    const { data, error } = await createClient()
      .from('profiles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: perfil.id,
      })
      .eq('id', params.id)
      .select('id, is_active')
      .maybeSingle();

    if (error) {
      registrarFallo('admin/users/:id/deactivate', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    await auditar({ action: 'user.deactivated', entityType: 'profile', entityId: data.id });
    return jsonOk(data);
  } catch (e) {
    registrarFallo('POST /api/admin/users/:id/deactivate', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
