import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { Constants } from '@crm123/core/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunities/:id/lose   ·   TECHNICAL_SPEC §7.3 y R4
 *
 * El motivo es OBLIGATORIO y sale de la lista cerrada de siete valores. La
 * nota es opcional, máximo 500 caracteres. `final_amount` queda NULO: una
 * venta perdida no aporta importe, y `opportunities_lost_coherent` lo exige.
 *
 * El botón de confirmar está apagado en la interfaz hasta elegir motivo, pero
 * eso es cortesía: la validación que cuenta es esta.
 */
const esquema = z.object({
  loss_reason: z.enum(Constants.public.Enums.loss_reason),
  loss_note: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch {
    return jsonError(422, 'loss_reason_required', 'El motivo de la pérdida es obligatorio.');
  }

  try {
    const supabase = createClient();

    const { data: antes } = await supabase
      .from('opportunities')
      .select('id, status, estimated_amount')
      .eq('id', params.id)
      .maybeSingle();

    if (!antes) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');
    if (antes.status !== 'open') {
      return jsonError(409, 'already_closed', 'Esta oportunidad ya está cerrada.');
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update({
        status: 'lost',
        stage: 'closed',
        loss_reason: datos.loss_reason,
        loss_note: datos.loss_note?.trim() || null,
        closed_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, status, loss_reason, closed_at')
      .maybeSingle();

    if (error) {
      registrarFallo('POST /api/opportunities/:id/lose', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    await auditar({
      action: 'opportunity.lost',
      entityType: 'opportunity',
      entityId: data.id,
      metadata: {
        loss_reason: datos.loss_reason,
        estimated_amount: antes.estimated_amount,
      },
    });

    return jsonOk(data);
  } catch (e) {
    registrarFallo('POST /api/opportunities/:id/lose', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
