import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { createClient } from '@crm123/core/supabase/server';
import { CANAL } from '@crm123/core/labels';
import { fdate, fphone } from '@crm123/core/format';
import { ErrorEstado, VacioPrimeraVez } from '@/components/estados';
import { BotonNuevoCliente } from '@/components/boton-nuevo-cliente';

export const metadata: Metadata = { title: 'Clientes · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Listado de clientes.
 *
 * Los archivados no salen: «El cliente dejará de aparecer en las listas»
 * (DESIGN_BRIEF §8.6). Su historial se conserva y el supervisor los recupera
 * desde la ficha, a la que se sigue pudiendo entrar por enlace directo.
 *
 * Sin `where owner_id`: RLS ya decide qué cartera devuelve esta consulta.
 */
export default async function PaginaClientes() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const { data, error } = await createClient()
    .from('customers')
    .select('id, full_name, company, phone, source, created_at')
    .eq('is_archived', false)
    .order('full_name');

  const clientes = data ?? [];

  return (
    <>
      <header className="mb-s4 flex flex-wrap items-baseline justify-between gap-s3">
        <h1 className="font-titulo text-h1">Clientes</h1>
        <div className="flex items-center gap-s3">
          <span className="text-secundario text-neutro-800">
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
          </span>
          <BotonNuevoCliente />
        </div>
      </header>

      <div className="overflow-x-auto rounded border border-filete bg-superficie">
        {error ? (
          <ErrorEstado />
        ) : clientes.length === 0 ? (
          <VacioPrimeraVez
            titulo="Aún no tienes clientes"
            explicacion="Registra tu primer cliente para empezar a trabajar."
            accion={<BotonNuevoCliente />}
          />
        ) : (
          <table className="w-full border-collapse text-tabla" style={{ minWidth: 720 }}>
            <thead className="sticky top-0 bg-superficie">
              <tr className="border-b border-filete">
                {['Cliente', 'Teléfono', 'Canal', 'Cliente desde'].map((c) => (
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
              {clientes.map((c, i) => (
                <tr
                  key={c.id}
                  className={`h-fila border-b border-filete last:border-b-0 hover:bg-marca-100 ${
                    i % 2 === 1 ? 'bg-neutro-100' : ''
                  }`}
                >
                  <td className="max-w-[280px] px-s2">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="block truncate font-semibold text-tinta hover:underline
                                 focus-visible:outline focus-visible:outline-2
                                 focus-visible:-outline-offset-2 focus-visible:outline-marca"
                    >
                      {c.full_name}
                    </Link>
                    {c.company ? (
                      <span className="block truncate text-nota text-neutro-700">{c.company}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-s2">{fphone(c.phone)}</td>
                  <td className="px-s2 text-neutro-700">{c.source ? CANAL[c.source] : '—'}</td>
                  <td className="whitespace-nowrap px-s2 text-neutro-800">{fdate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
