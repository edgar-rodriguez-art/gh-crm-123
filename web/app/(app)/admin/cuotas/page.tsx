import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { ErrorEstado } from '@/components/estados';
import { TablaCuotas, type FilaCuota } from './tabla-cuotas';

export const metadata: Metadata = { title: 'Cuotas · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Administración › Cuotas.  DESIGN_BRIEF §8.8.
 *
 * Arranca en el mes en curso EN HORARIO DE MADRID, no en el del servidor:
 * el 1 de septiembre a las 00:30 de Madrid, un servidor en UTC todavía cree
 * que es agosto y enseñaría el mes equivocado.
 */
export default async function PaginaCuotas() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const ahora = new Date();
  const anio = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric' }).format(ahora),
  );
  const mes = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', month: 'numeric' }).format(ahora),
  );

  const supabase = createClient();
  const [vendedoresRes, cuotasRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'seller')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('quotas')
      .select('profile_id, amount_eur')
      .eq('period_year', anio)
      .eq('period_month', mes),
  ]);

  if (vendedoresRes.error || cuotasRes.error) {
    return (
      <div className="rounded border border-filete bg-superficie">
        <ErrorEstado />
      </div>
    );
  }

  const porPerfil = new Map(
    (cuotasRes.data ?? []).map((c) => [c.profile_id, Number(c.amount_eur)]),
  );

  const filas: FilaCuota[] = (vendedoresRes.data ?? []).map((v) => ({
    profile_id: v.id,
    full_name: v.full_name,
    amount_eur: porPerfil.get(v.id) ?? null,
  }));

  return <TablaCuotas anioInicial={anio} mesInicial={mes} filasIniciales={filas} />;
}
