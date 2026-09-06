'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TIPO_ACTIVIDAD, MOTIVO_PERDIDA, TEXTO } from '@crm123/core/labels';
import { eur, pct } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/dialogo';
import { AreaTexto, CampoFechaHora, CampoImporte, Desplegable, aNumero, aUtc } from '@/components/campos';
import { llamar } from '@/lib/api';
import { cn } from '@/lib/utils';

type TipoActividad = Database['public']['Enums']['activity_type'];
type MotivoPerdida = Database['public']['Enums']['loss_reason'];

const TIPOS = Object.entries(TIPO_ACTIVIDAD) as [TipoActividad, string][];

/**
 * Registrar actividad.  DESIGN_BRIEF §8.6 y flujo F1.
 *
 * Es una VENTANA, no una navegación. Abrirla desde el tablero no debe sacar
 * al vendedor de la pantalla: el ritmo de la mañana depende de poder despachar
 * siete atrasadas sin cambiar de contexto.
 */
export function ModalActividad({
  abierto,
  oportunidadId,
  nombreCliente,
  onCerrar,
}: {
  abierto: boolean;
  oportunidadId: string | null;
  nombreCliente?: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState<TipoActividad>('call');
  const [nota, setNota] = React.useState('');
  const [proxima, setProxima] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setTipo('call');
      setNota('');
      setProxima('');
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  async function registrar() {
    if (guardando || !oportunidadId || nota.trim().length === 0) return;
    setGuardando(true);
    setError(null);

    const r = await llamar(`/api/opportunities/${oportunidadId}/activities`, {
      metodo: 'POST',
      cuerpo: { type: tipo, note: nota.trim(), next_action_at: aUtc(proxima) },
    });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onCerrar();
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Registrar actividad"
      descripcion={nombreCliente}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            size="dialogo"
            onClick={registrar}
            disabled={guardando || nota.trim().length === 0}
          >
            {guardando ? 'Guardando…' : 'Registrar'}
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="text-secundario text-neutro-800">Tipo</legend>
        <div className="mt-s1 grid grid-cols-5 gap-s1">
          {TIPOS.map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={tipo === valor}
              onClick={() => setTipo(valor)}
              className={cn(
                'h-[34px] rounded border text-nota transition-colors duration-150',
                'focus-visible:outline focus-visible:outline-2',
                'focus-visible:outline-offset-2 focus-visible:outline-marca',
                tipo === valor
                  ? 'border-marca bg-marca-100 font-semibold text-marca-800'
                  : 'border-neutro-400 text-tinta hover:bg-neutro-100',
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      </fieldset>

      <AreaTexto
        className="mt-s3"
        etiqueta="¿Qué ha pasado?"
        valor={nota}
        onCambio={setNota}
        filas={3}
        obligatorio
      />

      <CampoFechaHora
        className="mt-s3"
        etiqueta="Próxima acción"
        valor={proxima}
        onCambio={setProxima}
        ayuda="Opcional."
      />

      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/** Nueva oportunidad. La etapa arranca en «Nuevo» y no se puede elegir. */
export function ModalNuevaOportunidad({
  abierto,
  clienteId,
  onCerrar,
}: {
  abierto: boolean;
  clienteId: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [importe, setImporte] = React.useState('');
  const [proxima, setProxima] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setImporte('');
      setProxima('');
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  const cantidad = aNumero(importe);

  async function crear() {
    if (guardando || cantidad === null) return;
    setGuardando(true);
    setError(null);

    const r = await llamar('/api/opportunities', {
      metodo: 'POST',
      cuerpo: {
        customer_id: clienteId,
        estimated_amount: cantidad,
        next_action_at: aUtc(proxima),
      },
    });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onCerrar();
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Nueva oportunidad"
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="dialogo" onClick={crear} disabled={guardando || cantidad === null}>
            {guardando ? 'Guardando…' : 'Crear oportunidad'}
          </Button>
        </>
      }
    >
      <CampoImporte
        etiqueta="Importe estimado"
        valor={importe}
        onCambio={setImporte}
        obligatorio
        ayuda={TEXTO.importesSinIva}
        error={importe.length > 0 && cantidad === null ? 'Escribe una cantidad válida.' : null}
      />
      <CampoFechaHora
        className="mt-s3"
        etiqueta="Próxima acción"
        valor={proxima}
        onCambio={setProxima}
        ayuda="Opcional."
      />
      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/** Marcar como ganada. El importe final se precarga con el estimado. */
export function ModalGanada({
  abierto,
  oportunidadId,
  estimado,
  onCerrar,
  onGanada,
}: {
  abierto: boolean;
  oportunidadId: string;
  estimado: number;
  onCerrar: () => void;
  onGanada?: (importe: number) => void;
}) {
  const router = useRouter();
  const [importe, setImporte] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setImporte(String(estimado).replace('.', ','));
      setError(null);
      setGuardando(false);
    }
  }, [abierto, estimado]);

  const cantidad = aNumero(importe);

  async function confirmar() {
    if (guardando || cantidad === null) return;
    setGuardando(true);
    setError(null);

    const r = await llamar(`/api/opportunities/${oportunidadId}/win`, {
      metodo: 'POST',
      cuerpo: { final_amount: cantidad },
    });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onGanada?.(cantidad);
    onCerrar();
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Marcar como ganada"
      descripcion="Confirma el importe final de la venta."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="dialogo" onClick={confirmar} disabled={guardando || cantidad === null}>
            {guardando ? 'Guardando…' : 'Confirmar venta'}
          </Button>
        </>
      }
    >
      <CampoImporte
        etiqueta="Importe final"
        valor={importe}
        onCambio={setImporte}
        obligatorio
        ayuda="Este importe cuenta para tu meta del mes. Sin IVA."
        error={importe.length > 0 && cantidad === null ? 'Escribe una cantidad válida.' : null}
      />
      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/** Marcar como perdida. El botón está apagado hasta elegir motivo. */
export function ModalPerdida({
  abierto,
  oportunidadId,
  onCerrar,
}: {
  abierto: boolean;
  oportunidadId: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = React.useState<MotivoPerdida | ''>('');
  const [nota, setNota] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setMotivo('');
      setNota('');
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  async function confirmar() {
    if (guardando || !motivo) return;
    setGuardando(true);
    setError(null);

    const r = await llamar(`/api/opportunities/${oportunidadId}/lose`, {
      metodo: 'POST',
      cuerpo: { loss_reason: motivo, loss_note: nota.trim() || null },
    });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onCerrar();
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Marcar como perdida"
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          {/* Apagado hasta que hay motivo (DESIGN_BRIEF §8.6). */}
          <Button size="dialogo" onClick={confirmar} disabled={guardando || !motivo}>
            {guardando ? 'Guardando…' : 'Marcar como perdida'}
          </Button>
        </>
      }
    >
      <Desplegable
        etiqueta="Motivo"
        obligatorio
        valor={motivo}
        onCambio={setMotivo}
        vacio="Elige un motivo"
        opciones={(Object.entries(MOTIVO_PERDIDA) as [MotivoPerdida, string][]).map(
          ([valor, texto]) => ({ valor, texto }),
        )}
      />
      <AreaTexto
        className="mt-s3"
        etiqueta="Nota"
        valor={nota}
        onCambio={setNota}
        filas={3}
        maximo={500}
        ayuda="Opcional."
      />
      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/** Aviso de éxito tras una venta, con el nuevo porcentaje de meta. */
export function AvisoVenta({
  importe,
  porcentaje,
  onCerrar,
}: {
  importe: number;
  porcentaje: number | null;
  onCerrar: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(onCerrar, 6000);
    return () => clearTimeout(t);
  }, [onCerrar]);

  return (
    <div
      role="status"
      className="fixed bottom-s4 left-1/2 z-50 -translate-x-1/2 rounded bg-neutro-900
                 px-s4 py-s2 text-secundario text-neutro-100 shadow-md"
    >
      Venta registrada: {eur(importe)}.
      {porcentaje !== null ? ` Llevas el ${pct(porcentaje)} de tu meta.` : ''}
    </div>
  );
}
