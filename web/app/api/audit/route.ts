import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { limiteDiaMadrid } from '@crm123/core/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGINA = 50;

/**
 * GET /api/audit   ·   TECHNICAL_SPEC §7.5
 *
 * Auditoría paginada, SOLO LECTURA. No existe POST, PATCH ni DELETE en este
 * archivo: `audit_log` es de inserción y los asientos los escribe cada acción
 * desde su propio endpoint (CLAUDE.md regla 3).
 *
 * El rango de fechas filtra en el SERVIDOR por `created_at`, e incluye ambos
 * extremos: `hasta` se convierte al final de ese día en horario de Madrid,
 * porque si no, filtrar «hasta el 5» dejaría fuera todo lo del día 5.
 */
export async function GET(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  const url = new URL(request.url);
  const entidad = url.searchParams.get('entity_type') ?? '';
  const actor = url.searchParams.get('actor_id') ?? '';
  const desde = url.searchParams.get('from') ?? '';
  const hasta = url.searchParams.get('to') ?? '';
  const pagina = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);

  try {
    const supabase = createClient();

    let consulta = supabase
      .from('audit_log')
      .select('id, created_at, actor_id, action, entity_type, entity_id, metadata', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (entidad) consulta = consulta.eq('entity_type', entidad);
    if (actor) consulta = consulta.eq('actor_id', actor);

    // `aaaa-mm-dd` en Madrid → instante UTC, con el desfase real de esa fecha
    // (+1 h en invierno, +2 h en verano). Cortar con `T00:00:00Z` a secas
    // desplazaría el rango una o dos horas y «hasta el 5» perdería parte del
    // día 5.
    if (desde) consulta = consulta.gte('created_at', limiteDiaMadrid(desde));
    if (hasta) consulta = consulta.lte('created_at', limiteDiaMadrid(hasta, true));

    const inicio = (pagina - 1) * PAGINA;
    const { data, error, count } = await consulta.range(inicio, inicio + PAGINA - 1);

    if (error) {
      registrarFallo('GET /api/audit', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    return jsonOk({ items: data ?? [], total: count ?? 0, page: pagina, page_size: PAGINA });
  } catch (e) {
    registrarFallo('GET /api/audit', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
