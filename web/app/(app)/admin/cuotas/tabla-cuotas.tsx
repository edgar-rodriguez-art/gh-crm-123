'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { eur } from '@crm123/core/format';
import { TEXTO } from '@crm123/core/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { aNumero } from '@/components/campos';
import { llamar } from '@/lib/api';
import { cn } from '@/lib/utils';

export type FilaCuota = {
  profile_id: string;
  full_name: string;
  amount_eur: number | null;
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Administración › Cuotas.  DESIGN_BRIEF §8.8.
 *
 * Aquí es donde se fijan las metas del mes. Una fila por vendedor, la meta
 * editable en línea, el total del equipo al pie.
 *
 * ── Cambiar de mes RECARGA de verdad ──────────────────────────────────
 * El selector no es decorativo: al cambiarlo se piden las metas de ese
 * periodo. Un selector que no recarga es peor que no tenerlo, porque enseña
 * las cifras de un mes bajo el rótulo de otro.
 *
 * Guardar hace `upsert` por `(profile_id, period_year, period_month)`, así que
 * pulsar dos veces actualiza la fila en vez de crear una segunda.
 */
export function TablaCuotas({
  anioInicial,
  mesInicial,
  filasIniciales,
}: {
  anioInicial: number;
  mesInicial: number;
  filasIniciales: FilaCuota[];
}) {
  const router = useRouter();
  const [anio, setAnio] = React.useState(anioInicial);
  const [mes, setMes] = React.useState(mesInicial);
  const [filas, setFilas] = React.useState<FilaCuota[]>(filasIniciales);
  const [valores, setValores] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      filasIniciales.map((f) => [f.profile_id, f.amount_eur ? String(f.amount_eur) : '']),
    ),
  );
  const [cargando, setCargando] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const cargarPeriodo = React.useCallback(async (a: number, m: number) => {
    setCargando(true);
    setError(null);
    setAviso(null);

    const r = await llamar<{ items: FilaCuota[] }>(`/api/admin/quotas?year=${a}&month=${m}`);

    if (!r.ok) {
      setError(r.message);
      setCargando(false);
      return;
    }
    setFilas(r.datos.items);
    setValores(
      Object.fromEntries(
        r.datos.items.map((f) => [f.profile_id, f.amount_eur ? String(f.amount_eur) : '']),
      ),
    );
    setCargando(false);
  }, []);

  function cambiarPeriodo(a: number, m: number) {
    setAnio(a);
    setMes(m);
    void cargarPeriodo(a, m);
  }

  /** Copia las metas del mes anterior. Acción de conveniencia (§8.8). */
  async function copiarMesAnterior() {
    const mAnterior = mes === 1 ? 12 : mes - 1;
    const aAnterior = mes === 1 ? anio - 1 : anio;

    setCargando(true);
    const r = await llamar<{ items: FilaCuota[] }>(
      `/api/admin/quotas?year=${aAnterior}&month=${mAnterior}`,
    );
    setCargando(false);

    if (!r.ok) {
      setError(r.message);
      return;
    }
    // Se rellenan los campos, pero NO se guarda: el supervisor revisa y pulsa.
    setValores((v) => {
      const copia = { ...v };
      for (const f of r.datos.items) {
        if (f.amount_eur) copia[f.profile_id] = String(f.amount_eur);
      }
      return copia;
    });
    setAviso(`Metas de ${MESES[mAnterior - 1]} copiadas. Revísalas y guarda.`);
  }

  async function guardar() {
    if (guardando) return;

    const cuotas = filas
      .map((f) => ({ profile_id: f.profile_id, amount_eur: aNumero(valores[f.profile_id] ?? '') }))
      .filter((q): q is { profile_id: string; amount_eur: number } => q.amount_eur !== null);

    if (cuotas.length === 0) {
      setError('No hay ninguna meta que guardar.');
      return;
    }

    setGuardando(true);
    setError(null);
    setAviso(null);

    const r = await llamar('/api/admin/quotas', {
      metodo: 'PUT',
      cuerpo: { period_year: anio, period_month: mes, quotas: cuotas },
    });

    setGuardando(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setAviso(`${cuotas.length} ${cuotas.length === 1 ? 'meta guardada' : 'metas guardadas'}.`);
    void cargarPeriodo(anio, mes);
    router.refresh();
  }

  const total = filas.reduce((s, f) => s + (aNumero(valores[f.profile_id] ?? '') ?? 0), 0);
  const anios = [anioInicial - 1, anioInicial, anioInicial + 1];

  return (
    <>
      <div className="mb-s3 flex flex-wrap items-end gap-s3">
        <div>
          <label htmlFor="c-mes" className="block text-secundario text-neutro-800">
            Mes
          </label>
          <select
            id="c-mes"
            className="mt-s1 h-[34px] rounded border border-neutro-400 bg-superficie px-s2 text-cuerpo"
            value={mes}
            onChange={(e) => cambiarPeriodo(anio, Number(e.target.value))}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="c-anio" className="block text-secundario text-neutro-800">
            Año
          </label>
          <select
            id="c-anio"
            className="mt-s1 h-[34px] rounded border border-neutro-400 bg-superficie px-s2 text-cuerpo"
            value={anio}
            onChange={(e) => cambiarPeriodo(Number(e.target.value), mes)}
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={copiarMesAnterior} disabled={cargando}>
          Copiar las metas del mes anterior
        </Button>
      </div>

      <div className="overflow-x-auto rounded border border-filete bg-superficie">
        <table className="w-full border-collapse text-tabla" style={{ minWidth: 520 }}>
          <thead>
            <tr className="border-b border-filete">
              <th scope="col" className="px-s2 py-s1 text-left text-rotulo uppercase text-neutro-700">
                Vendedor
              </th>
              <th scope="col" className="px-s2 py-s1 text-right text-rotulo uppercase text-neutro-700">
                Meta del mes
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={2} className="px-s3 py-s6 text-cuerpo text-neutro-700">
                  Cargando…
                </td>
              </tr>
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-s3 py-s6 text-cuerpo text-neutro-700">
                  Aún no hay vendedores activos a los que fijar metas.
                </td>
              </tr>
            ) : (
              filas.map((f, i) => (
                <tr
                  key={f.profile_id}
                  className={cn(
                    'h-fila border-b border-filete last:border-b-0',
                    i % 2 === 1 && 'bg-neutro-100',
                  )}
                >
                  <td className="px-s2">
                    <label htmlFor={`meta-${f.profile_id}`}>{f.full_name}</label>
                  </td>
                  <td className="px-s2">
                    <div className="flex justify-end">
                      <div className="flex w-[180px]">
                        <Input
                          id={`meta-${f.profile_id}`}
                          className="h-[34px] rounded-r-none text-right"
                          inputMode="decimal"
                          value={valores[f.profile_id] ?? ''}
                          onChange={(e) =>
                            setValores((v) => ({ ...v, [f.profile_id]: e.target.value }))
                          }
                        />
                        <span
                          aria-hidden="true"
                          className="flex h-[34px] items-center rounded-r border border-l-0
                                     border-neutro-400 bg-neutro-200 px-s2 text-cuerpo text-neutro-800"
                        >
                          €
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filas.length > 0 ? (
            <tfoot>
              <tr className="border-t border-filete">
                <th scope="row" className="px-s2 py-s2 text-left text-cuerpo font-semibold">
                  Total del equipo
                </th>
                <td className="px-s2 py-s2 text-right text-cuerpo font-semibold">{eur(total)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <p className="mt-s2 text-nota text-neutro-800">{TEXTO.importesSinIva}</p>

      {aviso ? (
        <p role="status" className="mt-s3 text-secundario text-ganada">
          {aviso}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}

      <div className="mt-s4">
        <Button onClick={guardar} disabled={guardando || cargando || filas.length === 0}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </>
  );
}
