import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { CANAL, ESTADO, MOTIVO_PERDIDA } from '@crm123/core/labels';
import { eur, fdate, fphone } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { ErrorPermisos } from '@/components/estados';
import {
  AccionesSupervisor,
  BotonEditar,
  BotonNuevaOportunidad,
  CopiarTelefono,
} from './acciones-cliente';
import { OportunidadAbiertaBloque, type OportunidadAbierta } from './oportunidad-abierta';
import { FormularioActividad, LineaDeTiempo, type Actividad } from './actividad';

export const metadata: Metadata = { title: 'Ficha de cliente · CRM-123' };
export const dynamic = 'force-dynamic';

type Canal = Database['public']['Enums']['customer_source'];

/**
 * Ficha de cliente.  DESIGN_BRIEF §8.5.
 * Responde a «todo lo que sé de esta persona».
 *
 * Dos columnas —identidad y oportunidad a la izquierda, actividad a la
 * derecha— que reflotan a una sola en pantallas estrechas, con
 * `repeat(auto-fit, minmax(300px,1fr))`.
 *
 * Todo lo que se lee aquí pasa por RLS. Si el cliente no es de quien pregunta,
 * la consulta devuelve cero filas y la pantalla es un 404: para esa persona,
 * ese cliente no existe. No hace falta —ni conviene— comprobar el propietario
 * en el código (TECHNICAL_SPEC §5.2).
 */
