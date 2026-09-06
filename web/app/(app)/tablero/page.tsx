import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { saludo, fdateLarga, eur, pct } from '@crm123/core/format';
import { TEXTO } from '@crm123/core/labels';
import { Button } from '@/components/ui/button';
import { VacioPrimeraVez, ErrorEstado } from '@/components/estados';
import { BarraProgreso } from '@/components/piezas';
import { FilasTablero, type FilaTablero } from './filas-tablero';
import { BotonNuevoCliente } from '@/components/boton-nuevo-cliente';

export const metadata: Metadata = { title: 'Tablero del día · CRM-123' };
export const dynamic = 'force-dynamic';

const MAXIMO_VISIBLES = 8; // Si hay más, se enseñan 8 y un enlace (§8.3).

/**
 * Tablero del día.  DESIGN_BRIEF §8.3.  Responde a «¿qué hago ahora?».
 *
 * Server Component: los tres bloques se sirven de una sola vez, sin cascada de
 * peticiones desde el navegador (TECHNICAL_SPEC §13).
 *
 * TODO el atraso viene de `v_opportunity_board` — `needs_attention`,
 * `is_overdue`, `is_stale`, `is_due_today`, `days_without_activity`. Aquí no
 * se recalcula nada: duplicar esa lógica en TypeScript sería una segunda
 * fuente de verdad que se desincronizaría (CLAUDE.md prohibición 15).
 *
 * Las consultas no llevan `where owner_id = ...`: RLS ya filtra por sesión.
 * Añadirlo daría la falsa impresión de que la seguridad vive aquí.
 */
export default async function PaginaTablero() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const supabase = createClient();

  const campos =
    'opportunity_id, customer_id, customer_name, customer_company, stage, ' +
    'estimated_amount, next_action_at, days_without_activity, is_overdue, ' +
    'is_stale, is_due_today, needs_attention';

  const [atrasadasRes, hoyRes, mesRes] = await Promise.all([
    // Orden del brief: primero las acciones vencidas, por antigüedad; después
    // las de más días sin actividad.
    supabase
      .from('v_opportunity_board')
      .select(campos, { count: 'exact' })
      .eq('needs_attention', true)
      .order('is_overdue', { ascending: false })
      .order('next_action_at', { ascending: true, nullsFirst: false })
      .order('days_without_activity', { ascending: false })
      .limit(MAXIMO_VISIBLES),

    supabase
      .from('v_opportunity_board')
      .select(campos)
      .eq('is_due_today', true)
      .eq('needs_attention', false)
      .order('next_action_at', { ascending: true }),

    supabase
      .from('v_seller_month_progress')
      .select('quota_amount, closed_amount, remaining_amount, quota_percent, closed_count')
      .eq('profile_id', perfil.id)
      .maybeSingle(),
  ]);

  const huboError = atrasadasRes.error || hoyRes.error || mesRes.error;

  const atrasadas = (atrasadasRes.data ?? []) as unknown as FilaTablero[];
  const totalAtrasadas = atrasadasRes.count ?? atrasadas.length;
  const hoy = (hoyRes.data ?? []) as unknown as FilaTablero[];
  const mes = mesRes.data;

  const nombreCorto = perfil.full_name.split(' ')[0] ?? perfil.full_name;

  // Sin cuota fijada, el avance es «—», NUNCA «0 %», y la barra no se dibuja
  // (regla R8 y DESIGN_BRIEF §8.3).
  const hayCuota = (mes?.quota_amount ?? 0) > 0;

  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-s3">
        <h1 className="font-titulo text-h1">
          {saludo()}, {nombreCorto}
        </h1>
        <div className="flex items-center gap-s3">
          <span className="text-secundario text-neutro-800">{fdateLarga()}</span>
          <BotonNuevoCliente />
        </div>
      </header>

      {huboError ? (
        <div className="mt-s6 rounded border border-filete bg-superficie">
          <ErrorEstado />
        </div>
      ) : (
        <div className="mt-s6 space-y-s6">
          {/* --- Bloque 1 · Atrasadas. El más prominente. --- */}
          <section aria-labelledby="t-atrasadas">
            <h2 id="t-atrasadas" className="font-titulo text-h2">
              Atrasadas <span className="text-neutro-700">({totalAtrasadas})</span>
            </h2>
            <div className="mt-s2 rounded border border-filete bg-superficie">
              {atrasadas.length === 0 ? (
                // Este vacío es una BUENA NOTICIA. Sereno, y sin ofrecer nada.
                <VacioPrimeraVez titulo="Nada atrasado. Todo tu embudo está al día." sereno />
              ) : (
                <FilasTablero filas={atrasadas} modo="atrasadas" />
              )}
            </div>
            {totalAtrasadas > MAXIMO_VISIBLES ? (
              <p className="mt-s2">
                <Button variant="link" size="sm" asChild>
                  <Link href="/oportunidades?atrasadas=1">
                    Ver las {totalAtrasadas} atrasadas
                  </Link>
                </Button>
              </p>
            ) : null}
          </section>

          {/* --- Bloque 2 · Para hoy --- */}
          <section aria-labelledby="t-hoy">
            <h2 id="t-hoy" className="font-titulo text-h2menor">
              Para hoy <span className="text-neutro-700">({hoy.length})</span>
            </h2>
            <div className="mt-s2 rounded border border-filete bg-superficie">
              {hoy.length === 0 ? (
                <VacioPrimeraVez titulo="No tienes acciones agendadas para hoy." sereno />
              ) : (
                <FilasTablero filas={hoy} modo="hoy" />
              )}
            </div>
          </section>

          {/* --- Bloque 3 · Mi mes --- */}
          <section aria-labelledby="t-mes">
            <h2 id="t-mes" className="font-titulo text-h2menor">
              Mi mes
            </h2>
            <div className="mt-s2 rounded border border-filete bg-superficie px-s4 py-s3">
              <dl className="flex flex-wrap gap-s8">
                {[
                  { rotulo: 'Cerrado', valor: eur(mes?.closed_amount ?? 0) },
                  { rotulo: 'Meta', valor: hayCuota ? eur(mes?.quota_amount ?? 0) : '—' },
                  { rotulo: 'Falta', valor: hayCuota ? eur(mes?.remaining_amount ?? 0) : '—' },
                  { rotulo: 'Avance', valor: hayCuota ? pct(mes?.quota_percent ?? 0) : pct(null) },
                ].map((c) => (
                  <div key={c.rotulo}>
                    <dt className="text-rotulo uppercase text-neutro-700">{c.rotulo}</dt>
                    <dd className="mt-0.5 font-titulo text-cifra">{c.valor}</dd>
                  </div>
                ))}
              </dl>

              {hayCuota ? (
                <div className="mt-s3">
                  <BarraProgreso
                    porcentaje={mes?.quota_percent ?? 0}
                    etiqueta="Avance de tu meta del mes"
                  />
                </div>
              ) : (
                <p className="mt-s3 text-nota text-neutro-800">
                  Tu supervisor aún no ha fijado tu meta de este mes.
                </p>
              )}

              <p className="mt-s3 text-nota text-neutro-800">
                {mes?.closed_count ?? 0} oportunidades ganadas este mes.
              </p>
              <p className="mt-s1 text-nota text-neutro-800">{TEXTO.importesSinIva}</p>
            </div>
          </section>
        </div>
      )}

      <p className="mt-s6">
        <Button variant="link" size="sm" asChild>
          <Link href="/oportunidades">Ver todas mis oportunidades</Link>
        </Button>
      </p>
    </>
  );
}
