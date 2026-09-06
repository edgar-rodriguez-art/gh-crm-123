import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';
import { Constants } from '@crm123/core/types';
import type { Database } from '@crm123/core/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGINA = 50; // Paginación de 50 en 50 (DESIGN_BRIEF §8.4).

type Etapa = Database['public']['Enums']['opportunity_stage'];
type Canal = Database['public']['Enums']['customer_source'];

export type FilaTabla = {
  opportunity_id: string;
  customer_id: string;
  customer_name: string;
  customer_company: string | null;
  customer_phone: string;
  customer_source: Canal | null;
  stage: Etapa;
  status: 'open' | 'won' | 'lost';
  estimated_amount: number;
  last_activity_at: string | null;
  next_action_at: string | null;
  days_without_activity: number | null;
  is_overdue: boolean;
  needs_attention: boolean;
  owner_id: string;
};

/**
 * GET /api/opportunities   ·   TECHNICAL_SPEC §7.3 · DESIGN_BRIEF §8.4
 *
 * La tabla densa. Se filtra, ordena y pagina EN EL SERVIDOR.
 *
 * ── Dos orígenes, y el motivo ─────────────────────────────────────────
 * `v_opportunity_board` solo contiene oportunidades ABIERTAS de clientes no
 * archivados, y es la única que trae el atraso ya calculado. Así que:
 *
 *   · «Abiertas» (por defecto) → la vista, con su señal de atraso.
 *   · «Ganadas», «Perdidas», «Todas» → `opportunities` cruzada con
 *     `customers`. Una oportunidad cerrada no puede estar atrasada, así que
 *     su columna de señal va vacía, que es lo correcto.
 *
 * El atraso nunca se recalcula aquí (CLAUDE.md prohibición 15).
 */
/** Guarda de tipo: convierte una cadena de la URL en una etapa de verdad. */
function esEtapa(v: string): v is Etapa {
  return (Constants.public.Enums.opportunity_stage as readonly string[]).includes(v);
}

const ORDENABLES_VISTA = new Set([
  'customer_name',
  'stage',
  'estimated_amount',
  'last_activity_at',
  'next_action_at',
  'customer_source',
]);

