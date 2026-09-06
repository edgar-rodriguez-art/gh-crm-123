import { z } from 'zod';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { auditar } from '@crm123/core/audit';
import { jsonError, jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/quotas?year=&month=
 *
 * Las metas de un periodo, con TODOS los vendedores activos aunque no tengan
 * meta fijada: la tabla tiene que enseñar la fila vacía para poder rellenarla.
 * Es lo que hace que el selector de mes recargue de verdad.
 */
export async function GET(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year'));
  const month = Number(url.searchParams.get('month'));

  if (!Number.isInteger(year) || year < 2024 || year > 2100) {
    return jsonError(400, 'bad_request', 'No hemos podido procesar la petición.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return jsonError(400, 'bad_request', 'No hemos podido procesar la petición.');
  }

  try {
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
        .eq('period_year', year)
        .eq('period_month', month),
    ]);

    if (vendedoresRes.error || cuotasRes.error) {
      registrarFallo('GET /api/admin/quotas', vendedoresRes.error ?? cuotasRes.error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    const porPerfil = new Map(
      (cuotasRes.data ?? []).map((c) => [c.profile_id, Number(c.amount_eur)]),
    );

    return jsonOk({
      period_year: year,
      period_month: month,
      items: (vendedoresRes.data ?? []).map((v) => ({
        profile_id: v.id,
        full_name: v.full_name,
        amount_eur: porPerfil.get(v.id) ?? null,
      })),
    });
  } catch (e) {
    registrarFallo('GET /api/admin/quotas', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}

/**
 * PUT /api/admin/quotas   ·   TECHNICAL_SPEC §7.6 y R8
 *
 * Fija la meta de varios vendedores para un mes, de una vez.
 *
 * Es un `upsert` por `(profile_id, period_year, period_month)`, que es el
 * índice `quotas_profile_period_uk`: guardar dos veces el mismo mes actualiza
 * la fila, no crea una segunda. Sin eso, un doble clic dejaría dos metas para
 * el mismo periodo y las vistas sumarían las dos.
 *
 * Cada meta modificada deja SU PROPIO asiento `quota.changed` con el valor
 * anterior y el nuevo: una tabla que se guarda entera no puede auditarse en
 * bloque, porque nadie sabría cuál cambió.
 */
const esquema = z.object({
  period_year: z.number().int().min(2024).max(2100),
  period_month: z.number().int().min(1).max(12),
  quotas: z
    .array(
      z.object({
        profile_id: z.string().uuid(),
        amount_eur: z.number().nonnegative().finite(),
      }),
    )
    .min(1)
    .max(50),
});

export async function PUT(request: Request) {
  const perfil = await perfilActual();
  if (!perfil) return jsonError(401, 'unauthorized');
  if (perfil.role !== 'supervisor') {
    return jsonError(403, 'forbidden', 'No tienes permiso para esta acción.');
  }

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(await request.json());
  } catch {
    return jsonError(400, 'bad_request', 'No hemos podido procesar la petición.');
  }

  try {
    const supabase = createClient();

    // Los valores anteriores, para poder auditar el cambio de cada uno.
    const { data: previas } = await supabase
      .from('quotas')
      .select('profile_id, amount_eur')
      .eq('period_year', datos.period_year)
      .eq('period_month', datos.period_month)
      .in('profile_id', datos.quotas.map((q) => q.profile_id));

    const anterior = new Map((previas ?? []).map((p) => [p.profile_id, Number(p.amount_eur)]));

    const { error } = await supabase.from('quotas').upsert(
      datos.quotas.map((q) => ({
        profile_id: q.profile_id,
        period_year: datos.period_year,
        period_month: datos.period_month,
        amount_eur: q.amount_eur,
      })),
      { onConflict: 'profile_id,period_year,period_month' },
    );

    if (error) {
      registrarFallo('PUT /api/admin/quotas', error);
      return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
    }

    for (const q of datos.quotas) {
      const antes = anterior.get(q.profile_id) ?? null;
      if (antes === q.amount_eur) continue; // Sin cambio, sin asiento.
      await auditar({
        action: 'quota.changed',
        entityType: 'quota',
        entityId: q.profile_id,
        metadata: {
          period_year: datos.period_year,
          period_month: datos.period_month,
          from_amount: antes,
          to_amount: q.amount_eur,
        },
      });
    }

    return jsonOk({ guardadas: datos.quotas.length });
  } catch (e) {
    registrarFallo('PUT /api/admin/quotas', e);
    return jsonError(500, 'internal_error', 'Algo ha fallado. Vuelve a intentarlo.');
  }
}
