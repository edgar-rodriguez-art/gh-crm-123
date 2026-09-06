'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CANAL, ETAPA } from '@crm123/core/labels';
import { eur, fdmhm, fphone, frel } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EtiquetaEtapa, PuntoAtraso } from '@/components/piezas';
import { Esqueleto, ErrorEstado, VacioPrimeraVez, VacioTrasFiltrar } from '@/components/estados';
import { ModalActividad, ModalGanada, ModalPerdida } from '@/components/modales-oportunidad';
import { llamar } from '@/lib/api';
import { cn } from '@/lib/utils';

type Etapa = Database['public']['Enums']['opportunity_stage'];

type Fila = {
  opportunity_id: string;
  customer_id: string;
  customer_name: string;
  customer_company: string | null;
  customer_phone: string;
  customer_source: Database['public']['Enums']['customer_source'] | null;
  stage: Etapa;
  status: 'open' | 'won' | 'lost';
  estimated_amount: number;
  last_activity_at: string | null;
  next_action_at: string | null;
  days_without_activity: number | null;
  is_overdue: boolean;
  needs_attention: boolean;
  owner_id: string;
};

const ETAPAS_FILTRO: Etapa[] = ['new', 'contacted', 'proposal_sent', 'negotiation'];

const COLUMNAS_ORDENABLES: Record<string, string> = {
  customer_name: 'Cliente',
  stage: 'Etapa',
  estimated_amount: 'Importe',
  last_activity_at: 'Última actividad',
  next_action_at: 'Próxima acción',
  customer_source: 'Canal',
};

/**
 * Tabla densa de oportunidades.  DESIGN_BRIEF §8.4.
 * Responde a «¿dónde está todo?». Es la pantalla más densa y así debe verse.
 *
 * ── La columna «Vendedor» ─────────────────────────────────────────────
 * Solo existe para el supervisor. Para el vendedor **ni la columna ni el
 * filtro se dibujan**: no hay nada que ocultar porque nunca se pintan
 * (§8.4 y §14.7). El ancho mínimo cambia con ella: 1040 px sin, 1220 px con.
 *
 * Filas de 44 px exactas, cebra sutil, cabecera fija al desplazar, y toda la
 * fila es pulsable y abre la ficha del cliente.
 */
