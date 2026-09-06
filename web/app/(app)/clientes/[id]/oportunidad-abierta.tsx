'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ETAPA, TEXTO } from '@crm123/core/labels';
import { eur, fdmhm } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import { MotivoAtraso } from '@/components/piezas';
import { CampoFechaHora, CampoImporte, aNumero, aUtc, deUtc } from '@/components/campos';
import { ModalGanada, ModalPerdida, AvisoVenta } from '@/components/modales-oportunidad';
import { llamar } from '@/lib/api';
import { cn } from '@/lib/utils';

type Etapa = Database['public']['Enums']['opportunity_stage'];

/** Las cuatro etapas seleccionables. «Cerrado» no lo es desde aquí (§8.5). */
const ETAPAS_ELEGIBLES: Etapa[] = ['new', 'contacted', 'proposal_sent', 'negotiation'];
const ETAPAS_VISIBLES: Etapa[] = [...ETAPAS_ELEGIBLES, 'closed'];

export type OportunidadAbierta = {
  id: string;
  stage: Etapa;
  estimated_amount: number;
  next_action_at: string | null;
  is_overdue: boolean;
  days_without_activity: number | null;
  needs_attention: boolean;
};

/**
 * Bloque de la oportunidad abierta.  DESIGN_BRIEF §8.5.
 *
 * El selector de etapa son CINCO pasos horizontales de la misma anchura
 * (`repeat(5, minmax(0,1fr))`). «Cerrado» se dibuja porque forma parte del
 * embudo, pero no se puede pulsar: una oportunidad se cierra ganándola o
 * perdiéndola, con sus ventanas, que son las que piden importe o motivo.
 *
 * Los dos botones de cierre van visualmente SECUNDARIOS y SEPARADOS del
 * resto: cerrar una venta no es una acción que se pulse sin querer.
 */
