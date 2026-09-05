import 'server-only';

import { createClient } from './supabase/server';
import type { Json } from './types/database';

/**
 * Escritura en `audit_log`.  TECHNICAL_SPEC §4 R12.
 *
 * Las 14 acciones son una lista CERRADA: la base las impone con la
 * restricción `audit_log_action_allowed` (SCRIPTS-SQL §7). Tenerlas aquí como
 * tipo hace que inventarse una decimoquinta no compile, en vez de fallar en
 * producción con un error de restricción.
 *
 * `audit_log` es solo de inserción: sin `update` ni `delete` para nadie,
 * incluido el supervisor (CLAUDE.md regla 3).
 */
export type AccionAuditoria =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.archived'
  | 'customer.reassigned'
  | 'opportunity.created'
  | 'opportunity.stage_changed'
  | 'opportunity.won'
  | 'opportunity.lost'
  | 'user.created'
  | 'user.deactivated'
  | 'user.reactivated'
  | 'user.password_changed'
  | 'quota.changed'
  | 'automation.manual_trigger';

export type TipoEntidad = 'customer' | 'opportunity' | 'profile' | 'quota' | 'automation';

type Asiento = {
  action: AccionAuditoria;
  entityType: TipoEntidad;
  entityId?: string | null;
  metadata?: Record<string, Json>;
};

/**
 * Deja un asiento. `actor_id` lo pone la base con `auth.uid()` por defecto,
 * así que se escribe con el cliente de sesión, no con la clave de servicio.
 *
 * No lanza: una auditoría que falla no debe tumbar la operación que auditaba.
 * Se registra en el servidor y se sigue.  El detalle NUNCA lleva el teléfono
 * completo, ni el email, ni la contraseña (TECHNICAL_SPEC §4 R12).
 */
export async function auditar({
  action,
  entityType,
  entityId = null,
  metadata = {},
}: Asiento): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('audit_log').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata as Json,
    });
    if (error) {
      console.error('[CRM-123] No se pudo escribir en audit_log:', action, error.message);
    }
  } catch (e) {
    console.error('[CRM-123] No se pudo escribir en audit_log:', action, e);
  }
}
