import { cn } from '@/lib/utils';

/**
 * Barra de progreso fina. Sin animación de llenado (DESIGN_BRIEF §12).
 *
 * Es la misma pieza que en el escritorio, repetida aquí a propósito: son dos
 * aplicaciones desplegadas por separado y una barra de doce líneas no merece
 * un tercer paquete compartido. Lo que sí vive en `@crm123/core` es todo lo
 * que, si se desviara, daría cifras distintas en cada aplicación.
 */
export function BarraProgreso({
  porcentaje,
  etiqueta,
  className,
}: {
  porcentaje: number;
  etiqueta: string;
  className?: string;
}) {
  const ancho = Math.max(0, Math.min(100, porcentaje));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ancho)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
      className={cn('h-1.5 w-full overflow-hidden rounded-sm bg-neutro-300', className)}
    >
      <div className="h-full bg-marca" style={{ width: `${ancho}%` }} />
    </div>
  );
}

/**
 * Bloque gris con la forma del contenido final. Nunca un girador centrado
 * (DESIGN_BRIEF §6.1).
 */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-esqueleto rounded bg-neutro-200', className)} />
  );
}
