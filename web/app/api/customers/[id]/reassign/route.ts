import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/customers/:id/reassign   ·   Solo supervisor.  TECHNICAL_SPEC §7.2, R6
 *
 * Cambia `customers.owner_id`. Las oportunidades del cliente las arrastra el
 * disparador `customers_reassign_cascade`, no este código: si se hiciera aquí
 * a mano, una reasignación por SQL directo dejaría las oportunidades con el
 * propietario viejo y el aislamiento se rompería en silencio.
 */
const esquema = z.object({ to_owner_id: z.string().uuid() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch {
    return jsonError(400, 'bad_request', 'No hemos podido procesar la petición.');
  }

  try {
    const supabase = createClient();

    // El destino debe existir y estar activo: reasignar a alguien desactivado
    // dejaría la cartera sin dueño efectivo, porque sus funciones de RLS
    // devuelven falso.
    const { data: destino } = await supabase
      .from('profiles')
      .select('id, is_active, role')
      .eq('id', datos.to_owner_id)
      .maybeSingle();

    if (!destino || !destino.is_active) {
      return jsonError(422, 'invalid_target', 'Ese vendedor no está disponible.');
    }

    const { data: antes } = await supabase
      .from('customers')
      .select('id, owner_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!antes) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    const { data, error } = await supabase
      .from('customers')
      .update({ owner_id: datos.to_owner_id })
      .eq('id', params.id)
      .select('id, owner_id')
      .maybeSingle();

    if (error) {
      registrarFallo('POST /api/customers/:id/reassign', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    await auditar({
      action: 'customer.reassigned',
      entityType: 'customer',
      entityId: data.id,
      metadata: { from_owner_id: antes.owner_id, to_owner_id: datos.to_owner_id },
    });

    return jsonOk(data);
  } catch (e) {
    registrarFallo('POST /api/customers/:id/reassign', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
