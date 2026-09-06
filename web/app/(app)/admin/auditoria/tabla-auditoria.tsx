'use client';

import * as React from 'react';
import { fdate, ftime } from '@crm123/core/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Esqueleto, ErrorEstado, VacioTrasFiltrar } from '@/components/estados';
import { llamar } from '@/lib/api';
import { cn } from '@/lib/utils';

type Asiento = {
  id: string;
  created_at: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Las 14 acciones auditadas, en español.  TECHNICAL_SPEC §4 R12.
 * La lista es cerrada: la restricción `audit_log_action_allowed` rechaza
 * cualquier otra, así que aquí no puede aparecer nada fuera de este mapa.
 */
const ACCION: Record<string, string> = {
  'customer.created': 'Creó un cliente',
  'customer.updated': 'Editó un cliente',
  'customer.archived': 'Archivó un cliente',
  'customer.reassigned': 'Reasignó un cliente',
  'opportunity.created': 'Creó una oportunidad',
  'opportunity.stage_changed': 'Cambió la etapa',
  'opportunity.won': 'Marcó una venta como ganada',
  'opportunity.lost': 'Marcó una oportunidad como perdida',
  'user.created': 'Creó un usuario',
  'user.deactivated': 'Desactivó un usuario',
  'user.reactivated': 'Reactivó un usuario',
  'user.password_changed': 'Cambió una contraseña',
  'quota.changed': 'Cambió una meta',
  'automation.manual_trigger': 'Disparó el resumen matutino',
};

const ENTIDAD: Record<string, string> = {
  customer: 'Cliente',
  opportunity: 'Oportunidad',
  profile: 'Usuario',
  quota: 'Meta',
  automation: 'Automatización',
};

/**
 * Administración › Auditoría.  DESIGN_BRIEF §8.8.
 *
 * Tabla de SOLO LECTURA. Sin acciones por fila, sin botones de edición, y sin
 * botón de exportar en esta versión — los tres son deliberados: `audit_log` es
 * de inserción y no admite `update` ni `delete` para nadie, incluido el
 * supervisor (CLAUDE.md regla 3).
 */
export function TablaAuditoria({
  usuarios,
}: {
  usuarios: ReadonlyArray<{ id: string; full_name: string }>;
}) {
  const [entidad, setEntidad] = React.useState('');
  const [actor, setActor] = React.useState('');
  const [desde, setDesde] = React.useState('');
  const [hasta, setHasta] = React.useState('');
  const [pagina, setPagina] = React.useState(1);

  const [items, setItems] = React.useState<Asiento[]>([]);
  const [total, setTotal] = React.useState(0);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState(false);

  const hayFiltros = entidad !== '' || actor !== '' || desde !== '' || hasta !== '';

  const cargar = React.useCallback(async () => {
    setCargando(true);
    setError(false);

    const p = new URLSearchParams({ page: String(pagina) });
    if (entidad) p.set('entity_type', entidad);
    if (actor) p.set('actor_id', actor);
    if (desde) p.set('from', desde);
    if (hasta) p.set('to', hasta);

    const r = await llamar<{ items: Asiento[]; total: number }>(`/api/audit?${p}`);

    if (!r.ok) {
      setError(true);
      setCargando(false);
      return;
    }
    setItems(r.datos.items);
    setTotal(r.datos.total);
    setCargando(false);
  }, [entidad, actor, desde, hasta, pagina]);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  function quitarFiltros() {
    setEntidad('');
    setActor('');
    setDesde('');
    setHasta('');
    setPagina(1);
  }

  const nombrePorId = new Map(usuarios.map((u) => [u.id, u.full_name]));
  const paginas = Math.max(1, Math.ceil(total / 50));

  return (
    <>
      <div className="flex flex-wrap items-end gap-s3">
        <div>
          <label htmlFor="a-desde" className="block text-secundario text-neutro-800">
            Desde
          </label>
          <Input
            id="a-desde"
            type="date"
            className="mt-s1 h-[34px]"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <div>
          <label htmlFor="a-hasta" className="block text-secundario text-neutro-800">
            Hasta
          </label>
          <Input
            id="a-hasta"
            type="date"
            className="mt-s1 h-[34px]"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <div>
          <label htmlFor="a-entidad" className="block text-secundario text-neutro-800">
            Tipo
          </label>
          <select
            id="a-entidad"
            className="mt-s1 h-[34px] rounded border border-neutro-400 bg-superficie px-s2 text-cuerpo"
            value={entidad}
            onChange={(e) => {
              setEntidad(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(ENTIDAD).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="a-actor" className="block text-secundario text-neutro-800">
            Usuario
          </label>
          <select
            id="a-actor"
            className="mt-s1 h-[34px] rounded border border-neutro-400 bg-superficie px-s2 text-cuerpo"
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <p className="ml-auto text-secundario text-neutro-800" aria-live="polite">
          {total} {total === 1 ? 'asiento' : 'asientos'}
        </p>
      </div>

      <div className="mt-s3 overflow-x-auto rounded border border-filete bg-superficie">
        <table className="w-full border-collapse text-tabla" style={{ minWidth: 880 }}>
          <thead>
            <tr className="border-b border-filete">
              {['Fecha y hora', 'Quién', 'Qué hizo', 'Sobre qué', 'Detalle'].map((c) => (
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
            {cargando ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="h-fila border-b border-filete">
                  <td colSpan={5} className="px-s2">
                    <Esqueleto className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5}>
                  <ErrorEstado onReintentar={cargar} />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  {hayFiltros ? (
                    <VacioTrasFiltrar
                      filtrosPuestos="No hay asientos que coincidan con los filtros puestos."
                      onQuitarFiltros={quitarFiltros}
                    />
                  ) : (
                    <p className="px-s3 py-s6 text-cuerpo text-neutro-700">
                      Todavía no hay nada registrado.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              items.map((a, i) => (
                <tr
                  key={a.id}
                  className={cn(
                    'h-fila border-b border-filete last:border-b-0',
                    i % 2 === 1 && 'bg-neutro-100',
                  )}
                >
                  <td className="whitespace-nowrap px-s2 text-neutro-800">
                    {fdate(a.created_at)} {ftime(a.created_at)}
                  </td>
                  <td className="px-s2">
                    {a.actor_id ? (nombrePorId.get(a.actor_id) ?? '—') : '—'}
                  </td>
                  <td className="px-s2">{ACCION[a.action] ?? a.action}</td>
                  <td className="px-s2 text-neutro-800">
                    {ENTIDAD[a.entity_type] ?? a.entity_type}
                  </td>
                  <td className="max-w-[280px] truncate px-s2 text-nota text-neutro-700">
                    {describir(a.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 50 ? (
        <div className="mt-s3 flex items-center justify-between text-secundario text-neutro-800">
          <span>
            {(pagina - 1) * 50 + 1}–{Math.min(pagina * 50, total)} de {total}
          </span>
          <div className="flex gap-s2">
            <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * El detalle, en lenguaje llano.
 *
 * `metadata` nunca lleva el teléfono completo, ni el email, ni la contraseña
 * (TECHNICAL_SPEC §4 R12), así que enseñarlo entero es seguro. Aun así se
 * traduce en vez de volcar el JSON crudo: quien lee esta tabla no tiene por
 * qué entender un objeto.
 */
function describir(m: Record<string, unknown>): string {
  if (!m || Object.keys(m).length === 0) return '—';

  const partes: string[] = [];
  const eur = (v: unknown) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(v ?? 0));

  if (m.from_stage && m.to_stage) partes.push(`${m.from_stage} → ${m.to_stage}`);
  if (m.final_amount !== undefined) partes.push(`final ${eur(m.final_amount)}`);
  if (m.estimated_amount !== undefined && m.final_amount === undefined) {
    partes.push(`estimado ${eur(m.estimated_amount)}`);
  }
  if (m.loss_reason) partes.push(String(m.loss_reason));
  if (m.username) partes.push(String(m.username));
  if (m.role) partes.push(String(m.role));
  if (m.phone_last4) partes.push(`teléfono ···${m.phone_last4}`);
  if (m.source) partes.push(String(m.source));
  if (Array.isArray(m.changed_fields)) partes.push(m.changed_fields.join(', '));
  if (m.from_amount !== undefined || m.to_amount !== undefined) {
    partes.push(`${eur(m.from_amount)} → ${eur(m.to_amount)}`);
  }
  if (m.period_month && m.period_year) partes.push(`${m.period_month}/${m.period_year}`);
  if (m.first_login !== undefined) partes.push(m.first_login ? 'primer acceso' : 'restablecida');
  if (m.flow) partes.push(String(m.flow));

  return partes.length > 0 ? partes.join(' · ') : '—';
}
