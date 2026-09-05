import { z } from 'zod';
import { createClient } from '@crm123/core/supabase/server';
import { validarContrasena, LONGITUD_MINIMA } from '@crm123/core/password';
import { auditar } from '@crm123/core/audit';
import { TEXTO } from '@crm123/core/labels';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/change-password   ·   TECHNICAL_SPEC §6
 *
 * No pide la contraseña actual: el usuario acaba de autenticarse.
 *
 * Orden de las tres escrituras, tal como lo fija la especificación:
 *   1. `updateUser({ password })`
 *   2. `profiles.must_change_password = false`
 *   3. auditoría `user.password_changed` con `{ first_login }`
 *
 * El orden importa. Si se bajase la bandera antes de cambiar la credencial y
 * el cambio fallara, el usuario se quedaría con la contraseña que le dieron
 * en persona y sin nadie que le vuelva a pedir cambiarla.
 */

const esquema = z
  .object({
    password: z.string().min(LONGITUD_MINIMA),
    confirmacion: z.string().min(LONGITUD_MINIMA),
  })
  .refine((d) => d.password === d.confirmacion, {
    message: 'Las dos contraseñas no coinciden.',
    path: ['confirmacion'],
  });

export async function POST(request: Request) {
  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError
        ? (e.issues[0]?.message ?? TEXTO.peticionInvalida)
        : TEXTO.peticionInvalida;
    return jsonError(422, 'invalid_password', mensaje);
  }

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError(401, 'unauthorized');

    // El nombre de usuario sale de `profiles`, no del formulario: la regla es
    // «no puede contener TU nombre de usuario», y ese dato lo tiene el
    // servidor, no el cliente.
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, username, must_change_password')
      .eq('id', user.id)
      .single();

    if (!perfil) return jsonError(401, 'unauthorized');

    // Validación en el SERVIDOR. La del cliente es cortesía (CLAUDE.md §5).
    const fallo = validarContrasena(datos.password, perfil.username);
    if (fallo) return jsonError(422, fallo.codigo, fallo.mensaje);

    // 1. La credencial.
    const { error: errorAuth } = await supabase.auth.updateUser({ password: datos.password });
    if (errorAuth) {
      registrarFallo('change-password · updateUser', errorAuth);
      return jsonError(500, 'internal_error', TEXTO.errorGenerico);
    }

    const primerAcceso = perfil.must_change_password;

    // 2. La bandera. RLS deja que cada quien actualice su propio perfil.
    const { error: errorPerfil } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id);

    if (errorPerfil) {
      registrarFallo('change-password · profiles.update', errorPerfil);
      return jsonError(500, 'internal_error', TEXTO.errorGenerico);
    }

    // 3. El asiento.
    await auditar({
      action: 'user.password_changed',
      entityType: 'profile',
      entityId: user.id,
      metadata: { first_login: primerAcceso },
    });

    return jsonOk({ redirect_to: '/tablero' });
  } catch (e) {
    registrarFallo('POST /api/auth/change-password', e);
    return jsonError(500, 'internal_error', TEXTO.errorGenerico);
  }
}
