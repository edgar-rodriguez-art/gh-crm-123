import { z } from 'zod';
import { createClient } from '@crm123/core/supabase/server';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { TEXTO } from '@crm123/core/labels';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { registrarIntento, olvidarIntentos, ipDe } from '@crm123/core/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login  ·  PWA del supervisor.
 *
 * Idéntico al del escritorio salvo por un paso más: **solo entran
 * supervisores** (DESIGN_BRIEF §9). Un vendedor con credenciales correctas
 * recibe «Esta aplicación es solo para supervisores. Entra desde el
 * escritorio.» y se le cierra la sesión que se acababa de abrir.
 *
 * Ese mensaje distinto NO filtra nada: para verlo hay que haber acertado ya
 * usuario y contraseña. Antes de ese punto, el error sigue siendo el mismo
 * texto genérico para los tres casos de fallo.
 */

const esquema = z.object({
  username: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const ip = ipDe(request);
  const limite = registrarIntento(`login-pwa:${ip}`);
  if (!limite.permitido) {
    return jsonError(429, 'too_many_attempts', TEXTO.demasiadosIntentos, {
      retry_after_seconds: limite.reintentarEn,
    });
  }

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch {
    return jsonError(400, 'bad_request', TEXTO.peticionInvalida);
  }

  const credencialesInvalidas = () =>
    jsonError(401, 'invalid_credentials', TEXTO.credencialesInvalidas);

  try {
    const admin = createAdminClient();

    const { data: perfil } = await admin
      .from('profiles')
      .select('id, email, is_active, must_change_password, role')
      .ilike('username', datos.username.toLowerCase())
      .maybeSingle();

    if (!perfil || !perfil.is_active) return credencialesInvalidas();

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: perfil.email,
      password: datos.password,
    });
    if (error) return credencialesInvalidas();

    olvidarIntentos(`login-pwa:${ip}`);

    // El rol se lee de `profiles`, nunca del JWT (CLAUDE.md regla 10).
    if (perfil.role !== 'supervisor') {
      // La sesión abierta hace un instante se cierra: si se dejara viva, un
      // vendedor tendría cookie válida en la PWA aunque no pueda ver nada.
      await supabase.auth.signOut();
      return jsonError(403, 'only_supervisors', TEXTO.soloSupervisores);
    }

    return jsonOk({
      redirect_to: perfil.must_change_password ? '/cambiar-contrasena' : '/panel',
    });
  } catch (e) {
    registrarFallo('POST /api/auth/login (pwa)', e);
    return jsonError(500, 'internal_error', TEXTO.errorGenerico);
  }
}
