import { z } from 'zod';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { verificar } from '@crm123/core/hmac';
import { env } from '@crm123/core/env';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

// `node:crypto` no existe en el entorno de borde (CLAUDE.md §8).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/n8n/digest-result   ·   TECHNICAL_SPEC §8
 *
 * n8n informa de cómo fue el envío y aquí se cierra la fila de
 * `automation_runs`. Sin sesión: la autoriza la firma.
 *
 * ── Por qué se lee el cuerpo CRUDO ────────────────────────────────────
 * `await request.text()`, y esa cadena exacta es la que se firma. Si se
 * hiciera `request.json()` y luego `JSON.stringify`, el orden de las claves o
 * el espaciado podrían cambiar y la firma dejaría de cuadrar aunque el
 * contenido fuera idéntico (TECHNICAL_SPEC §8).
 */
const esquema = z.object({
  run_id: z.string().uuid(),
  status: z.enum(['success', 'failed']),
  emails_sent: z.number().int().nonnegative(),
  error_message: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  const configuracion = env();
  const secreto = configuracion.N8N_SHARED_SECRET;

  if (!secreto) {
    registrarFallo('digest-result', 'N8N_SHARED_SECRET no está configurado');
    return jsonError(401, 'invalid_signature');
  }

  // El cuerpo CRUDO, antes de interpretarlo.
  const cuerpoCrudo = await request.text();

  const verificacion = verificar(request.headers, cuerpoCrudo, secreto);
  if (!verificacion.valido) {
    registrarFallo('digest-result · firma rechazada', { message: verificacion.motivo });
    return jsonError(401, 'invalid_signature');
  }

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(JSON.parse(cuerpoCrudo));
  } catch {
    return jsonError(400, 'bad_request');
  }

  try {
    const admin = createAdminClient();

    const { data: ejecucion } = await admin
      .from('automation_runs')
      .select('id, status')
      .eq('id', datos.run_id)
      .maybeSingle();

    if (!ejecucion) return jsonError(404, 'run_not_found');

    // Una ejecución ya cerrada no se reabre: si n8n reintentara el aviso, el
    // recuento de correos no debe sobrescribirse con el de otra pasada.
    if (ejecucion.status !== 'running') {
      return jsonError(409, 'run_already_closed');
    }

    const { error } = await admin
      .from('automation_runs')
      .update({
        status: datos.status,
        emails_sent: datos.emails_sent,
        finished_at: new Date().toISOString(),
        error_message: datos.error_message ?? null,
      })
      .eq('id', datos.run_id);

    if (error) {
      registrarFallo('digest-result · update automation_runs', error);
      return jsonError(500, 'internal_error');
    }

    return jsonOk({ ok: true });
  } catch (e) {
    registrarFallo('POST /api/n8n/digest-result', e);
    return jsonError(500, 'internal_error');
  }
}
