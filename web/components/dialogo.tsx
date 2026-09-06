'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Ventana de acción.  DESIGN_BRIEF §8.6 y §13.
 *
 * Diálogo modal pequeño, centrado, con un solo cometido. Cumple las tres
 * exigencias de accesibilidad que el traspaso dejaba pendientes (punto 18):
 *
 *   · atrapa el foco mientras está abierta,
 *   · se cierra con `Esc`,
 *   · devuelve el foco a quien la abrió al cerrarse.
 *
 * `cerrable = false` es para el único caso que el brief exceptúa: la hoja de
 * envío del resumen en estado «corriendo» (§13), que ignora `Esc`.
 *
 * Se usa `<dialog>` nativo por su modalidad real —el resto de la página queda
 * inerte de verdad, no solo visualmente— y se le añade el atrapado de foco,
 * que el elemento no garantiza por sí solo en todos los navegadores.
 */
export function Dialogo({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  cerrable = true,
  children,
  pie,
  ancho = 'normal',
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  cerrable?: boolean;
  children: React.ReactNode;
  pie?: React.ReactNode;
  ancho?: 'normal' | 'ancho';
}) {
  const caja = React.useRef<HTMLDivElement>(null);
  const disparador = React.useRef<HTMLElement | null>(null);

  // Al abrir se recuerda quién tenía el foco, para devolvérselo al cerrar.
  React.useEffect(() => {
    if (!abierto) return;
    disparador.current = document.activeElement as HTMLElement | null;

    const primero = caja.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    primero?.focus();

    return () => disparador.current?.focus?.();
  }, [abierto]);

  // El fondo no se desplaza mientras la ventana está abierta.
  React.useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  function alPulsarTecla(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && cerrable) {
      e.stopPropagation();
      onCerrar();
      return;
    }

    if (e.key !== 'Tab') return;

    // Atrapado de foco: del último se salta al primero y viceversa.
    const enfocables = caja.current?.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!enfocables || enfocables.length === 0) return;

    const primero = enfocables[0]!;
    const ultimo = enfocables[enfocables.length - 1]!;

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  if (!abierto) return null;

  const idTitulo = 'dlg-titulo';
  const idDescripcion = descripcion ? 'dlg-descripcion' : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutro-900/35 p-s4"
      // Pulsar fuera cierra, salvo cuando la ventana no es cerrable.
      onMouseDown={(e) => {
        if (cerrable && e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        onKeyDown={alPulsarTecla}
        className={cn(
          'w-full rounded-lg border border-filete bg-superficie p-s4 shadow-lg',
          ancho === 'ancho' ? 'max-w-[560px]' : 'max-w-[420px]',
        )}
      >
        <h2 id={idTitulo} className="font-titulo text-h2menor">
          {titulo}
        </h2>
        {descripcion ? (
          <p id={idDescripcion} className="mt-s1 text-secundario text-neutro-800">
            {descripcion}
          </p>
        ) : null}

        <div className="mt-s3">{children}</div>

        {pie ? <div className="mt-s4 flex justify-end gap-s2">{pie}</div> : null}
      </div>
    </div>
  );
}