export default async function PaginaFichaCliente({ params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const supabase = createClient();
  const esSupervisor = perfil.role === 'supervisor';

  const { data: cliente, error } = await supabase
    .from('customers')
    .select('id, phone, full_name, company, source, created_at, owner_id, is_archived')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded border border-filete bg-superficie">
        <ErrorPermisos />
      </div>
    );
  }
  if (!cliente) notFound();

  const [oportunidadesRes, actividadesRes, tableroRes, vendedoresRes, propietarioRes] =
    await Promise.all([
      supabase
        .from('opportunities')
        .select(
          'id, stage, status, estimated_amount, final_amount, loss_reason, closed_at, next_action_at',
        )
        .eq('customer_id', cliente.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('activities')
        .select('id, type, note, created_at, author_id, profiles(full_name)')
        .eq('customer_id', cliente.id)
        .order('created_at', { ascending: false })
        .limit(100),

      // El atraso NO se recalcula: se lee de la vista (CLAUDE.md #15).
      supabase
        .from('v_opportunity_board')
        .select('opportunity_id, is_overdue, days_without_activity, needs_attention')
        .eq('customer_id', cliente.id)
        .maybeSingle(),

      esSupervisor
        ? supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'seller')
            .eq('is_active', true)
            .order('full_name')
        : Promise.resolve({ data: [], error: null }),

      // El campo «Vendedor» solo lo ve el supervisor (§8.5).
      esSupervisor
        ? supabase.from('profiles').select('full_name').eq('id', cliente.owner_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const oportunidades = oportunidadesRes.data ?? [];
  const abierta = oportunidades.find((o) => o.status === 'open') ?? null;
  const cerradas = oportunidades.filter((o) => o.status !== 'open');

  const actividades: Actividad[] = (actividadesRes.data ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    note: a.note,
    created_at: a.created_at,
    autor:
      (a.profiles as { full_name: string } | null)?.full_name ??
      (a.author_id === perfil.id ? perfil.full_name : null),
  }));

  const oportunidadAbierta: OportunidadAbierta | null = abierta
    ? {
        id: abierta.id,
        stage: abierta.stage,
        estimated_amount: Number(abierta.estimated_amount),
        next_action_at: abierta.next_action_at,
        is_overdue: tableroRes.data?.is_overdue ?? false,
        days_without_activity: tableroRes.data?.days_without_activity ?? null,
        needs_attention: tableroRes.data?.needs_attention ?? false,
      }
    : null;

  // Un cliente archivado pasa a solo lectura entero (§8.5).
  const soloLectura = cliente.is_archived;

  return (
    <>
      {cliente.is_archived ? (
        <p
          role="status"
          className="mb-s4 rounded border border-neutro-300 bg-neutro-200 px-s3 py-s2
                     text-secundario text-neutro-900"
        >
          Este cliente está archivado.
        </p>
      ) : null}

      <div
        className="grid gap-[44px]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
      >
        {/* ═══ Columna izquierda · Identidad y oportunidad ═══ */}
        <div className="space-y-s4">
          <section aria-labelledby="t-identidad">
            <h1 id="t-identidad" className="font-titulo text-[27px] leading-tight">
              {cliente.full_name}
            </h1>
            {cliente.company ? (
              <p className="text-cuerpo text-neutro-700">{cliente.company}</p>
            ) : null}

            <dl className="mt-s3 space-y-s2">
              <div>
                <dt className="text-rotulo uppercase text-neutro-700">Teléfono</dt>
                <dd className="flex items-center gap-s2 text-cuerpo">
                  {fphone(cliente.phone)}
                  <CopiarTelefono telefono={cliente.phone} />
                </dd>
              </div>
              <div>
                <dt className="text-rotulo uppercase text-neutro-700">Canal</dt>
                <dd className="text-cuerpo">
                  {cliente.source ? CANAL[cliente.source as Canal] : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-rotulo uppercase text-neutro-700">Cliente desde</dt>
                <dd className="text-cuerpo">{fdate(cliente.created_at)}</dd>
              </div>
              {esSupervisor ? (
                <div>
                  <dt className="text-rotulo uppercase text-neutro-700">Vendedor</dt>
                  <dd className="text-cuerpo">{propietarioRes.data?.full_name ?? '—'}</dd>
                </div>
              ) : null}
            </dl>

            {!soloLectura ? (
              <div className="mt-s2">
                <BotonEditar
                  cliente={{
                    id: cliente.id,
                    full_name: cliente.full_name,
                    company: cliente.company,
                    source: cliente.source as Canal | null,
                  }}
                />
              </div>
            ) : null}
          </section>

          {oportunidadAbierta ? (
            <OportunidadAbiertaBloque
              oportunidad={oportunidadAbierta}
              soloLectura={soloLectura}
            />
          ) : soloLectura ? null : (
            <BotonNuevaOportunidad clienteId={cliente.id} />
          )}

          {/* --- Historial de ventas: el activo del negocio --- */}
          <section aria-labelledby="t-historial">
            <h2 id="t-historial" className="font-titulo text-h2menor">
              Historial de ventas
            </h2>
            {cerradas.length === 0 ? (
              <p className="mt-s2 text-cuerpo text-neutro-700">Sin ventas cerradas todavía.</p>
            ) : (
              <ul className="mt-s2 divide-y divide-filete rounded border border-filete bg-superficie">
                {cerradas.map((o) => (
                  <li key={o.id} className="flex items-baseline justify-between gap-s3 px-s3 py-s2">
                    <span className="text-secundario text-neutro-800">{fdate(o.closed_at)}</span>
                    <span
                      className={
                        o.status === 'won'
                          ? 'text-cuerpo font-semibold text-ganada'
                          : 'text-cuerpo text-neutro-800'
                      }
                    >
                      {ESTADO[o.status]}
                    </span>
                    <span className="text-cuerpo">
                      {o.status === 'won'
                        ? eur(Number(o.final_amount ?? 0))
                        : o.loss_reason
                          ? MOTIVO_PERDIDA[o.loss_reason]
                          : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {esSupervisor ? (
            <AccionesSupervisor
              clienteId={cliente.id}
              archivado={cliente.is_archived}
              vendedores={vendedoresRes.data ?? []}
            />
          ) : null}
        </div>

        {/* ═══ Columna derecha · Actividad ═══ */}
        <div className="space-y-s4">
          <h2 className="font-titulo text-h2menor">Actividad</h2>

          {/* Con el cliente archivado, el formulario DESAPARECE (§8.5). */}
          {!soloLectura && oportunidadAbierta ? (
            <FormularioActividad oportunidadId={oportunidadAbierta.id} />
          ) : null}

          <div className="rounded border border-filete bg-superficie p-s3">
            <LineaDeTiempo actividades={actividades} />
          </div>
        </div>
      </div>
    </>
  );
}
