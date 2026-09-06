import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { Constants } from '@crm123/core/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunities/:id/activities   ·   TECHNICAL_SPEC §7.4 y R5
 *
 * Las actividades se INSERTAN y nunca se modifican. No existe `PATCH` ni
 * `DELETE` en este archivo, y no es un olvido: no se implementan, ni siquiera
 * desactivados (CLAUDE.md regla 3). La base tampoco tiene políticas para
 * ello, así que aunque alguien escribiera el endpoint, no funcionaría.
 *
 * Tres cosas las hace el disparador `activities_sync`, no este código:
 *   · rellenar `customer_id` a partir de la oportunidad,
 *   · refrescar `last_activity_at` y copiar `next_action_at` si viene,
 *   · rechazar la actividad si la oportunidad está cerrada.
 *
 * Aun así se envían `customer_id` y `author_id`, porque la política
 * `activities_insert_own` los comprueba y no acepta nulos.
 */
const esquema = z.object({
  type: z.enum(Constants.public.Enums.activity_type),
  note: z.string().trim().min(1).max(2000),
  next_action_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch {
    return jsonError(400, 'bad_request', 'No hemos podido procesar la petición.');
  }

  try {
    const supabase = createClient();

    const { data: oportunidad } = await supabase
      .from('opportunities')
      .select('id, customer_id, status')
      .eq('id', params.id)
      .maybeSingle();

    if (!oportunidad) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');
    if (oportunidad.status !== 'open') {
      return jsonError(409, 'opportunity_closed', 'Esta oportunidad ya está cerrada.');
    }

    const { data, error } = await supabase
      .from('activities')
      .insert({
        opportunity_id: oportunidad.id,
        customer_id: oportunidad.customer_id,
        author_id: perfil.id,
        type: datos.type,
        note: datos.note,
        next_action_at: datos.next_action_at ?? null,
      })
      .select('id, type, note, created_at, next_action_at')
      .single();

    if (error || !data) {
      if ((error?.message ?? '').includes('cerrada')) {
        return jsonError(409, 'opportunity_closed', 'Esta oportunidad ya está cerrada.');
      }
      registrarFallo('POST /api/opportunities/:id/activities', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    // Registrar una actividad NO deja asiento en `audit_log`: no está entre
    // las 14 acciones auditadas de TECHNICAL_SPEC §4 R12, y no hace falta —
    // la propia actividad ya es un registro inmutable con su autor y su hora.
    return jsonOk(data, 201);
  } catch (e) {
    registrarFallo('POST /api/opportunities/:id/activities', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
