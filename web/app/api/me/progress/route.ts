import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/me/progress   ·   TECHNICAL_SPEC §7.5
 *
 * Cuota, cerrado, restante y porcentaje del mes en curso. Sale entero de
 * `v_seller_month_progress`; aquí no se suma ni se calcula nada.
 *
 * Lo consume el aviso que aparece tras registrar una venta, que necesita el
 * porcentaje YA ACTUALIZADO: «Venta registrada: 1.180,00 €. Llevas el 74,2 %
 * de tu meta.» (DESIGN_BRIEF §8.6).
 */
export async function GET() {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('v_seller_month_progress')
      .select('quota_amount, closed_amount, remaining_amount, quota_percent, closed_count')
      .eq('profile_id', perfil.id)
      .maybeSingle();

    if (error) {
      registrarFallo('GET /api/me/progress', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    // Sin cuota fijada, `quota_percent` viaja como null y la interfaz muestra
    // «—», nunca «0 %» (regla R8).
    return jsonOk({
      quota_amount: data?.quota_amount ?? null,
      closed_amount: data?.closed_amount ?? 0,
      remaining_amount: data?.remaining_amount ?? null,
      quota_percent: (data?.quota_amount ?? 0) > 0 ? (data?.quota_percent ?? 0) : null,
      closed_count: data?.closed_count ?? 0,
    });
  } catch (e) {
    registrarFallo('GET /api/me/progress', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
