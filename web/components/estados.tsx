import { TEXTO } from '@crm123/core/labels';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Los cinco estados globales de DESIGN_BRIEF §6, como componentes
 * reutilizables. Ninguna pantalla los improvisa.
 *
 *   6.1 Cargando           → <Esqueleto>, con la forma real del contenido
 *   6.2 Vacío primera vez  → <VacioPrimeraVez>, una sola acción
 *   6.3 Vacío tras filtrar → <VacioTrasFiltrar>, nunca ofrece «crear»
 *   6.4 Error              → <ErrorEstado> / <ErrorPermisos> (sin reintentar)
 *   6.5 Proceso corriendo  → solo el envío del resumen, vive en /pwa
 */

/* --- 6.1 Cargando ---------------------------------------------------- */

/**
 * Bloque gris con la MISMA forma y el MISMO alto que el contenido final, para
 * que nada salte al llegar los datos. Nunca un girador centrado.
 */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-esqueleto rounded bg-neutro-200', className)}
    />
  );
}

/** Fila de tablero en carga: mismas medidas que la fila real (82 px). */
export function EsqueletoFilaTablero() {
  return (
    <div className="flex h-[82px] items-center gap-s4 border-b border-filete px-s3">
      <div className="flex-1 space-y-s1">
        <Esqueleto className="h-4 w-48" />
        <Esqueleto className="h-3 w-32" />
      </div>
      <Esqueleto className="h-5 w-[132px]" />
      <Esqueleto className="h-5 w-[96px]" />
    </div>
  );
}

/** Franja de cifras en carga. */
export function EsqueletoFranja() {
  return (
    <div className="flex gap-s8">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-s1">
          <Esqueleto className="h-3 w-16" />
          <Esqueleto className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

/* --- 6.2 Vacío por primera vez --------------------------------------- */

/**
 * Título breve, una línea de explicación y UNA SOLA acción principal.
 * Sin ilustraciones grandes.
 *
 * `sereno` es para los vacíos que son buena noticia — «Nada atrasado» —, que
 * el brief pide presentar como tales y sin ofrecer ninguna acción.
 */
export function VacioPrimeraVez({
  titulo,
  explicacion,
  accion,
  sereno = false,
}: {
  titulo: string;
  explicacion?: string;
  accion?: React.ReactNode;
  sereno?: boolean;
}) {
  return (
    <div className={cn('px-s3 py-s6', sereno ? 'text-neutro-700' : 'text-tinta')}>
      <p className={cn('font-titulo', sereno ? 'text-cuerpo' : 'text-h2menor')}>{titulo}</p>
      {explicacion ? (
        <p className="mt-s1 max-w-prose text-secundario text-neutro-800">{explicacion}</p>
      ) : null}
      {accion ? <div className="mt-s3">{accion}</div> : null}
    </div>
  );
}

/* --- 6.3 Vacío tras filtrar ------------------------------------------ */

/**
 * Distinto del anterior a propósito. Explica qué filtros hay puestos y ofrece
 * quitarlos. NUNCA ofrece «crear»: el usuario está buscando, no creando.
 */
export function VacioTrasFiltrar({
  filtrosPuestos,
  onQuitarFiltros,
}: {
  filtrosPuestos: string;
  onQuitarFiltros?: () => void;
}) {
  return (
    <div className="px-s3 py-s6">
      <p className="font-titulo text-h2menor">Sin resultados</p>
      <p className="mt-s1 text-secundario text-neutro-800">{filtrosPuestos}</p>
      <div className="mt-s3">
        <Button variant="link" size="sm" onClick={onQuitarFiltros}>
          Quitar filtros
        </Button>
      </div>
    </div>
  );
}

/* --- 6.4 Error ------------------------------------------------------- */

/**
 * Título directo, una línea de qué pasó, botón «Reintentar».
 * Sin códigos técnicos ni mensajes crudos de la base de datos.
 */
export function ErrorEstado({
  titulo = 'No hemos podido cargar esto',
  explicacion = TEXTO.errorGenerico,
  onReintentar,
}: {
  titulo?: string;
  explicacion?: string;
  onReintentar?: () => void;
}) {
  return (
    <div className="px-s3 py-s6" role="alert">
      <p className="font-titulo text-h2menor">{titulo}</p>
      <p className="mt-s1 text-secundario text-neutro-800">{explicacion}</p>
      <div className="mt-s3">
        <Button variant="outline" size="sm" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

/**
 * Error de permisos. Es un caso APARTE: no ofrece reintentar, porque
 * reintentar no va a cambiar el resultado (DESIGN_BRIEF §6.4).
 */
export function ErrorPermisos() {
  return (
    <div className="px-s3 py-s6" role="alert">
      <p className="font-titulo text-h2menor">{TEXTO.sinPermiso}</p>
    </div>
  );
}
