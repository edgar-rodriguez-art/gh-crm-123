import { z } from 'zod';
import { createClient } from '@crm123/core/supabase/server';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { TEXTO } from '@crm123/core/labels';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { registrarIntento, olvidarIntentos, ipDe } from '@crm123/core/rate-limit';
import { avisarSiLaClaveNoEsDeServicio } from '@crm123/core/diagnostico';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login   ·   TECHNICAL_SPEC §6 y §7.1
 *
 * El vendedor entra con NOMBRE DE USUARIO. Nunca ve un email. Supabase Auth
 * identifica por email, así que el servidor traduce usuario → email con la
 * clave de servicio (uno de los cuatro usos permitidos, TECHNICAL_SPEC §2).
 *
 * ── La regla que gobierna este archivo ────────────────────────────────
 * El error es SIEMPRE el mismo texto, con el mismo código y el mismo estado,
 * para los tres casos de fallo: usuario inexistente, contraseña errónea y
 * cuenta desactivada. Distinguirlos permitiría enumerar usuarios
 * (CLAUDE.md prohibición 18, DESIGN_BRIEF §8.1).
 *
 * Por eso el perfil que se lee aquí con la clave de servicio NO SALE NUNCA
 * de esta función: ni un dato, ni una pista en el cuerpo, ni un estado HTTP
 * distinto.
 */

const esquema = z.object({
  username: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  // El límite se cuenta ANTES de mirar la credencial: si no, un atacante
  // aprende la diferencia entre «bloqueado» y «no bloqueado».
  const ip = ipDe(request);
  const limite = registrarIntento(`login:${ip}`);
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

    // Paso 3 de TECHNICAL_SPEC §6. `lower(username)` en los dos lados.
    const { data: perfil, error: errorPerfil } = await admin
      .from('profiles')
      .select('id, email, is_active, must_change_password, role')
      .ilike('username', datos.username.toLowerCase())
      .maybeSingle();

    // Una consulta que falla NO es una credencial mala: es un problema
    // nuestro, y devolver 401 lo escondería detrás de un mensaje falso.
    if (errorPerfil) {
      registrarFallo('login · lectura de profiles con la clave de servicio', errorPerfil);
      return jsonError(500, 'internal_error', TEXTO.errorGenerico);
    }

    // Paso 4: no existe, o está desactivado → 401 genérico.
    if (!perfil || !perfil.is_active) {
      // Antes de darlo por credencial mala, se comprueba en el registro si la
      // causa real es que la clave de servicio no es de servicio. Lo que ve
      // la persona no cambia: el mensaje sigue siendo idéntico en los tres
      // casos de fallo (DESIGN_BRIEF §8.1).
      if (!perfil) await avisarSiLaClaveNoEsDeServicio(admin);
      return credencialesInvalidas();
    }

    // Paso 5: ahora sí, con el cliente de sesión, para que se escriba la cookie.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: perfil.email,
      password: datos.password,
    });

    // Paso 6: contraseña errónea → el MISMO 401 genérico.
    if (error) return credencialesInvalidas();

    // Un ingreso correcto no debe consumir el cupo de la IP.
    olvidarIntentos(`login:${ip}`);

    // Pasos 8 y 9. En el escritorio, el supervisor también aterriza en el
    // tablero: «/panel» es la pantalla de inicio de la PWA, no de /web.
    return jsonOk({
      redirect_to: perfil.must_change_password ? '/cambiar-contrasena' : '/tablero',
    });
  } catch (e) {
    registrarFallo('POST /api/auth/login', e);
    return jsonError(500, 'internal_error', TEXTO.errorGenerico);
  }
}
