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
 * Deja un asiento, con el cliente de SESIÓN (nunca con la clave de servicio):
 * así el actor es siempre quien de verdad hizo la acción.
 *
 * ⚠ `actor_id` se escribe EXPLÍCITAMENTE. La columna no tiene valor por
 * defecto y la política `audit_log_insert_self` exige
 * `actor_id = auth.uid()`, así que omitirlo deja la columna nula y RLS
 * rechaza la fila. Como esta función no lanza, ese rechazo sería invisible:
 * la auditoría quedaría vacía sin que nadie se enterara hasta necesitarla.
 *
 * No lanza a propósito: una auditoría que falla no debe tumbar la operación
 * que auditaba. Se registra en el servidor y se sigue. El detalle NUNCA lleva
 * el teléfono completo, ni el email, ni la contraseña (TECHNICAL_SPEC §4 R12).
 */
export async function auditar({
  action,
  entityType,
  entityId = null,
  metadata = {},
}: Asiento): Promise<void> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error(`[CRM-123] No se pudo auditar ${action}: no hay sesión.`);
      return;
    }

    const { error } = await supabase.from('audit_log').insert({
      actor_id: user.id,
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
