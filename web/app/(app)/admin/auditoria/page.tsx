import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { fdmhm, ftime } from '@crm123/core/format';
import { ErrorEstado } from '@/components/estados';
import { TablaAuditoria } from './tabla-auditoria';

export const metadata: Metadata = { title: 'Auditoría · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Administración › Auditoría.  DESIGN_BRIEF §8.8.
 *
 * Dos bloques, los dos de solo lectura:
 *
 *  1. El registro de acciones (`audit_log`), con filtros y paginación.
 *  2. Las últimas ejecuciones del resumen matutino (`automation_runs`), que es
 *     lo que pide la prueba 18 de BUILD_PLAN §4.7 — «como supervisor en el
 *     escritorio, ver las ejecuciones registradas».
 *
 * La lista de usuarios se carga aquí, en el servidor, y se pasa a la tabla:
 * `audit_log` guarda `actor_id`, no el nombre, y no hay `join` que valga
 * porque la política de la tabla no permite anidar `profiles` desde una vista
 * con `security_invoker`. Resolver el nombre en el cliente con un mapa es más
 * barato que una consulta por fila.
 */
export default async function PaginaAuditoria() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const supabase = createClient();
  const [usuariosRes, ejecucionesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase
      .from('automation_runs')
      .select('id, status, trigger_type, emails_sent, started_at, finished_at, error_message')
      .eq('flow', 'morning_digest')
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  if (usuariosRes.error) {
    return (
      <div className="rounded border border-filete bg-superficie">
        <ErrorEstado />
      </div>
    );
  }

  return (
    <div className="space-y-s6">
      <section>
        <h2 className="sr-only">Registro de acciones</h2>
        <TablaAuditoria usuarios={usuariosRes.data ?? []} />
      </section>

      <section>
        <h2 className="font-titulo text-h2">Resumen matutino</h2>
        <p className="mt-s1 text-secundario text-neutro-800">
          Últimas diez ejecuciones. Se registran solas: las escribe la automatización, no una
          persona.
        </p>

        <div className="mt-s3 overflow-x-auto rounded border border-filete bg-superficie">
          <table className="w-full border-collapse text-tabla" style={{ minWidth: 660 }}>
            <thead>
              <tr className="border-b border-filete">
                {['Cuándo', 'Cómo se disparó', 'Estado', 'Correos', 'Detalle'].map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-s2 py-s1 text-left text-rotulo uppercase text-neutro-700"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ejecucionesRes.error ? (
                <tr>
                  <td colSpan={5}>
                    <ErrorEstado />
                  </td>
                </tr>
              ) : (ejecucionesRes.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-s3 py-s6 text-cuerpo text-neutro-700">
                    Todavía no se ha enviado ningún resumen.
                  </td>
                </tr>
              ) : (
                (ejecucionesRes.data ?? []).map((e, i) => (
                  <tr
                    key={e.id}
                    className={
                      i % 2 === 1
                        ? 'h-fila border-b border-filete bg-neutro-100 last:border-b-0'
                        : 'h-fila border-b border-filete last:border-b-0'
                    }
                  >
                    <td className="whitespace-nowrap px-s2 text-neutro-800">
                      {fdmhm(e.started_at)}
                    </td>
                    <td className="px-s2 text-neutro-800">
                      {e.trigger_type === 'manual' ? 'A mano' : 'Programado'}
                    </td>
                    <td className="px-s2">{ESTADO[e.status] ?? e.status}</td>
                    <td className="px-s2 text-right tabular-nums text-neutro-800">
                      {e.emails_sent ?? '—'}
                    </td>
                    <td className="max-w-[280px] truncate px-s2 text-nota text-neutro-700">
                      {e.error_message ??
                        (e.finished_at ? `Terminó a las ${ftime(e.finished_at)}` : '—')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const ESTADO: Record<string, string> = {
  running: 'En marcha',
  success: 'Enviado',
  failed: 'Falló',
};
