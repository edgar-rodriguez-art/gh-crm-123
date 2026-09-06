import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { Constants, type TablesUpdate } from '@crm123/core/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/customers/:id   ·   TECHNICAL_SPEC §7.2
 *
 * Edita nombre, empresa y canal. **El teléfono NO es editable**: es el
 * identificador único del cliente (`customers_phone_uk`), y cambiarlo
 * exigiría un endpoint aparte con comprobación de unicidad y una decisión
 * sobre el historial. Es el valor por defecto que fija README.handoff §6; si
 * el cliente lo escribiera, Zod lo ignora porque no está en el esquema.
 *
 * No hace falta filtrar por propietario: RLS ya impide tocar lo ajeno. Añadir
 * un `where owner_id = ...` daría la falsa impresión de que la seguridad vive
 * aquí (TECHNICAL_SPEC §5.2).
 */
const esquema = z
  .object({
    full_name: z.string().trim().min(2).max(120).optional(),
    company: z.string().trim().max(120).nullable().optional(),
    source: z.enum(Constants.public.Enums.customer_source).nullable().optional(),
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

    const cambios: TablesUpdate<'customers'> = {};
    if (datos.full_name !== undefined) cambios.full_name = datos.full_name;
    if (datos.company !== undefined) cambios.company = datos.company?.trim() || null;
    if (datos.source !== undefined) cambios.source = datos.source;

    const { data, error } = await supabase
      .from('customers')
      .update(cambios)
      .eq('id', params.id)
      .select('id, full_name, company, source')
      .maybeSingle();

    if (error) {
      registrarFallo('PATCH /api/customers/:id', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    // Cero filas puede ser RLS haciendo su trabajo, o un cliente archivado
    // (la política de actualización exige `is_archived = false`). En los dos
    // casos, para quien pregunta, no existe.
    if (!data) return jsonError(404, 'not_found', 'No hemos encontrado lo que buscas.');

    await auditar({
      action: 'customer.updated',
      entityType: 'customer',
      entityId: data.id,
      metadata: { changed_fields: Object.keys(cambios) },
    });

    return jsonOk(data);
  } catch (e) {
    registrarFallo('PATCH /api/customers/:id', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
