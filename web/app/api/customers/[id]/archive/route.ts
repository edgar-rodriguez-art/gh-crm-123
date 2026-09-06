import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/customers/:id/archive   ·   Solo supervisor.  R7
 *
 * Archivado LÓGICO: el cliente deja de aparecer en las listas y su historial
 * se conserva entero. No hay borrado físico en ninguna capa (CLAUDE.md
 * regla 2), y en la interfaz la acción se llama «Archivar», nunca
 * «eliminar» ni «borrar».
 *
 * El rol se lee de `profiles`, nunca del JWT.
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
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: perfil.id,
      })
      .eq('id', params.id)
      .select('id, is_archived')
      .maybeSingle();

    if (error) {
      registrarFallo('POST /api/customers/:id/archive', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    await auditar({ action: 'customer.archived', entityType: 'customer', entityId: data.id });

    return jsonOk(data);
  } catch (e) {
    registrarFallo('POST /api/customers/:id/archive', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
