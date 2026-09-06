import { perfilActual } from '@crm123/core/auth';
import { generarContrasena } from '@crm123/core/password';
import { jsonError, jsonOk } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/generate-password
 *
 * La contraseña inicial la genera el SERVIDOR, nunca el navegador. Un
 * `Math.random()` en el cliente es predecible, y el resultado se lo va a
 * quedar una persona durante su primer día de trabajo.
 *
 * Esta contraseña no se guarda: se devuelve, el supervisor la ve, la entrega
 * y desaparece. Solo cuenta cuando se envía a `POST /api/admin/users`.
 */
export async function GET() {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }
  return jsonOk({ password: generarContrasena() });
}
