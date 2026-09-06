'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Campos de formulario.  DESIGN_BRIEF §13.
 *
 * Todos comparten tres reglas que no se negocian:
 *   · etiqueta SIEMPRE visible, nunca el marcador de posición haciendo de etiqueta,
 *   · el error se asocia al campo con `aria-describedby` y `role="alert"`,
 *   · el campo con error se marca, pero el mensaje siempre lo acompaña: ninguna
 *     información va solo por color.
 */

let contador = 0;
function useId(prefijo: string) {
  const [id] = React.useState(() => `${prefijo}-${++contador}`);
  return id;
}

type BaseProps = {
  etiqueta: string;
  error?: string | null;
  ayuda?: string;
  obligatorio?: boolean;
  className?: string;
};

function Envoltura({
  etiqueta,
  error,
  ayuda,
  obligatorio,
  id,
  children,
  className,
}: BaseProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {etiqueta}
        {obligatorio ? <span aria-hidden="true"> *</span> : null}
        {obligatorio ? <span className="sr-only"> (obligatorio)</span> : null}
      </Label>
      <div className="mt-s1">{children}</div>
      {ayuda && !error ? <p className="mt-s1 text-nota text-neutro-800">{ayuda}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-s1 text-nota text-neutro-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CampoTexto({
  valor,
  onCambio,
  etiqueta,
  error,
  ayuda,
  obligatorio,
  className,
  ...resto
}: BaseProps & {
  valor: string;
  onCambio: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'>) {
  const id = useId('campo');
  return (
    <Envoltura {...{ etiqueta, error, ayuda, obligatorio, id, className }}>
      <Input
        id={id}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...resto}
      />
    </Envoltura>
  );
}

/** Teléfono con el `+34` fijo a la izquierda (DESIGN_BRIEF §8.6). */
export function CampoTelefono({
  valor,
  onCambio,
  onSalir,
  etiqueta = 'Teléfono',
  error,
  ayuda,
  className,
}: Omit<BaseProps, 'etiqueta'> & {
  etiqueta?: string;
  valor: string;
  onCambio: (v: string) => void;
  onSalir?: () => void;
}) {
  const id = useId('tel');
  return (
    <Envoltura {...{ etiqueta, error, ayuda, obligatorio: true, id, className }}>
      <div className="flex">
        <span
          aria-hidden="true"
          className="flex h-[38px] items-center rounded-l border border-r-0
                     border-neutro-400 bg-neutro-200 px-s2 text-cuerpo text-neutro-800"
        >
          +34
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onBlur={onSalir}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="rounded-l-none"
        />
      </div>
    </Envoltura>
  );
}

export function CampoImporte({
  valor,
  onCambio,
  etiqueta,
  error,
  ayuda,
  obligatorio,
  className,
}: BaseProps & { valor: string; onCambio: (v: string) => void }) {
  const id = useId('eur');
  return (
    <Envoltura {...{ etiqueta, error, ayuda, obligatorio, id, className }}>
      <div className="flex">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="rounded-r-none text-right"
        />
        <span
          aria-hidden="true"
          className="flex h-[38px] items-center rounded-r border border-l-0
                     border-neutro-400 bg-neutro-200 px-s2 text-cuerpo text-neutro-800"
        >
          €
        </span>
      </div>
    </Envoltura>
  );
}

export function Desplegable<T extends string>({
  valor,
  onCambio,
  opciones,
  etiqueta,
  error,
  ayuda,
  obligatorio,
  vacio,
  className,
}: BaseProps & {
  valor: T | '';
  onCambio: (v: T | '') => void;
  opciones: ReadonlyArray<{ valor: T; texto: string }>;
  vacio?: string;
}) {
  const id = useId('sel');
  return (
    <Envoltura {...{ etiqueta, error, ayuda, obligatorio, id, className }}>
      <select
        id={id}
        value={valor}
        onChange={(e) => onCambio(e.target.value as T | '')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-[38px] w-full rounded border border-neutro-400 bg-superficie px-s2
                   font-cuerpo text-cuerpo text-tinta
                   focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-marca"
      >
        {vacio !== undefined ? <option value="">{vacio}</option> : null}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </Envoltura>
  );
}

export function AreaTexto({
  valor,
  onCambio,
  etiqueta,
  error,
  ayuda,
  obligatorio,
  filas = 3,
  maximo,
  className,
}: BaseProps & {
  valor: string;
  onCambio: (v: string) => void;
  filas?: number;
  maximo?: number;
}) {
  const id = useId('area');
  return (
    <Envoltura {...{ etiqueta, error, ayuda, obligatorio, id, className }}>
      <textarea
        id={id}
        rows={filas}
        maxLength={maximo}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded border border-neutro-400 bg-superficie px-s2 py-s1
                   font-cuerpo text-cuerpo text-tinta
                   focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-marca"
      />
      {maximo ? (
        <p className="mt-s1 text-right text-nota text-neutro-800">
          {valor.length} / {maximo}
        </p>
      ) : null}
    </Envoltura>
  );
}

/**
 * Fecha y hora, EL MISMO control en las cuatro ubicaciones que lo usan
 * (README.handoff §7 punto 11). `datetime-local` da teclado nativo, formato
 * local y no depende de ninguna librería.
 *
 * El valor viaja en `datetime-local` (hora local del navegador) y se convierte
 * a UTC al enviar, con `aUtc()`.
 */
export function CampoFechaHora({
  valor,
  onCambio,
  etiqueta,
  error,
  ayuda,
  obligatorio,
  className,
}: BaseProps & { valor: string; onCambio: (v: string) => void }) {
  const id = useId('fh');
  return (
    <Envoltura {...{ etiqueta, error, ayuda, obligatorio, id, className }}>
      <Input
        id={id}
        type="datetime-local"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Envoltura>
  );
}

/** `datetime-local` → ISO en UTC. Cadena vacía → `null`. */
export function aUtc(valorLocal: string): string | null {
  if (!valorLocal) return null;
  const d = new Date(valorLocal);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → el valor que espera `datetime-local`. */
export function deUtc(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

/** `1.250,00` escrito a mano → 1250. Acepta coma y punto. */
export function aNumero(entrada: string): number | null {
  const limpio = entrada.trim().replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  if (!limpio || !/^\d+(\.\d+)?$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export const claseFila = cn();
