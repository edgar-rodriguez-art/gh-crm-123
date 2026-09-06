import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { MOTIVO_PERDIDA, TEXTO } from '@crm123/core/labels';
import { eur, pct } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { BarraProgreso } from '@/components/piezas';
import { ErrorEstado } from '@/components/estados';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Equipo · CRM-123' };
export const dynamic = 'force-dynamic';

type Motivo = Database['public']['Enums']['loss_reason'];

/**
 * Panel del equipo.  DESIGN_BRIEF §8.7.  Solo supervisor (lo impone el
 * middleware, que lee el rol de `profiles`).
 * Responde a «¿cómo va el equipo?».
 *
 * Todas las cifras salen de las tres vistas del mes. Aquí no se suma ni se
 * calcula nada: si el total del equipo no cuadrara con la suma de los
 * vendedores, lo diría la vista, no sería un error de esta pantalla.
 *
 * Los vendedores desactivados no aparecen ni suman: `v_seller_month_progress`
 * ya los excluye.
 */
export default async function PaginaEquipo() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const supabase = createClient();

  const [equipoRes, vendedoresRes, motivosRes] = await Promise.all([
    supabase
      .from('v_team_month_progress')
      .select(
        'sellers_count, team_quota, team_closed, team_closed_count, team_needs_attention, team_quota_percent',
      )
      .maybeSingle(),
    supabase
      .from('v_seller_month_progress')
      .select(
        'profile_id, full_name, quota_amount, closed_amount, closed_count, quota_percent, needs_attention_count',
      )
      .order('quota_percent', { ascending: true, nullsFirst: true }),
    supabase
      .from('v_loss_reasons_month')
      .select('loss_reason, lost_count, lost_estimated_amount')
      .order('lost_count', { ascending: false }),
  ]);

  if (equipoRes.error || vendedoresRes.error || motivosRes.error) {
    return (
      <>
        <h1 className="font-titulo text-h1">Equipo</h1>
        <div className="mt-s4 rounded border border-filete bg-superficie">
          <ErrorEstado />
        </div>
      </>
    );
  }

  const equipo = equipoRes.data;
  const vendedores = vendedoresRes.data ?? [];
  const motivos = motivosRes.data ?? [];

  const hayCuotaEquipo = Number(equipo?.team_quota ?? 0) > 0;

  return (
    <>
      <header className="mb-s4">
        <h1 className="font-titulo text-h1">Equipo</h1>
      </header>

      {/* --- Franja superior: el equipo este mes --- */}
      <section
        aria-label="El equipo este mes"
        className="rounded border border-filete bg-superficie px-s4 py-s3"
      >
        <dl className="flex flex-wrap gap-s8">
          {[
            { rotulo: 'Cerrado', valor: eur(Number(equipo?.team_closed ?? 0)) },
            { rotulo: 'Meta', valor: hayCuotaEquipo ? eur(Number(equipo?.team_quota ?? 0)) : '—' },
            {
              rotulo: 'Avance',
              valor: hayCuotaEquipo ? pct(Number(equipo?.team_quota_percent ?? 0)) : pct(null),
            },
            { rotulo: 'Atrasadas', valor: String(Number(equipo?.team_needs_attention ?? 0)) },
          ].map((c) => (
            <div key={c.rotulo}>
              <dt className="text-rotulo uppercase text-neutro-700">{c.rotulo}</dt>
              <dd className="mt-0.5 font-titulo text-cifra">{c.valor}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-s3 text-nota text-neutro-800">{TEXTO.importesSinIva}</p>
      </section>

      {/* --- Tabla de vendedores --- */}
      <section aria-labelledby="t-vendedores" className="mt-s6">
        <h2 id="t-vendedores" className="font-titulo text-h2menor">
          Vendedores
        </h2>

        <div className="mt-s2 overflow-x-auto rounded border border-filete bg-superficie">
          <table className="w-full border-collapse text-tabla" style={{ minWidth: 820 }}>
            <thead>
              <tr className="border-b border-filete">
                {['Vendedor', 'Cerrado', 'Meta', 'Avance', 'Ganadas', 'Atrasadas'].map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={cn(
                      'px-s2 py-s1 text-rotulo uppercase text-neutro-700',
                      i === 0 || c === 'Avance' ? 'text-left' : 'text-right',
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendedores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-s3 py-s6 text-cuerpo text-neutro-700">
                    Aún no hay vendedores activos.
                  </td>
                </tr>
              ) : (
                vendedores.map((v, i) => {
                  const hayCuota = Number(v.quota_amount ?? 0) > 0;
                  const atrasadas = Number(v.needs_attention_count ?? 0);
                  return (
                    <tr
                      key={v.profile_id}
                      className={cn(
                        'h-fila border-b border-filete last:border-b-0 hover:bg-marca-100',
                        i % 2 === 1 && 'bg-neutro-100',
                      )}
                    >
                      <td className="px-s2">
                        {/* Pulsar lleva a la tabla filtrada por ese vendedor (§8.7). */}
                        <Link
                          href={`/oportunidades?vendedor=${v.profile_id}`}
                          className="font-semibold text-tinta hover:underline
                                     focus-visible:outline focus-visible:outline-2
                                     focus-visible:-outline-offset-2 focus-visible:outline-marca"
                        >
                          {v.full_name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-s2 text-right">
                        {eur(Number(v.closed_amount ?? 0), false)}
                      </td>
                      <td className="whitespace-nowrap px-s2 text-right">
                        {hayCuota ? eur(Number(v.quota_amount ?? 0), false) : '—'}
                      </td>
                      <td className="px-s2">
                        {hayCuota ? (
                          <div className="flex items-center gap-s2">
                            <div className="w-24">
                              <BarraProgreso
                                porcentaje={Number(v.quota_percent ?? 0)}
                                etiqueta={`Avance de ${v.full_name}`}
                              />
                            </div>
                            <span className="whitespace-nowrap">
                              {pct(Number(v.quota_percent ?? 0))}
                            </span>
                          </div>
                        ) : (
                          // Sin cuota fijada la barra NO se dibuja (regla R8).
                          <span className="text-neutro-700">{pct(null)}</span>
                        )}
                      </td>
                      <td className="px-s2 text-right">{Number(v.closed_count ?? 0)}</td>
                      <td
                        className={cn(
                          'px-s2 text-right',
                          // Destaca cuando es alta. Siempre lleva el número:
                          // nada se transmite solo por color.
                          atrasadas >= 5 ? 'font-semibold text-atraso-700' : 'text-neutro-800',
                        )}
                      >
                        {atrasadas}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-s2 text-nota text-neutro-800">
          Ordenados por avance, de menor a mayor: quien necesita ayuda va arriba.
        </p>
      </section>

      {/* --- Motivos de pérdida del mes. Lista simple, sin gráfico circular. --- */}
      <section aria-labelledby="t-motivos" className="mt-s6">
        <h2 id="t-motivos" className="font-titulo text-h2menor">
          Motivos de pérdida del mes
        </h2>
        <div className="mt-s2 rounded border border-filete bg-superficie">
          {motivos.length === 0 ? (
            <p className="px-s3 py-s6 text-cuerpo text-neutro-700">
              Ninguna oportunidad perdida este mes.
            </p>
          ) : (
            <ul className="divide-y divide-filete">
              {motivos.map((m) => (
                <li
                  key={m.loss_reason ?? 'sin-motivo'}
                  className="flex items-baseline justify-between gap-s3 px-s3 py-s2"
                >
                  <span className="text-cuerpo">
                    {m.loss_reason ? MOTIVO_PERDIDA[m.loss_reason as Motivo] : '—'}
                  </span>
                  <span className="text-secundario text-neutro-800">
                    {Number(m.lost_count ?? 0)}{' '}
                    {Number(m.lost_count ?? 0) === 1 ? 'caso' : 'casos'}
                  </span>
                  <span className="text-cuerpo">
                    {eur(Number(m.lost_estimated_amount ?? 0), false)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
