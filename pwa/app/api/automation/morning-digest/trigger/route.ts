import { createClient } from '@crm123/core/supabase/server';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { cabecerasFirmadas } from '@crm123/core/hmac';
import { envAutomatizacion } from '@crm123/core/env';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { ftime } from '@crm123/core/format';

// `node:crypto` no existe en el entorno de borde (CLAUDE.md §8).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/automation/morning-digest/trigger   ·   TECHNICAL_SPEC §8
 *
 * ════════════════════════════════════════════════════════════════════
 *  EL PUNTO MÁS EXPUESTO DEL SISTEMA: un botón que provoca correos a
 *  diez personas. Las cinco capas son obligatorias, todas.
 * ════════════════════════════════════════════════════════════════════
 *
 * Capa 1 · El rol se lee de `profiles`, nunca del JWT.
 * Capa 2 · Un disparo cada 10 minutos, comprobado contra `automation_runs`.
 * Capa 3 · Firma HMAC con marca de tiempo y nonce.
 * Capa 4 · n8n no toca Postgres: solo `/api/n8n/*`.
 * Capa 5 · Auditoría en `audit_log` y bitácora en `automation_runs`.
 */
export async function POST() {
  try {
    const supabase = createClient();

    // ── Capa 1 ────────────────────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError(401, 'unauthorized');

    // El rol se lee de la TABLA. Un JWT manipulado con `role: supervisor` no
    // sirve de nada porque nadie lo lee.
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', user.id)
      .single();

    if (!perfil || perfil.role !== 'supervisor' || !perfil.is_active) {
      return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
    }

    const admin = createAdminClient();

    // n8n sin configurar se comprueba ANTES de tocar `automation_runs`: si se
    // insertara la fila primero, un fallo de configuración arrancaría el
    // enfriamiento de diez minutos y el supervisor no podría ni reintentar
    // después de arreglarlo.
    const configuracion = envAutomatizacion();
    if (!configuracion) {
      registrarFallo('trigger', 'n8n no está configurado (faltan las variables del Hito 4)');
      return jsonError(
        503,
        'automation_not_configured',
        'El envío del resumen todavía no está configurado. Avisa a quien administra el sistema.',
      );
    }

    // ── Capa 2 · Un disparo cada 10 minutos ───────────────────────────
    // El minuto exacto sale de `settings.morning_digest`, no de una constante
    // escondida en el código.
    const { data: ajuste } = await admin
      .from('settings')
      .select('value')
      .eq('key', 'morning_digest')
      .maybeSingle();

    const enfriamiento =
      Number((ajuste?.value as { manual_cooldown_minutes?: number } | null)?.manual_cooldown_minutes) ||
      10;

    const desde = new Date(Date.now() - enfriamiento * 60_000).toISOString();

    const { data: reciente } = await admin
      .from('automation_runs')
      .select('id, started_at, status')
      .eq('flow', 'morning_digest')
      .gt('started_at', desde)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reciente) {
      // Absorbe el doble clic, el reintento nervioso y los dos supervisores
      // pulsando a la vez. Se presenta como una protección amable, no como un
      // error (DESIGN_BRIEF §10.3, estado E).
      const reapertura = new Date(
        new Date(reciente.started_at).getTime() + enfriamiento * 60_000,
      );
      const minutos = Math.max(
        1,
        Math.round((Date.now() - new Date(reciente.started_at).getTime()) / 60_000),
      );

      return jsonError(429, 'too_soon', 'Espera unos minutos antes de reintentar.', {
        minutes_ago: minutos,
        retry_at: ftime(reapertura),
      });
    }

    // La fila se inserta ANTES de llamar a n8n y hace de cerrojo: existe desde
    // el primer instante, así que una segunda petición simultánea la encuentra
    // y se detiene. `automation_runs` no tiene política de escritura, así que
    // va con la clave de servicio (uno de los cuatro usos permitidos).
    const { data: ejecucion, error: errorEjecucion } = await admin
      .from('automation_runs')
      .insert({
        flow: 'morning_digest',
        status: 'running',
        trigger_type: 'manual',
        triggered_by: perfil.id,
      })
      .select('id, started_at')
      .single();

    if (errorEjecucion || !ejecucion) {
      registrarFallo('trigger · insert automation_runs', errorEjecucion);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    // ── Capa 5 · Auditoría ────────────────────────────────────────────
    await auditar({
      action: 'automation.manual_trigger',
      entityType: 'automation',
      entityId: ejecucion.id,
      metadata: { run_id: ejecucion.id, flow: 'morning_digest' },
    });

    // ── Capa 3 · Firma ────────────────────────────────────────────────
    const cuerpo = JSON.stringify({
      run_id: ejecucion.id,
      flow: 'morning_digest',
      trigger: 'manual',
    });

    try {
      const respuesta = await fetch(configuracion.N8N_WEBHOOK_MORNING_DIGEST_URL, {
        method: 'POST',
        headers: cabecerasFirmadas(cuerpo, configuracion.N8N_SHARED_SECRET),
        body: cuerpo,
        signal: AbortSignal.timeout(15_000),
      });

      if (!respuesta.ok) {
        // Sin esto, la fila se quedaría en «running» para siempre y el límite
        // de 10 minutos bloquearía los reintentos sin explicar por qué.
        await cerrarConFallo(
          admin,
          ejecucion.id,
          `n8n respondió ${respuesta.status}. ¿Está activado el flujo?`,
        );
        return jsonError(502, 'n8n_unreachable', 'Algo ha fallado. Vuelve a intentarlo.');
      }
    } catch (e) {
      registrarFallo('trigger · llamada al webhook de n8n', e);
      await cerrarConFallo(admin, ejecucion.id, 'No se pudo contactar con n8n.');
      return jsonError(502, 'n8n_unreachable', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    // La PWA muestra «Enviando…» y sondea /api/automation/runs cada 5 s.
    return jsonOk({ run_id: ejecucion.id, status: 'running' }, 202);
  } catch (e) {
    registrarFallo('POST /api/automation/morning-digest/trigger', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}

/** Cierra la ejecución como fallida para que el cerrojo no quede colgado. */
async function cerrarConFallo(
  admin: ReturnType<typeof createAdminClient>,
  runId: string,
  mensaje: string,
) {
  await admin
    .from('automation_runs')
    .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: mensaje })
    .eq('id', runId);
}
