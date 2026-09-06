import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { ETAPA } from '@crm123/core/labels';
import { eur, fdias, fdm, pct } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { BarraProgreso } from '@/components/piezas';

export const metadata: Metadata = { title: 'Vendedor · CRM-123' };
export const dynamic = 'force-dynamic';

type Etapa = Database['public']['Enums']['opportunity_stage'];

/**
 * Detalle de vendedor.  DESIGN_BRIEF §10.2.
 * Se abre al pulsar una fila del semáforo.
 *
 * ── SOLO LECTURA ──────────────────────────────────────────────────────
 * No hay ni un botón de escritura en esta pantalla, y no es un descuido:
 * la gestión —reasignar, archivar, editar, registrar actividad— vive solo en
 * el escritorio (DESIGN_BRIEF §14.13). El supervisor mira desde el móvil y
 * actúa desde el ordenador.
 *
 * Si el identificador no corresponde a un vendedor activo, la vista no
 * devuelve fila y esto es un 404. No hace falta comprobar el rol aquí: el
 * `layout` ya rechaza a quien no sea supervisor y RLS hace el resto.
 */
export default async function PaginaVendedor({ params }: { params: { id: string } }) {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const supabase = createClient();

  const [vendedorRes, atrasadasRes] = await Promise.all([
    supabase
      .from('v_seller_month_progress')
      .select(
        'profile_id, full_name, quota_amount, closed_amount, closed_count, remaining_amount, quota_percent, needs_attention_count',
      )
      .eq('profile_id', params.id)
      .maybeSingle(),
    supabase
      .from('v_opportunity_board')
      .select(
        'opportunity_id, customer_name, customer_company, stage, days_without_activity, is_overdue, next_action_at',
      )
      .eq('owner_id', params.id)
      .eq('needs_attention', true)
      .order('days_without_activity', { ascending: false })
      .limit(10),
  ]);

  const v = vendedorRes.data;
  if (!v) notFound();

  const atrasadas = atrasadasRes.data ?? [];
  const total = Number(v.needs_attention_count ?? 0);
  const hayCuota = Number(v.quota_amount ?? 0) > 0;

  return (
    <>
      <p>
        <Link
          href="/panel#semaforo"
          className="text-secundario text-marca-800 focus-visible:outline
                     focus-visible:outline-2 focus-visible:-outline-offset-2
                     focus-visible:outline-marca"
        >
          ← El equipo hoy
        </Link>
      </p>

      <header className="mt-s2">
        <h1 className="font-titulo text-h2">{v.full_name}</h1>
      </header>

      {/* --- Avance del mes: las cuatro cifras --- */}
      <section
        aria-label="Avance del mes"
        className="mt-s4 rounded border border-filete bg-superficie px-s4 py-s3"
      >
        {hayCuota ? (
          <>
            <p className="font-titulo text-h1">{pct(Number(v.quota_percent ?? 0))}</p>
            <div className="mt-s2">
              <BarraProgreso
                porcentaje={Number(v.quota_percent ?? 0)}
                etiqueta={`Avance de ${v.full_name}`}
              />
            </div>
          </>
        ) : (
          // Sin meta fijada no se dibuja barra ni porcentaje (regla R8).
          <p className="font-titulo text-h1">{pct(null)}</p>
        )}

        <dl className="mt-s3 grid grid-cols-2 gap-s3">
          {[
            { rotulo: 'Cerrado', valor: eur(Number(v.closed_amount ?? 0), false) },
            { rotulo: 'Meta', valor: hayCuota ? eur(Number(v.quota_amount ?? 0), false) : '—' },
            { rotulo: 'Ganadas', valor: String(Number(v.closed_count ?? 0)) },
            {
              rotulo: 'Restante',
              valor: hayCuota ? eur(Number(v.remaining_amount ?? 0), false) : '—',
            },
          ].map((c) => (
            <div key={c.rotulo}>
              <dt className="text-rotulo uppercase text-neutro-700">{c.rotulo}</dt>
              <dd className="mt-0.5 font-titulo text-cifra">{c.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --- Atrasadas --- */}
      <section aria-labelledby="t-atrasadas" className="mt-s6">
        <h2 id="t-atrasadas" className="font-titulo text-h2menor">
          {total} {total === 1 ? 'oportunidad atrasada' : 'oportunidades atrasadas'}
        </h2>

        {atrasadas.length === 0 ? (
          <div className="mt-s2 rounded border border-filete bg-superficie px-s4 py-s6">
            <p className="text-cuerpo text-tinta">Nada atrasado. Todo al día.</p>
          </div>
        ) : (
          <ul className="mt-s2 divide-y divide-filete rounded border border-filete bg-superficie">
            {atrasadas.map((o) => (
              <li key={o.opportunity_id} className="px-s3 py-s3">
                <p className="truncate text-cuerpo text-tinta">
                  {o.customer_name}
                  {o.customer_company ? (
                    <span className="text-neutro-800"> · {o.customer_company}</span>
                  ) : null}
                </p>
                <p className="mt-s1 flex flex-wrap items-center gap-x-s2 gap-y-s1">
                  <span className="rounded bg-neutro-200 px-s1 py-0.5 text-nota font-semibold text-neutro-900">
                    {ETAPA[o.stage as Etapa]}
                  </span>
                  {/*
                    El motivo del atraso NUNCA va solo con color: el punto
                    magenta siempre lleva al lado el texto que lo explica
                    (DESIGN_BRIEF §12).
                  */}
                  <span className="inline-flex items-center gap-s1 text-secundario font-semibold text-atraso-700">
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-atraso" />
                    {o.is_overdue
                      ? `Acción vencida el ${fdm(o.next_action_at)}`
                      : `${fdias(o.days_without_activity)} sin actividad`}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}

        {total > atrasadas.length ? (
          <p className="mt-s2 text-nota text-neutro-800">
            Se enseñan las {atrasadas.length} más antiguas. El resto, en el escritorio.
          </p>
        ) : null}
      </section>
    </>
  );
}