export function OportunidadAbiertaBloque({
  oportunidad,
  soloLectura,
}: {
  oportunidad: OportunidadAbierta;
  soloLectura: boolean;
}) {
  const router = useRouter();
  const [etapa, setEtapa] = React.useState<Etapa>(oportunidad.stage);
  const [importe, setImporte] = React.useState(String(oportunidad.estimated_amount).replace('.', ','));
  const [proxima, setProxima] = React.useState(deUtc(oportunidad.next_action_at));
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<'ganada' | 'perdida' | null>(null);
  const [aviso, setAviso] = React.useState<{ importe: number; porcentaje: number | null } | null>(
    null,
  );

  async function guardar(cambios: Record<string, unknown>, alVolver?: () => void) {
    if (guardando) return;
    setGuardando(true);
    setError(null);

    const r = await llamar(`/api/opportunities/${oportunidad.id}`, {
      metodo: 'PATCH',
      cuerpo: cambios,
    });

    setGuardando(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    alVolver?.();
    router.refresh();
  }

  async function cambiarEtapa(nueva: Etapa) {
    if (nueva === etapa || soloLectura) return;
    const anterior = etapa;
    setEtapa(nueva);
    await guardar({ stage: nueva }, undefined);
    // Si falló, el mensaje ya está puesto; se devuelve el selector a su sitio.
    if (error) setEtapa(anterior);
  }

  const cantidad = aNumero(importe);
  const importeCambiado = cantidad !== null && cantidad !== oportunidad.estimated_amount;
  const proximaCambiada = deUtc(oportunidad.next_action_at) !== proxima;

  return (
    <section aria-labelledby="t-oportunidad" className="rounded border border-filete bg-superficie p-s3">
      <h2 id="t-oportunidad" className="font-titulo text-h2menor">
        Oportunidad abierta
      </h2>

      {/* --- Selector de etapa: cinco pasos iguales en una fila --- */}
      <div
        role="group"
        aria-label="Etapa del embudo"
        className="mt-s3 grid gap-s1"
        style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}
      >
        {ETAPAS_VISIBLES.map((e) => {
          const activa = e === etapa;
          const elegible = ETAPAS_ELEGIBLES.includes(e) && !soloLectura;
          return (
            <button
              key={e}
              type="button"
              disabled={!elegible || guardando}
              aria-pressed={activa}
              onClick={() => cambiarEtapa(e)}
              className={cn(
                'flex min-h-[42px] items-center justify-center rounded border px-s1',
                'text-center text-[11px] leading-[1.25] transition-colors duration-150',
                'focus-visible:outline focus-visible:outline-2',
                'focus-visible:outline-offset-2 focus-visible:outline-marca',
                activa
                  ? 'border-marca bg-marca-100 font-semibold text-marca-800'
                  : 'border-neutro-400 text-tinta',
                elegible ? 'hover:bg-neutro-100' : 'cursor-default text-neutro-500',
              )}
            >
              {ETAPA[e]}
            </button>
          );
        })}
      </div>

      {oportunidad.needs_attention ? (
        <p className="mt-s3">
          <MotivoAtraso
            esVencida={oportunidad.is_overdue}
            proximaAccion={oportunidad.next_action_at}
            diasSinActividad={oportunidad.days_without_activity}
          />
        </p>
      ) : null}

      {soloLectura ? (
        <dl className="mt-s3 space-y-s2">
          <div>
            <dt className="text-rotulo uppercase text-neutro-700">Importe estimado</dt>
            <dd className="text-cuerpo">{eur(oportunidad.estimated_amount)}</dd>
          </div>
          <div>
            <dt className="text-rotulo uppercase text-neutro-700">Próxima acción</dt>
            <dd className="text-cuerpo">{fdmhm(oportunidad.next_action_at)}</dd>
          </div>
        </dl>
      ) : (
        <>
          <div className="mt-s3 flex items-end gap-s2">
            <CampoImporte
              className="flex-1"
              etiqueta="Importe estimado"
              valor={importe}
              onCambio={setImporte}
              ayuda={TEXTO.importesSinIva}
              error={importe.length > 0 && cantidad === null ? 'Cantidad no válida.' : null}
            />
            {importeCambiado ? (
              <Button
                size="sm"
                disabled={guardando}
                onClick={() => guardar({ estimated_amount: cantidad })}
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </Button>
            ) : null}
          </div>

          <div className="mt-s3 flex items-end gap-s2">
            <CampoFechaHora
              className="flex-1"
              etiqueta="Próxima acción"
              valor={proxima}
              onCambio={setProxima}
            />
            {proximaCambiada ? (
              <Button
                size="sm"
                disabled={guardando}
                onClick={() => guardar({ next_action_at: aUtc(proxima) })}
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </Button>
            ) : null}
          </div>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}

      {/* --- Los dos cierres: secundarios y separados del resto --- */}
      {!soloLectura ? (
        <div className="mt-s4 flex flex-wrap gap-s2 border-t border-filete pt-s3">
          <Button variant="outline" size="sm" onClick={() => setModal('ganada')}>
            Marcar como ganada
          </Button>
          <Button variant="outline" size="sm" onClick={() => setModal('perdida')}>
            Marcar como perdida
          </Button>
        </div>
      ) : null}

      <ModalGanada
        abierto={modal === 'ganada'}
        oportunidadId={oportunidad.id}
        estimado={oportunidad.estimated_amount}
        onCerrar={() => setModal(null)}
        onGanada={async (importeFinal) => {
          // El aviso enseña el porcentaje YA actualizado, así que se pide
          // después de cerrar la venta, no antes.
          const r = await llamar<{ quota_percent: number | null }>('/api/me/progress');
          setAviso({
            importe: importeFinal,
            porcentaje: r.ok ? r.datos.quota_percent : null,
          });
        }}
      />

      <ModalPerdida
        abierto={modal === 'perdida'}
        oportunidadId={oportunidad.id}
        onCerrar={() => setModal(null)}
      />

      {aviso ? (
        <AvisoVenta
          importe={aviso.importe}
          porcentaje={aviso.porcentaje}
          onCerrar={() => setAviso(null)}
        />
      ) : null}
    </section>
  );
}
