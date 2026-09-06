import { createAdminClient } from '@crm123/core/supabase/admin';
import { verificar } from '@crm123/core/hmac';
import { envAutomatizacion } from '@crm123/core/env';
import { ETAPA } from '@crm123/core/labels';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

// `node:crypto` no existe en el entorno de borde (CLAUDE.md §8).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/n8n/digest-payload   ·   TECHNICAL_SPEC §8
 *
 * Los datos del resumen, uno por vendedor activo. Lo llama n8n, con firma
 * HMAC y SIN sesión: n8n no tiene cookie ni credenciales de Supabase. Esta es
 * la capa 4 en la práctica — n8n obtiene los datos por aquí porque no puede
 * obtenerlos de ninguna otra forma.
 *
 * El cuerpo firmado de un GET es la CADENA VACÍA.
 *
 * Un vendedor sin nada que reportar recibe igualmente su correo, con el
 * avance de cuota: la ausencia de atrasos es una buena noticia que conviene
 * comunicar (TECHNICAL_SPEC §8).
 */
export async function GET(request: Request) {
  const configuracion = envAutomatizacion();
  const secreto = configuracion?.N8N_SHARED_SECRET;

  if (!secreto) {
    registrarFallo('digest-payload', 'N8N_SHARED_SECRET no está configurado');
    return jsonError(401, 'invalid_signature');
  }

  // El cuerpo firmado de un GET es la cadena vacía.
  const verificacion = verificar(request.headers, '', secreto);
  if (!verificacion.valido) {
    // El motivo va al REGISTRO; a quien llama se le responde siempre lo mismo.
    registrarFallo('digest-payload · firma rechazada', { message: verificacion.motivo });
    return jsonError(401, 'invalid_signature');
  }

  const url = new URL(request.url);
  const runId = url.searchParams.get('run_id');
  const trigger = url.searchParams.get('trigger') === 'scheduled' ? 'scheduled' : 'manual';

  if (!runId) return jsonError(404, 'run_not_found');

  try {
    const admin = createAdminClient();

    const { data: ejecucion } = await admin
      .from('automation_runs')
      .select('id, status')
      .eq('id', runId)
      .maybeSingle();

    if (!ejecucion) {
      // El cron genera su propio run_id y nadie ha creado la fila todavía, así
      // que se crea aquí (TECHNICAL_SPEC §9). Un disparo manual SIEMPRE trae
      // una fila ya creada: si no existe, el run_id es inventado y se rechaza.
      if (trigger !== 'scheduled') return jsonError(404, 'run_not_found');

      const { error } = await admin.from('automation_runs').insert({
        id: runId,
        flow: 'morning_digest',
        status: 'running',
        trigger_type: 'scheduled',
      });
      if (error) {
        registrarFallo('digest-payload · insert automation_runs (cron)', error);
        return jsonError(500, 'internal_error');
      }
    }

    // Solo vendedores ACTIVOS y con email válido.
    const { data: vendedores, error: errorVendedores } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'seller')
      .eq('is_active', true)
      .order('full_name');

    if (errorVendedores) {
      registrarFallo('digest-payload · profiles', errorVendedores);
      return jsonError(500, 'internal_error');
    }

    const ids = (vendedores ?? []).map((v) => v.id);

    const [tableroRes, progresoRes] = await Promise.all([
      ids.length
        ? admin
            .from('v_opportunity_board')
            .select(
              'owner_id, customer_name, customer_company, stage, estimated_amount, days_without_activity, is_overdue, needs_attention, is_due_today, next_action_at',
            )
            .in('owner_id', ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? admin
            .from('v_seller_month_progress')
            .select(
              'profile_id, quota_amount, closed_amount, remaining_amount, quota_percent, closed_count',
            )
            .in('profile_id', ids)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const tablero = tableroRes.data ?? [];
    const progreso = progresoRes.data ?? [];

    const recipients = (vendedores ?? []).map((v) => {
      const suyas = tablero.filter((o) => o.owner_id === v.id);
      const mes = progreso.find((p) => p.profile_id === v.id);

      return {
        profile_id: v.id,
        full_name: v.full_name,
        email: v.email,
        month: {
          quota_amount: mes?.quota_amount ?? null,
          closed_amount: mes?.closed_amount ?? 0,
          remaining_amount: mes?.remaining_amount ?? null,
          // Sin cuota fijada viaja como null y el correo dice que no hay meta,
          // nunca «0 %» (regla R8).
          quota_percent: (mes?.quota_amount ?? 0) > 0 ? (mes?.quota_percent ?? 0) : null,
          closed_count: mes?.closed_count ?? 0,
        },
        needs_attention: suyas
          .filter((o) => o.needs_attention)
          .map((o) => ({
            customer_name: o.customer_name,
            customer_company: o.customer_company,
            // La etapa viaja ya traducida: el correo no debe traducir enums.
            stage: o.stage ? ETAPA[o.stage] : '',
            estimated_amount: o.estimated_amount,
            days_without_activity: o.days_without_activity,
            is_overdue: o.is_overdue,
          })),
        due_today: suyas
          .filter((o) => o.is_due_today && !o.needs_attention)
          .map((o) => ({
            customer_name: o.customer_name,
            stage: o.stage ? ETAPA[o.stage] : '',
            estimated_amount: o.estimated_amount,
            next_action_at: o.next_action_at,
          })),
      };
    });

    // NUNCA sale de aquí el teléfono del cliente ni datos de otro vendedor:
    // cada elemento lleva solo lo suyo (TECHNICAL_SPEC §9).
    return jsonOk({
      run_id: runId,
      generated_at: new Date().toISOString(),
      timezone: 'Europe/Madrid',
      recipients,
    });
  } catch (e) {
    registrarFallo('GET /api/n8n/digest-payload', e);
    return jsonError(500, 'internal_error');
  }
}
