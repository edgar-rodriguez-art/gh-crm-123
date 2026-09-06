import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { normalizarTelefono } from '@crm123/core/phone';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { Constants } from '@crm123/core/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esquema = z.object({
  phone: z.string().min(1).max(30),
  full_name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().nullable(),
  source: z.enum(Constants.public.Enums.customer_source).optional().nullable(),
});

/**
 * POST /api/customers   ·   TECHNICAL_SPEC §7.2
 *
 * Crea un cliente propio. El teléfono se normaliza ANTES de comprobar el
 * duplicado y antes de guardar (R2), y la comprobación de duplicado usa la
 * clave de servicio con la misma frontera de aislamiento que
 * `/check-phone`: se dice que existe, jamás de quién es.
 */
export async function POST(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch {
    return jsonError(400, 'bad_request', 'No hemos podido procesar la petición.');
  }

  const normalizado = normalizarTelefono(datos.phone);
  if (!normalizado.ok) return jsonError(422, 'invalid_phone', normalizado.mensaje);

  try {
    // Se comprueba antes para poder dar un mensaje comprensible. Si aun así
    // se colara una carrera entre dos peticiones, el índice único
    // `customers_phone_uk` lo impide y se traduce más abajo.
    const admin = createAdminClient();
    const { data: existente } = await admin
      .from('customers')
      .select('id, owner_id')
      .eq('phone', normalizado.telefono)
      .maybeSingle();

    if (existente) {
      return existente.owner_id === perfil.id
        ? jsonError(409, 'customer_exists', 'Ya tienes a este cliente registrado.', {
            owned_by_other: false,
            customer_id: existente.id,
          })
        : jsonError(
            409,
            'customer_exists',
            'Este cliente ya existe en el sistema y lo lleva otro compañero.',
            { owned_by_other: true },
          );
    }

    // La escritura va con el cliente de SESIÓN: RLS exige
    // owner_id = created_by = auth.uid(), que es justo lo que queremos.
    const supabase = createClient();
    const { data: creado, error } = await supabase
      .from('customers')
      .insert({
        phone: normalizado.telefono,
        full_name: datos.full_name,
        company: datos.company?.trim() || null,
        source: datos.source ?? null,
        owner_id: perfil.id,
        created_by: perfil.id,
      })
      .select('id, phone, full_name, company, source')
      .single();

    if (error || !creado) {
      // 23505 = violación de unicidad. Es la carrera que se comentaba arriba.
      if ((error as { code?: string } | null)?.code === '23505') {
        return jsonError(
          409,
          'customer_exists',
          'Este cliente ya existe en el sistema y lo lleva otro compañero.',
          { owned_by_other: true },
        );
      }
      registrarFallo('POST /api/customers · insert', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    // `metadata` nunca lleva el teléfono completo (TECHNICAL_SPEC §4 R12).
    await auditar({
      action: 'customer.created',
      entityType: 'customer',
      entityId: creado.id,
      metadata: { phone_last4: normalizado.telefono.slice(-4), source: creado.source },
    });

    return jsonOk(creado, 201);
  } catch (e) {
    registrarFallo('POST /api/customers', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