export async function GET(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const etapa = url.searchParams.get('etapa') ?? '';
  const estado = url.searchParams.get('estado') ?? 'open';
  const soloAtrasadas = url.searchParams.get('atrasadas') === '1';
  const vendedor = url.searchParams.get('vendedor') ?? '';
  const pagina = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const orden = url.searchParams.get('sort') ?? 'next_action_at';
  const desc = url.searchParams.get('dir') === 'desc';

  const desde = (pagina - 1) * PAGINA;
  const hasta = desde + PAGINA - 1;

  // El filtro por vendedor SOLO existe para el supervisor. Si llegara en la
  // URL de un vendedor se ignora — y aunque no se ignorara, RLS solo le
  // devolvería su propia cartera.
  const filtroVendedor = perfil.role === 'supervisor' ? vendedor : '';

  const patron = q ? `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%` : '';

  try {
    const supabase = createClient();

    if (estado === 'open') {
      let consulta = supabase
        .from('v_opportunity_board')
        .select(
          'opportunity_id, customer_id, customer_name, customer_company, customer_phone, customer_source, stage, estimated_amount, last_activity_at, next_action_at, days_without_activity, is_overdue, needs_attention, owner_id',
          { count: 'exact' },
        );

      if (patron) {
        consulta = consulta.or(
          `customer_name.ilike.${patron},customer_company.ilike.${patron},customer_phone.ilike.${patron}`,
        );
      }
      const etapaValida = esEtapa(etapa) ? etapa : null;
      if (etapaValida) consulta = consulta.eq('stage', etapaValida);
      if (soloAtrasadas) consulta = consulta.eq('needs_attention', true);
      if (filtroVendedor) consulta = consulta.eq('owner_id', filtroVendedor);

      const campo = ORDENABLES_VISTA.has(orden) ? orden : 'next_action_at';
      const { data, error, count } = await consulta
        .order(campo, { ascending: !desc, nullsFirst: false })
        .range(desde, hasta);

      if (error) {
        registrarFallo('GET /api/opportunities (abiertas)', error);
        return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
      }

      const items: FilaTabla[] = (data ?? []).map((o) => ({
        opportunity_id: o.opportunity_id as string,
        customer_id: o.customer_id as string,
        customer_name: o.customer_name as string,
        customer_company: o.customer_company,
        customer_phone: o.customer_phone as string,
        customer_source: o.customer_source,
        stage: o.stage as Etapa,
        status: 'open',
        estimated_amount: Number(o.estimated_amount),
        last_activity_at: o.last_activity_at,
        next_action_at: o.next_action_at,
        days_without_activity: o.days_without_activity,
        is_overdue: o.is_overdue ?? false,
        needs_attention: o.needs_attention ?? false,
        owner_id: o.owner_id as string,
      }));

      return jsonOk({ items, total: count ?? 0, page: pagina, page_size: PAGINA });
    }

    // --- Cerradas o todas: desde la tabla, cruzada con el cliente ---
    let consulta = supabase
      .from('opportunities')
      .select(
        'id, stage, status, estimated_amount, final_amount, last_activity_at, next_action_at, owner_id, customer_id, customers!inner(full_name, company, phone, source, is_archived)',
        { count: 'exact' },
      )
      .eq('customers.is_archived', false);

    if (estado === 'won' || estado === 'lost') consulta = consulta.eq('status', estado);
    if (patron) {
      consulta = consulta.or(
        `full_name.ilike.${patron},company.ilike.${patron},phone.ilike.${patron}`,
        { foreignTable: 'customers' },
      );
    }
    const etapaValida2 = esEtapa(etapa) ? etapa : null;
    if (etapaValida2) consulta = consulta.eq('stage', etapaValida2);
    if (filtroVendedor) consulta = consulta.eq('owner_id', filtroVendedor);

    const campoTabla = orden === 'estimated_amount' ? 'estimated_amount' : 'next_action_at';
    const { data, error, count } = await consulta
      .order(campoTabla, { ascending: !desc, nullsFirst: false })
      .range(desde, hasta);

    if (error) {
      registrarFallo('GET /api/opportunities (cerradas)', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    const items: FilaTabla[] = (data ?? []).map((o) => {
      const c = o.customers as unknown as {
        full_name: string;
        company: string | null;
        phone: string;
        source: Canal | null;
      };
      return {
        opportunity_id: o.id,
        customer_id: o.customer_id,
        customer_name: c.full_name,
        customer_company: c.company,
        customer_phone: c.phone,
        customer_source: c.source,
        stage: o.stage,
        status: o.status,
        estimated_amount: Number(o.estimated_amount),
        last_activity_at: o.last_activity_at,
        next_action_at: o.next_action_at,
        // Una oportunidad cerrada no puede estar atrasada.
        days_without_activity: null,
        is_overdue: false,
        needs_attention: false,
        owner_id: o.owner_id,
      };
    });

    return jsonOk({ items, total: count ?? 0, page: pagina, page_size: PAGINA });
  } catch (e) {
    registrarFallo('GET /api/opportunities', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}

/**
 * POST /api/opportunities   ·   TECHNICAL_SPEC §7.3 y R3
 *
 * La etapa arranca SIEMPRE en `new` y no se puede elegir (DESIGN_BRIEF §8.6).
 * El `owner_id` real lo fija el disparador `opportunities_owner_guard` a
 * partir del propietario del cliente: es lo que impide quedarse con la
 * oportunidad de otro aunque se manipule la petición.
 */
const esquemaCrear = z.object({
  customer_id: z.string().uuid(),
  estimated_amount: z.number().nonnegative().finite(),
  next_action_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function POST(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');

  let datos: z.infer<typeof esquemaCrear>;
  try {
    datos = esquemaCrear.parse(await request.json());
  } catch {
    return jsonError(400, 'bad_request', 'No hemos podido procesar la petición.');
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        customer_id: datos.customer_id,
        estimated_amount: datos.estimated_amount,
        next_action_at: datos.next_action_at ?? null,
        stage: 'new',
        status: 'open',
        created_by: perfil.id,
        owner_id: perfil.id, // Lo sobrescribe el disparador con el del cliente.
      })
      .select('id, stage, status, estimated_amount, next_action_at')
      .single();

    if (error || !data) {
      const codigo = (error as { code?: string } | null)?.code;

      // El índice parcial `opportunities_one_open_per_customer_uk` impone una
      // sola abierta por cliente. La interfaz ya oculta el botón; si el índice
      // salta igualmente, se traduce a un mensaje comprensible (R3).
      if (codigo === '23505') {
        return jsonError(
          409,
          'open_opportunity_exists',
          'Este cliente ya tiene una oportunidad abierta.',
        );
      }
      if ((error?.message ?? '').includes('archivado')) {
        return jsonError(409, 'customer_archived', 'Este cliente está archivado.');
      }

      registrarFallo('POST /api/opportunities', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    await auditar({
      action: 'opportunity.created',
      entityType: 'opportunity',
      entityId: data.id,
      metadata: { customer_id: datos.customer_id, estimated_amount: datos.estimated_amount },
    });

    return jsonOk(data, 201);
  } catch (e) {
    registrarFallo('POST /api/opportunities', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
