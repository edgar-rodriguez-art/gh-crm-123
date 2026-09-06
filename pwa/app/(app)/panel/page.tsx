import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { eur, fdateLarga, pct } from '@crm123/core/format';
import { BarraProgreso } from '@/components/piezas';
import { EnvioResumen } from '@/components/envio-resumen';
import { CerrarSesion } from '@/components/cerrar-sesion';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'El equipo hoy · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Panel del supervisor.  DESIGN_BRIEF §10.1.
 * Responde a «¿cómo va el equipo, en diez segundos?».
 *
 * Seis piezas en una sola columna: cabecera, tarjeta del equipo, tarjeta de
 * alerta (solo si hay atrasos), semáforo, botón de envío y línea del último
 * envío.
 *
 * Las cifras salen de las MISMAS vistas que el escritorio, no de un cálculo
 * paralelo: si el móvil y el ordenador dieran números distintos, nadie
 * volvería a fiarse de ninguno de los dos.
 */
export default async function PaginaPanel() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const supabase = createClient();

  const [equipoRes, vendedoresRes, ejecucionRes, ajusteRes] = await Promise.all([
    supabase
      .from('v_team_month_progress')
      .select('team_quota, team_closed, team_needs_attention, team_quota_percent')
      .maybeSingle(),
    supabase
      .from('v_seller_month_progress')
      .select('profile_id, full_name, quota_amount, closed_amount, quota_percent, needs_attention_count')
      .order('quota_percent', { ascending: true, nullsFirst: true }),
    supabase
      .from('automation_runs')
      .select('id, status, emails_sent, started_at, finished_at')
      .eq('flow', 'morning_digest')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'morning_digest').maybeSingle(),
  ]);

  const equipo = equipoRes.data;
  const vendedores = vendedoresRes.data ?? [];

  const cuotaEquipo = Number(equipo?.team_quota ?? 0);
  const hayCuota = cuotaEquipo > 0;
  const atrasadas = Number(equipo?.team_needs_attention ?? 0);
  const conAtrasos = vendedores.filter((v) => Number(v.needs_attention_count ?? 0) > 0).length;

  const enfriamiento =
    Number(
      (ajusteRes.data?.value as { manual_cooldown_minutes?: number } | null)
        ?.manual_cooldown_minutes,
    ) || 10;

  return (
    <>
      {/* 1 · Cabecera */}
      <header>
        <h1 className="font-titulo text-h2">El equipo hoy</h1>
        <p className="mt-s1 text-secundario text-neutro-800">{fdateLarga()}</p>
      </header>

      {/* 2 · Tarjeta del equipo */}
      <section
        aria-label="Avance del equipo este mes"
        className="mt-s4 rounded border border-filete bg-superficie px-s4 py-s3"
      >
        {hayCuota ? (
          <>
            <p className="font-titulo text-h1">{pct(Number(equipo?.team_quota_percent ?? 0))}</p>
            <div className="mt-s2">
              <BarraProgreso
                porcentaje={Number(equipo?.team_quota_percent ?? 0)}
                etiqueta="Avance del equipo este mes"
              />
            </div>
            <p className="mt-s2 text-secundario text-neutro-800">
              Cerrado {eur(Number(equipo?.team_closed ?? 0), false)} · Meta{' '}
              {eur(cuotaEquipo, false)}
            </p>
          </>
        ) : (
          <>
            <p className="font-titulo text-h1">{pct(null)}</p>
            <p className="mt-s2 text-secundario text-neutro-800">
              Cerrado {eur(Number(equipo?.team_closed ?? 0), false)} · Sin meta fijada
            </p>
          </>
        )}
      </section>

      {/* 3 · Tarjeta de alerta. Solo aparece si hay atrasos. */}
      {atrasadas > 0 ? (
        <section
          aria-label="Oportunidades atrasadas"
          className="mt-s3 rounded border border-atraso bg-atraso-100 px-s4 py-s3"
        >
          <p className="text-cuerpo text-atraso-800">
            <strong className="font-semibold">
              {atrasadas} {atrasadas === 1 ? 'oportunidad atrasada' : 'oportunidades atrasadas'}
            </strong>{' '}
            en {conAtrasos} {conAtrasos === 1 ? 'vendedor' : 'vendedores'}.
          </p>
        </section>
      ) : null}

      {/* 4 · Semáforo del equipo */}
      <section id="semaforo" className="mt-s6 scroll-mt-s4" aria-labelledby="t-semaforo">
        <h2 id="t-semaforo" className="font-titulo text-h2menor">
          Semáforo del equipo
        </h2>

        {vendedores.length === 0 ? (
          <div className="mt-s2 rounded border border-filete bg-superficie px-s4 py-s6">
            <p className="text-cuerpo text-tinta">
              Aún no has fijado las metas del mes. Hazlo desde el escritorio.
            </p>
          </div>
        ) : (
          <ul className="mt-s2 divide-y divide-filete rounded border border-filete bg-superficie">
            {vendedores.map((v) => {
              const suyas = Number(v.needs_attention_count ?? 0);
              const conMeta = Number(v.quota_amount ?? 0) > 0;
              return (
                <li key={v.profile_id}>
                  <Link
                    href={`/vendedor/${v.profile_id}`}
                    className="flex items-center gap-s3 px-s3 py-s3
                               focus-visible:outline focus-visible:outline-2
                               focus-visible:-outline-offset-2 focus-visible:outline-marca"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-cuerpo text-tinta">{v.full_name}</span>
                      <span className="mt-s1 flex items-center gap-s2">
                        {conMeta ? (
                          <>
                            <BarraProgreso
                              porcentaje={Number(v.quota_percent ?? 0)}
                              etiqueta={`Avance de ${v.full_name}`}
                              className="w-24"
                            />
                            <span className="text-secundario text-neutro-800">
                              {pct(Number(v.quota_percent ?? 0))}
                            </span>
                          </>
                        ) : (
                          // Sin meta fijada la barra NO se dibuja (regla R8).
                          <span className="text-secundario text-neutro-700">Sin meta</span>
                        )}
                      </span>
                    </span>

                    <span
                      className={cn(
                        'shrink-0 text-right text-secundario',
                        suyas > 0 ? 'font-semibold text-atraso-800' : 'text-neutro-700',
                      )}
                    >
                      {suyas}
                      <span className="sr-only"> atrasadas</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-s2 text-nota text-neutro-800">
          Ordenados por avance, de menor a mayor: quien necesita ayuda va arriba.
        </p>
      </section>

      <div className="mt-s6 border-t border-filete pt-s4">
        <p className="text-secundario text-tinta">{perfil.full_name}</p>
        <p className="text-nota text-neutro-800">Supervisor</p>
        <div className="mt-s2">
          <CerrarSesion />
        </div>
      </div>

      {/*
        Hueco para el bloque fijo del pie: sin esto, el botón taparía el final
        de la página y no habría forma de llegar a «Cerrar sesión».
      */}
      <div aria-hidden="true" className="h-[132px]" />

      {/* 5 y 6 · Botón de envío y línea del último envío */}
      <EnvioResumen
        ultima={ejecucionRes.data ?? null}
        minutosEnfriamiento={enfriamiento}
        hayVendedores={vendedores.length > 0}
      />
    </>
  );
}
