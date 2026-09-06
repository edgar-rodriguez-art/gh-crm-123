import { ETAPA } from '@crm123/core/labels';
import { fdm, fdias } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { cn } from '@/lib/utils';

type Etapa = Database['public']['Enums']['opportunity_stage'];

/**
 * Etiqueta de etapa. NEUTRA siempre.
 *
 * DESIGN_BRIEF §12: «Cinco etapas con cinco colores convierten la tabla en un
 * arcoíris ilegible.» Se diferencian por peso, nunca por color. La etapa
 * «Cerrado» va más apagada porque ya no pide nada a nadie.
 */
export function EtiquetaEtapa({ etapa }: { etapa: Etapa }) {
  return (
    <span
      className={cn(
        'inline-block rounded bg-neutro-200 px-s1 py-0.5 text-nota',
        etapa === 'closed' ? 'text-neutro-500' : 'font-semibold text-neutro-900',
      )}
    >
      {ETAPA[etapa]}
    </span>
  );
}

/**
 * El motivo del atraso.  DESIGN_BRIEF §8.3 y §12.
 *
 * Es el elemento más importante de la interfaz, y por eso **nunca depende
 * solo del color**: el punto magenta siempre va acompañado del texto que
 * explica por qué. Un usuario con daltonismo tiene que poder trabajar igual
 * de bien.
 *
 * Si se cumplen las dos condiciones se muestra la acción vencida, que es más
 * concreta que «N días sin actividad».
 */
export function MotivoAtraso({
  esVencida,
  proximaAccion,
  diasSinActividad,
}: {
  esVencida: boolean;
  proximaAccion: string | null;
  diasSinActividad: number | null;
}) {
  const texto = esVencida
    ? `Acción vencida el ${fdm(proximaAccion)}`
    : `${fdias(diasSinActividad)} sin actividad`;

  return (
    <span className="inline-flex items-center gap-s1 text-secundario font-semibold text-atraso-700">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-atraso" />
      {texto}
    </span>
  );
}

/** Punto de señal de la tabla densa. Sin texto, pero con nombre accesible. */
export function PuntoAtraso({ atrasada }: { atrasada: boolean }) {
  if (!atrasada) return <span className="sr-only">Al día</span>;
  return (
    <>
      <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-atraso" />
      <span className="sr-only">Atrasada</span>
    </>
  );
}

/** Barra de progreso fina. Sin animación de llenado (DESIGN_BRIEF §12). */
export function BarraProgreso({
  porcentaje,
  etiqueta,
}: {
  porcentaje: number;
  etiqueta: string;
}) {
  const ancho = Math.max(0, Math.min(100, porcentaje));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ancho)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
      className="h-1.5 w-full overflow-hidden rounded-sm bg-neutro-300"
    >
      <div className="h-full bg-marca" style={{ width: `${ancho}%` }} />
    </div>
  );
}
