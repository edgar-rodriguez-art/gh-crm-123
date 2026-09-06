import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { auditar } from '@crm123/core/audit';
import { validarContrasena, LONGITUD_MINIMA } from '@crm123/core/password';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users   ·   TECHNICAL_SPEC §6 «Alta de usuarios» y §7.6
 *
 * ── La contraseña se muestra UNA SOLA VEZ ─────────────────────────────
 * Se devuelve en esta respuesta y NO SE GUARDA EN NINGÚN SITIO: ni en
 * `profiles`, ni en un correo, ni en un registro. Lo único que queda es su
 * huella bcrypt dentro de `auth.users`, que es de un solo sentido.
 *
 * Por eso el aviso de la interfaz dice «No volverá a mostrarse»: no es
 * dramatismo, es que literalmente no se puede. Si el usuario la pierde, el
 * supervisor genera otra con «Restablecer contraseña».
 *
 * ── Por qué las columnas de token van a cadena vacía ──────────────────
 * `auth.admin.createUser` las rellena solo, así que aquí no hace falta. Es la
 * ventaja de usar la API de Supabase en vez de un `insert` a mano: el Script
 * 11 lo hizo a mano y por eso ningún usuario de ejemplo podía entrar.
 */
const esquema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._-]{3,32}$/, 'Solo minúsculas, números, punto, guion y guion bajo (3-32).'),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  role: z.enum(['seller', 'supervisor']),
  password: z.string().min(LONGITUD_MINIMA),
  quota_amount: z.number().nonnegative().finite().nullable().optional(),
});

export async function POST(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  // El rol se lee de `profiles`, nunca del JWT.
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? (e.issues[0]?.message ?? 'Datos no válidos.') : 'Datos no válidos.';
    return jsonError(422, 'invalid_input', mensaje);
  }

  const fallo = validarContrasena(datos.password, datos.username);
  if (fallo) return jsonError(422, fallo.codigo, fallo.mensaje);

  const admin = createAdminClient();
  let usuarioCreado: string | null = null;

  try {
    // El nombre de usuario no puede repetirse.
    const { data: existente } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', datos.username)
      .maybeSingle();

    if (existente) {
      return jsonError(409, 'username_taken', 'Ese nombre de usuario ya está en uso.');
    }

    const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
      email: datos.email,
      password: datos.password,
      email_confirm: true,
    });

    if (errorAuth || !creado.user) {
      if ((errorAuth?.message ?? '').toLowerCase().includes('already')) {
        return jsonError(409, 'email_taken', 'Ese email ya está en uso.');
      }
      registrarFallo('admin/users · createUser', errorAuth);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    usuarioCreado = creado.user.id;

    const { error: errorPerfil } = await admin.from('profiles').insert({
      id: creado.user.id,
      username: datos.username,
      full_name: datos.full_name,
      email: datos.email,
      role: datos.role,
      // Nace con el cambio pendiente: se le pedirá en su primer acceso.
      must_change_password: true,
    });

    if (errorPerfil) {
      // Si el perfil no entra, el usuario de auth se queda huérfano y el
      // nombre de usuario parecería libre cuando no lo está. Se deshace.
      await admin.auth.admin.deleteUser(creado.user.id);
      usuarioCreado = null;

      if ((errorPerfil as { code?: string }).code === '23505') {
        return jsonError(409, 'username_taken', 'Ese nombre de usuario ya está en uso.');
      }
      registrarFallo('admin/users · insert profiles', errorPerfil);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    // La cuota del mes en curso, si se indicó.
    if (datos.quota_amount != null) {
      const ahora = new Date();
      const { error: errorCuota } = await createClient().from('quotas').insert({
        profile_id: creado.user.id,
        period_year: Number(
          new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric' }).format(ahora),
        ),
        period_month: Number(
          new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', month: 'numeric' }).format(ahora),
        ),
        amount_eur: datos.quota_amount,
      });
      if (errorCuota) registrarFallo('admin/users · cuota inicial', errorCuota);
    }

    await auditar({
      action: 'user.created',
      entityType: 'profile',
      entityId: creado.user.id,
      // `metadata` NUNCA lleva el email ni la contraseña (§4 R12).
      metadata: { username: datos.username, role: datos.role },
    });

    return jsonOk(
      {
        id: creado.user.id,
        username: datos.username,
        full_name: datos.full_name,
        role: datos.role,
        password_shown_once: datos.password,
        message: 'Entrega esta contraseña al usuario. No volverá a mostrarse.',
      },
      201,
    );
  } catch (e) {
    if (usuarioCreado) {
      await admin.auth.admin.deleteUser(usuarioCreado).catch(() => undefined);
    }
    registrarFallo('POST /api/admin/users', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
