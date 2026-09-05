'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { requisitosEnVivo } from '@crm123/core/password';
import { TEXTO } from '@crm123/core/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FormularioContrasena({ username }: { username: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirmacion, setConfirmacion] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  const requisitos = requisitosEnVivo(password, username);
  const todosCumplidos = requisitos.every((r) => r.cumplido);

  // Validación en vivo de la confirmación (DESIGN_BRIEF §8.2).
  const coinciden = confirmacion.length > 0 && password === confirmacion;
  const noCoinciden = confirmacion.length > 0 && password !== confirmacion;
  const puedeGuardar = todosCumplidos && coinciden && !guardando;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeGuardar) return;

    setGuardando(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmacion }),
      });
      const cuerpo = (await res.json()) as { redirect_to?: string; message?: string };

      if (!res.ok) {
        setError(cuerpo.message ?? TEXTO.errorGenerico);
        setGuardando(false);
        return;
      }

      router.replace(cuerpo.redirect_to ?? '/panel');
      router.refresh();
    } catch {
      setError(TEXTO.errorGenerico);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="space-y-s3">
        <div>
          <Label htmlFor="password">Contraseña nueva</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            aria-describedby="requisitos"
            className="mt-s1"
          />

          {/* Requisitos que se van marcando. El símbolo acompaña siempre al
              color: nada se transmite solo por color (DESIGN_BRIEF §13). */}
          <ul id="requisitos" className="mt-s2 space-y-0.5">
            {requisitos.map((r) => (
              <li
                key={r.texto}
                className={`text-nota ${r.cumplido ? 'text-ganada' : 'text-neutro-800'}`}
              >
                <span aria-hidden="true">{r.cumplido ? '✓' : '·'}</span>{' '}
                <span className="sr-only">{r.cumplido ? 'Cumplido:' : 'Pendiente:'}</span>
                {r.texto}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Label htmlFor="confirmacion">Repite la contraseña</Label>
          <Input
            id="confirmacion"
            type="password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="new-password"
            aria-invalid={noCoinciden || undefined}
            aria-describedby={noCoinciden ? 'error-confirmacion' : undefined}
            className="mt-s1"
          />
          {noCoinciden ? (
            <p id="error-confirmacion" role="alert" className="mt-s1 text-nota text-neutro-900">
              Las dos contraseñas no coinciden.
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2
                     text-secundario text-neutro-900"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-s4">
        <Button type="submit" size="login" disabled={!puedeGuardar}>
          {guardando ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
      </div>
    </form>
  );
}