export function TablaDensa({
  esSupervisor,
  vendedores,
  filtrosIniciales,
}: {
  esSupervisor: boolean;
  vendedores: ReadonlyArray<{ id: string; full_name: string }>;
  filtrosIniciales: { atrasadas: boolean; vendedor: string };
}) {
  const router = useRouter();

  const [q, setQ] = React.useState('');
  const [etapa, setEtapa] = React.useState<Etapa | ''>('');
  const [estado, setEstado] = React.useState<'open' | 'won' | 'lost' | 'all'>('open');
  const [atrasadas, setAtrasadas] = React.useState(filtrosIniciales.atrasadas);
  const [vendedor, setVendedor] = React.useState(filtrosIniciales.vendedor);
  const [orden, setOrden] = React.useState('next_action_at');
  const [desc, setDesc] = React.useState(false);
  const [pagina, setPagina] = React.useState(1);

  const [filas, setFilas] = React.useState<Fila[]>([]);
  const [total, setTotal] = React.useState(0);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState(false);

  const [menuDe, setMenuDe] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<{ tipo: 'actividad' | 'ganada' | 'perdida'; fila: Fila } | null>(
    null,
  );

  const hayFiltros = q !== '' || etapa !== '' || estado !== 'open' || atrasadas || vendedor !== '';

  const cargar = React.useCallback(async () => {
    setCargando(true);
    setError(false);

    const p = new URLSearchParams({
      estado,
      page: String(pagina),
      sort: orden,
      dir: desc ? 'desc' : 'asc',
    });
    if (q) p.set('q', q);
    if (etapa) p.set('etapa', etapa);
    if (atrasadas) p.set('atrasadas', '1');
    if (vendedor) p.set('vendedor', vendedor);

    const r = await llamar<{ items: Fila[]; total: number }>(`/api/opportunities?${p}`);

    if (!r.ok) {
      setError(true);
      setCargando(false);
      return;
    }
    setFilas(r.datos.items);
    setTotal(r.datos.total);
    setCargando(false);
  }, [q, etapa, estado, atrasadas, vendedor, orden, desc, pagina]);

  // El buscador espera a que se deje de teclear: una consulta por pulsación
  // sería una consulta tirada por cada letra.
  React.useEffect(() => {
    const t = setTimeout(cargar, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, q]);

  function ordenarPor(campo: string) {
    if (orden === campo) setDesc((d) => !d);
    else {
      setOrden(campo);
      setDesc(false);
    }
    setPagina(1);
  }

  function quitarFiltros() {
    setQ('');
    setEtapa('');
    setEstado('open');
    setAtrasadas(false);
    setVendedor('');
    setPagina(1);
  }

  const paginas = Math.max(1, Math.ceil(total / 50));
  const anchoMinimo = esSupervisor ? 1220 : 1040;

  return (
    <>
      {/* ── Barra de filtros, en una sola línea sobre la tabla ── */}
      <div className="flex flex-wrap items-end gap-s3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="buscador" className="block text-secundario text-neutro-800">
            Buscar
          </label>
          <Input
            id="buscador"
            className="mt-s1 h-[34px]"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(1);
            }}
            placeholder="Nombre, empresa o teléfono"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="f-etapa" className="block text-secundario text-neutro-800">
            Etapa
          </label>
          <select
            id="f-etapa"
            className="mt-s1 h-[34px] rounded border border-neutro-400 bg-superficie px-s2 text-cuerpo"
            value={etapa}
            onChange={(e) => {
              setEtapa(e.target.value as Etapa | '');
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            {ETAPAS_FILTRO.map((e) => (
              <option key={e} value={e}>
                {ETAPA[e]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-estado" className="block text-secundario text-neutro-800">
            Estado
          </label>
          <select
            id="f-estado"
            className="mt-s1 h-[34px] rounded border border-neutro-400 bg-superficie px-s2 text-cuerpo"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as typeof estado);
              setPagina(1);
            }}
          >
            <option value="open">Abiertas</option>
            <option value="won">Ganadas</option>
            <option value="lost">Perdidas</option>
            <option value="all">Todas</option>
          </select>
        </div>

        <label className="flex h-[34px] items-center gap-s1 text-cuerpo">
          <input
            type="checkbox"
            checked={atrasadas}
            onChange={(e) => {
              setAtrasadas(e.target.checked);
              setPagina(1);
            }}
            className="h-4 w-4 accent-[color:var(--color-accent)]"
          />
          Solo atrasadas
        </label>

        {/* El filtro por vendedor SOLO se dibuja para el supervisor. */}
        {esSupervisor ? (
          <div>
            <label htmlFor="f-vendedor" className="block text-secundario text-neutro-800">
              Vendedor
            </label>
            <select
              id="f-vendedor"
              className="mt-s1 h-[34px] rounded border border-neutro-400 bg-superficie px-s2 text-cuerpo"
              value={vendedor}
              onChange={(e) => {
                setVendedor(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.full_name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <p className="ml-auto text-secundario text-neutro-800" aria-live="polite">
          {total} {total === 1 ? 'oportunidad' : 'oportunidades'}
        </p>
      </div>

      {/* ── La tabla ── */}
      <div className="mt-s3 overflow-x-auto rounded border border-filete bg-superficie">
        <table className="w-full border-collapse text-tabla" style={{ minWidth: anchoMinimo }}>
          <thead className="sticky top-0 z-10 bg-superficie">
            <tr className="border-b border-filete">
              <th scope="col" className="w-8 px-s2 py-s1">
                <span className="sr-only">Señal de atraso</span>
              </th>
              <CabeceraOrdenable campo="customer_name" {...{ orden, desc, ordenarPor }} />
              {esSupervisor ? (
                <th scope="col" className="px-s2 py-s1 text-left text-rotulo uppercase text-neutro-700">
                  Vendedor
                </th>
              ) : null}
              <th scope="col" className="px-s2 py-s1 text-left text-rotulo uppercase text-neutro-700">
                Teléfono
              </th>
              <CabeceraOrdenable campo="stage" {...{ orden, desc, ordenarPor }} />
              <CabeceraOrdenable campo="estimated_amount" alineacion="right" {...{ orden, desc, ordenarPor }} />
              <CabeceraOrdenable campo="last_activity_at" {...{ orden, desc, ordenarPor }} />
              <CabeceraOrdenable campo="next_action_at" {...{ orden, desc, ordenarPor }} />
              <CabeceraOrdenable campo="customer_source" {...{ orden, desc, ordenarPor }} />
              <th scope="col" className="w-12 px-s2 py-s1">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              // Esqueleto con la MISMA forma y altura que el contenido real.
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="h-fila border-b border-filete">
                  <td colSpan={esSupervisor ? 10 : 9} className="px-s2">
                    <Esqueleto className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={esSupervisor ? 10 : 9}>
                  <ErrorEstado onReintentar={cargar} />
                </td>
              </tr>
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={esSupervisor ? 10 : 9}>
                  {hayFiltros ? (
                    <VacioTrasFiltrar
                      filtrosPuestos={describirFiltros({ q, etapa, estado, atrasadas, vendedor, vendedores })}
                      onQuitarFiltros={quitarFiltros}
                    />
                  ) : (
                    <VacioPrimeraVez
                      titulo="Aún no tienes oportunidades"
                      explicacion="Registra tu primer cliente para empezar a trabajar."
                    />
                  )}
                </td>
              </tr>
            ) : (
              filas.map((f, i) => (
                <tr
                  key={f.opportunity_id}
                  onClick={() => router.push(`/clientes/${f.customer_id}`)}
                  className={cn(
                    'h-fila cursor-pointer border-b border-filete last:border-b-0',
                    'hover:bg-marca-100',
                    i % 2 === 1 && 'bg-neutro-100',
                  )}
                >
                  <td className="px-s2">
                    <PuntoAtraso atrasada={f.needs_attention} />
                  </td>

                  <td className="max-w-[240px] px-s2">
                    <span className="block truncate font-semibold text-tinta">
                      {f.customer_name}
                    </span>
                    {f.customer_company ? (
                      <span className="block truncate text-nota text-neutro-700">
                        {f.customer_company}
                      </span>
                    ) : null}
                  </td>

                  {esSupervisor ? (
                    <td className="max-w-[140px] truncate px-s2 text-neutro-800">
                      {vendedores.find((v) => v.id === f.owner_id)?.full_name ?? '—'}
                    </td>
                  ) : null}

                  <td className="whitespace-nowrap px-s2">{fphone(f.customer_phone)}</td>

                  <td className="px-s2">
                    <EtiquetaEtapa etapa={f.stage} />
                  </td>

                  <td className="whitespace-nowrap px-s2 text-right">
                    {eur(f.estimated_amount, false)}
                  </td>

                  <td className="whitespace-nowrap px-s2 text-neutro-800">
                    {frel(f.last_activity_at)}
                  </td>

                  <td
                    className={cn(
                      'whitespace-nowrap px-s2',
                      // Rojo si venció. Es la única alarma del sistema.
                      f.is_overdue ? 'font-semibold text-atraso-700' : 'text-neutro-800',
                    )}
                  >
                    {fdmhm(f.next_action_at)}
                  </td>

                  <td className="whitespace-nowrap px-s2 text-neutro-700">
                    {f.customer_source ? CANAL[f.customer_source] : '—'}
                  </td>

                  <td className="relative px-s2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Acciones de ${f.customer_name}`}
                      aria-expanded={menuDe === f.opportunity_id}
                      onClick={() =>
                        setMenuDe((m) => (m === f.opportunity_id ? null : f.opportunity_id))
                      }
                    >
                      <span aria-hidden="true">⋯</span>
                    </Button>

                    {menuDe === f.opportunity_id ? (
                      <MenuFila
                        fila={f}
                        onCerrar={() => setMenuDe(null)}
                        onAccion={(tipo) => {
                          setMenuDe(null);
                          if (tipo === 'ficha') router.push(`/clientes/${f.customer_id}`);
                          else setModal({ tipo, fila: f });
                        }}
                      />
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Paginación de 50 en 50, al pie ── */}
      {total > 50 ? (
        <div className="mt-s3 flex items-center justify-between text-secundario text-neutro-800">
          <span>
            {(pagina - 1) * 50 + 1}–{Math.min(pagina * 50, total)} de {total}
          </span>
          <div className="flex gap-s2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

      {modal?.tipo === 'actividad' ? (
        <ModalActividad
          abierto
          oportunidadId={modal.fila.opportunity_id}
          nombreCliente={modal.fila.customer_name}
          onCerrar={() => {
            setModal(null);
            cargar();
          }}
        />
      ) : null}

      {modal?.tipo === 'ganada' ? (
        <ModalGanada
          abierto
          oportunidadId={modal.fila.opportunity_id}
          estimado={modal.fila.estimated_amount}
          onCerrar={() => {
            setModal(null);
            cargar();
          }}
        />
      ) : null}

      {modal?.tipo === 'perdida' ? (
        <ModalPerdida
          abierto
          oportunidadId={modal.fila.opportunity_id}
          onCerrar={() => {
            setModal(null);
            cargar();
          }}
        />
      ) : null}
    </>
  );
}

function CabeceraOrdenable({
  campo,
  orden,
  desc,
  ordenarPor,
  alineacion = 'left',
}: {
  campo: string;
  orden: string;
  desc: boolean;
  ordenarPor: (c: string) => void;
  alineacion?: 'left' | 'right';
}) {
  const activa = orden === campo;
  return (
    <th
      scope="col"
      aria-sort={activa ? (desc ? 'descending' : 'ascending') : 'none'}
      className={cn('px-s2 py-s1', alineacion === 'right' ? 'text-right' : 'text-left')}
    >
      <button
        type="button"
        onClick={() => ordenarPor(campo)}
        className="text-rotulo uppercase text-neutro-700 hover:text-tinta
                   focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-marca"
      >
        {COLUMNAS_ORDENABLES[campo]}
        <span aria-hidden="true">{activa ? (desc ? ' ↓' : ' ↑') : ''}</span>
      </button>
    </th>
  );
}

/** Menú de tres puntos. Las cinco acciones de DESIGN_BRIEF §8.4. */
function MenuFila({
  fila,
  onCerrar,
  onAccion,
}: {
  fila: Fila;
  onCerrar: () => void;
  onAccion: (tipo: 'actividad' | 'ganada' | 'perdida' | 'ficha') => void;
}) {
  const caja = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function fuera(e: MouseEvent) {
      if (!caja.current?.contains(e.target as Node)) onCerrar();
    }
    function escape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [onCerrar]);

  // Una oportunidad cerrada no admite ninguna de las cuatro primeras: no se
  // reabre, no se cierra dos veces y no acepta actividades.
  const abierta = fila.status === 'open';

  return (
    <div
      ref={caja}
      role="menu"
      className="absolute right-s2 top-full z-20 w-[200px] rounded border border-filete
                 bg-superficie py-s1 shadow-md"
    >
      {abierta ? (
        <>
          <OpcionMenu onClick={() => onAccion('actividad')}>Registrar actividad</OpcionMenu>
          <OpcionMenu onClick={() => onAccion('ganada')}>Marcar como ganada</OpcionMenu>
          <OpcionMenu onClick={() => onAccion('perdida')}>Marcar como perdida</OpcionMenu>
        </>
      ) : null}
      <OpcionMenu onClick={() => onAccion('ficha')}>Abrir ficha</OpcionMenu>
    </div>
  );
}

function OpcionMenu({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-s3 py-s1 text-left text-cuerpo text-tinta hover:bg-neutro-100
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:-outline-offset-2 focus-visible:outline-marca"
    >
      {children}
    </button>
  );
}

/** El vacío tras filtrar explica QUÉ filtros están puestos (§6.3). */
function describirFiltros({
  q,
  etapa,
  estado,
  atrasadas,
  vendedor,
  vendedores,
}: {
  q: string;
  etapa: Etapa | '';
  estado: string;
  atrasadas: boolean;
  vendedor: string;
  vendedores: ReadonlyArray<{ id: string; full_name: string }>;
}): string {
  const partes: string[] = [];
  if (q) partes.push(`búsqueda «${q}»`);
  if (etapa) partes.push(`etapa ${ETAPA[etapa]}`);
  if (estado === 'won') partes.push('solo ganadas');
  if (estado === 'lost') partes.push('solo perdidas');
  if (atrasadas) partes.push('solo atrasadas');
  if (vendedor) {
    const v = vendedores.find((x) => x.id === vendedor);
    if (v) partes.push(`vendedor ${v.full_name}`);
  }
  return partes.length > 0
    ? `Filtros puestos: ${partes.join(' · ')}.`
    : 'No hay ninguna oportunidad que coincida.';
}
