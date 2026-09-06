import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createAdminClient } from '@crm123/core/supabase/admin';
import { normalizarTelefono } from '@crm123/core/phone';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/customers/check-phone   ·   TECHNICAL_SPEC §4 R1
 *
 * ════════════════════════════════════════════════════════════════════
 *  ESTE ARCHIVO ES LA FRONTERA DE AISLAMIENTO ENTRE VENDEDORES.
 * ════════════════════════════════════════════════════════════════════
 *
 * Consulta CON LA CLAVE DE SERVICIO, porque RLS ocultaría el cliente de otro
 * vendedor y el índice único saltaría después con un error incomprensible.
 * Es uno de los cuatro usos permitidos (TECHNICAL_SPEC §2), y por eso lleva
 * la comprobación de sesión inmediatamente antes.
 *
 * De todo lo que lee, esta función devuelve EXACTAMENTE TRES COSAS:
 *
 *   · que el teléfono existe,
 *   · si lo lleva otro compañero (un booleano, sin decir quién),
 *   · y, SOLO si el cliente es del propio vendedor, su `customer_id`.
 *
 * NUNCA sale de aquí el nombre, la empresa, el propietario, la fecha de alta
 * ni ningún otro dato del cliente ajeno. Ni por curiosidad, ni por
 * amabilidad, ni «para que el mensaje sea más útil»
 * (DESIGN_BRIEF §8.6 y §14.6, CLAUDE.md prohibición 17).
 *
 * Al revisar este archivo, la pregunta es siempre la misma: ¿puede alguien
 * deducir algo de un cliente que no es suyo? Si la respuesta no es un no
 * rotundo, el cambio está mal.
 */

const esquema = z.object({ phone: z.string().min(1).max(30) });

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
  if (!normalizado.ok) {
    return jsonError(422, 'invalid_phone', normalizado.mensaje);
  }

  try {
    // La comparación se hace SIEMPRE sobre el valor normalizado (R2).
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('customers')
      .select('id, owner_id')
      .eq('phone', normalizado.telefono)
      .maybeSingle();

    if (error) {
      registrarFallo('check-phone · consulta con la clave de servicio', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    if (!data) {
      return jsonOk({ available: true, phone: normalizado.telefono });
    }

    const esSuyo = data.owner_id === perfil.id;

    if (esSuyo) {
      return jsonError(409, 'customer_exists', 'Ya tienes a este cliente registrado.', {
        owned_by_other: false,
        customer_id: data.id,
      });
    }

    // El cliente es de otro. Se devuelve el booleano y NADA MÁS: ni `data.id`,
    // ni `data.owner_id`, ni un mensaje que insinúe de quién es.
    return jsonError(
      409,
      'customer_exists',
      'Este cliente ya existe en el sistema y lo lleva otro compañero.',
      { owned_by_other: true },
    );
  } catch (e) {
    registrarFallo('POST /api/customers/check-phone', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
