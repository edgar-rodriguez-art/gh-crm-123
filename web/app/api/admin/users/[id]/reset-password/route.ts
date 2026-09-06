import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { auditar } from '@crm123/core/audit';
import { generarContrasena } from '@crm123/core/password';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/:id/reset-password   ·   TECHNICAL_SPEC §7.6
 *
 * La contraseña se GENERA EN EL SERVIDOR, se muestra una sola vez y vuelve a
 * activarse `must_change_password`. No hay recuperación por email: si alguien
 * la olvida, el supervisor genera otra y se la entrega en persona
 * (CLAUDE.md §7 y prohibición 21).
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  try {
    const supabase = createClient();

    const { data: destino } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .eq('id', params.id)
      .maybeSingle();

    if (!destino) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    const nueva = generarContrasena();

    const admin = createAdminClient();
    const { error: errorAuth } = await admin.auth.admin.updateUserById(params.id, {
      password: nueva,
    });

    if (errorAuth) {
      registrarFallo('reset-password · updateUserById', errorAuth);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    const { error: errorPerfil } = await supabase
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', params.id);

    if (errorPerfil) {
      registrarFallo('reset-password · profiles.update', errorPerfil);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    await auditar({
      action: 'user.password_changed',
      entityType: 'profile',
      entityId: params.id,
      metadata: { first_login: false },
    });

    return jsonOk({
      id: destino.id,
      username: destino.username,
      full_name: destino.full_name,
      password_shown_once: nueva,
      message: 'Entrega esta contraseña al usuario. No volverá a mostrarse.',
    });
  } catch (e) {
    registrarFallo('POST /api/admin/users/:id/reset-password', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
