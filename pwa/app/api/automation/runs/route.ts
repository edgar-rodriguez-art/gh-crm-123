import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/automation/runs   ·   TECHNICAL_SPEC §7.7
 *
 * Últimas ejecuciones. Lo sondea la PWA cada 5 segundos mientras la hoja está
 * en «Enviando…», con un máximo de 24 intentos (2 minutos). Sin websockets ni
 * suscripciones en tiempo real (TECHNICAL_SPEC §13).
 *
 * `automation_runs` solo tiene política de SELECT para supervisor, así que la
 * lectura con el cliente de sesión ya está limitada por RLS. La comprobación
 * de rol es la segunda cerradura.
 */
export async function GET(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  const runId = new URL(request.url).searchParams.get('run_id');

  try {
    const supabase = createClient();
    let consulta = supabase
      .from('automation_runs')
      .select('id, flow, status, trigger_type, emails_sent, started_at, finished_at, error_message')
      .eq('flow', 'morning_digest')
      .order('started_at', { ascending: false })
      .limit(runId ? 1 : 10);

    if (runId) consulta = consulta.eq('id', runId);

    const { data, error } = await consulta;

    if (error) {
      registrarFallo('GET /api/automation/runs', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    return jsonOk({ items: data ?? [] });
  } catch (e) {
    registrarFallo('GET /api/automation/runs', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
