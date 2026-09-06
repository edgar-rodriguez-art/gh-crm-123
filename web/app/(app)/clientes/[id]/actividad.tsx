'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TIPO_ACTIVIDAD } from '@crm123/core/labels';
import { frel } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import { AreaTexto, CampoFechaHora, aUtc } from '@/components/campos';
import { llamar } from '@/lib/api';
import { cn } from '@/lib/utils';

type TipoActividad = Database['public']['Enums']['activity_type'];

const TIPOS = Object.entries(TIPO_ACTIVIDAD) as [TipoActividad, string][];

/**
 * Iniciales por tipo de actividad, mientras no se integre Phosphor duotone
 * (README.handoff §4 y §6). El texto va acompañado del nombre del tipo para
 * quien no vea el icono.
 */
const INICIALES: Record<TipoActividad, string> = {
  call: 'LL',
  whatsapp: 'WA',
  email: '@',
  visit: 'V',
  note: 'N',
};

export type Actividad = {
  id: string;
  type: TipoActividad;
  note: string;
  created_at: string;
  autor: string | null;
};

/** Formulario de registro. Arriba de la columna, siempre visible (§8.5). */
export function FormularioActividad({ oportunidadId }: { oportunidadId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState<TipoActividad>('call');
  const [nota, setNota] = React.useState('');
  const [proxima, setProxima] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  async function registrar() {
    if (guardando || nota.trim().length === 0) return;
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

    setNota('');
    setProxima('');
    setTipo('call');
    setGuardando(false);
    router.refresh();
  }

  return (
    <div className="rounded border border-filete bg-superficie p-s3">
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

      <div className="mt-s3">
        <Button onClick={registrar} disabled={guardando || nota.trim().length === 0}>
          {guardando ? 'Guardando…' : 'Registrar'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Línea de tiempo del historial, del más reciente al más antiguo.
 *
 * ── Lo que este componente NO tiene ───────────────────────────────────
 * Botones de editar o de archivar en sus entradas. No están escondidos ni
 * desactivados: NO EXISTEN (DESIGN_BRIEF §8.5 y §14.3). La base tampoco
 * admite `update` ni `delete` sobre `activities`, para nadie.
 *
 * El autor solo se muestra cuando se conoce. Si RLS oculta ese perfil —le
 * pasa a un vendedor que ha recibido un cliente reasignado, cuyas actividades
 * antiguas son de otro compañero— no se enseña nada: un vendedor no ve ni el
 * nombre de otro vendedor (R9).
 */
export function LineaDeTiempo({ actividades }: { actividades: Actividad[] }) {
  if (actividades.length === 0) {
    return (
      <p className="px-s3 py-s6 text-cuerpo text-neutro-700">Sin actividad todavía.</p>
    );
  }

  return (
    <>
      <ol className="space-y-s3">
        {actividades.map((a) => (
          <li key={a.id} className="flex gap-s2">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded
                         bg-neutro-200 text-[10px] font-semibold text-neutro-800"
            >
              {INICIALES[a.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-cuerpo text-tinta">
                <span className="sr-only">{TIPO_ACTIVIDAD[a.type]}: </span>
                {a.note}
              </p>
              <p className="mt-0.5 text-nota text-neutro-800">
                {TIPO_ACTIVIDAD[a.type]}
                {a.autor ? ` · ${a.autor}` : ''} · {frel(a.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-s4 text-nota text-neutro-800">El historial no se puede modificar.</p>
    </>
  );
}
