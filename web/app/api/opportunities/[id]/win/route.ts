import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunities/:id/win   ·   TECHNICAL_SPEC §7.3 y R4
 *
 * Ganar fija `status='won'`, `stage='closed'`, `closed_at=now()` y el importe
 * final, que es OBLIGATORIO. La base lo respalda con
 * `opportunities_won_coherent`, así que aunque alguien llamara al endpoint
 * sin importe, la fila no entraría.
 *
 * Ese importe final —no el estimado— es el que suma para la meta del mes
 * (R8), y por eso el diálogo lo precarga con el estimado pero deja
 * corregirlo: un descuento de última hora es lo normal, no la excepción.
 */
const esquema = z.object({ final_amount: z.number().nonnegative().finite() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch {
    return jsonError(422, 'final_amount_required', 'El importe final es obligatorio.');
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
        status: 'won',
        stage: 'closed',
        final_amount: datos.final_amount,
        closed_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, status, final_amount, closed_at')
      .maybeSingle();

    if (error) {
      registrarFallo('POST /api/opportunities/:id/win', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    await auditar({
      action: 'opportunity.won',
      entityType: 'opportunity',
      entityId: data.id,
      metadata: {
        final_amount: datos.final_amount,
        estimated_amount: antes.estimated_amount,
      },
    });

    return jsonOk(data);
  } catch (e) {
    registrarFallo('POST /api/opportunities/:id/win', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
