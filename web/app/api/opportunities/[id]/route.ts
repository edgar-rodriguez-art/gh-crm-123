import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import type { TablesUpdate } from '@crm123/core/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/opportunities/:id   ·   TECHNICAL_SPEC §7.3
 * Cambia etapa, importe estimado o próxima acción.
 *
 * `closed` NO se acepta como etapa: una oportunidad se cierra ganándola o
 * perdiéndola, por sus endpoints, que son los que exigen importe final o
 * motivo. Dejar pasar `closed` por aquí sería una puerta trasera para cerrar
 * sin ninguna de las dos cosas (R4).
 *
 * La política `opportunities_update_own` solo deja actualizar filas con
 * `status = 'open'`, así que una cerrada no se puede reabrir ni tocar: RLS lo
 * impone, no el cliente.
 */
const esquema = z
  .object({
    stage: z.enum(['new', 'contacted', 'proposal_sent', 'negotiation']).optional(),
    estimated_amount: z.number().nonnegative().finite().optional(),
    next_action_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay nada que cambiar.' });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

    // La etapa anterior hace falta para el asiento de auditoría.
    const { data: antes } = await supabase
      .from('opportunities')
      .select('id, stage, status')
      .eq('id', params.id)
      .maybeSingle();

    if (!antes) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');
    if (antes.status !== 'open') {
      return jsonError(409, 'already_closed', 'Esta oportunidad ya está cerrada.');
    }

    const cambios: TablesUpdate<'opportunities'> = {};
    if (datos.stage !== undefined) cambios.stage = datos.stage;
    if (datos.estimated_amount !== undefined) cambios.estimated_amount = datos.estimated_amount;
    if (datos.next_action_at !== undefined) cambios.next_action_at = datos.next_action_at;

    const { data, error } = await supabase
      .from('opportunities')
      .update(cambios)
      .eq('id', params.id)
      .select('id, stage, status, estimated_amount, next_action_at')
      .maybeSingle();

    if (error) {
      registrarFallo('PATCH /api/opportunities/:id', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    if (datos.stage !== undefined && datos.stage !== antes.stage) {
      await auditar({
        action: 'opportunity.stage_changed',
        entityType: 'opportunity',
        entityId: data.id,
        metadata: { from_stage: antes.stage, to_stage: datos.stage },
      });
    }

    return jsonOk(data);
  } catch (e) {
    registrarFallo('PATCH /api/opportunities/:id', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
