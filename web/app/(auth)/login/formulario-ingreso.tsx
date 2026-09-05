'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TEXTO } from '@crm123/core/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FormularioIngreso() {
  const router = useRouter();
  const [usuario, setUsuario] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [verPassword, setVerPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const campoUsuario = React.useRef<HTMLInputElement>(null);

  // Foco al cargar (DESIGN_BRIEF §8.1).
  React.useEffect(() => {
    campoUsuario.current?.focus();
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return; // Nunca se permite el doble envío (DESIGN_BRIEF §6).

    setEnviando(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usuario, password }),
      });
      const cuerpo = (await res.json()) as { redirect_to?: string; message?: string };

      if (!res.ok) {
        // La contraseña NO se borra (DESIGN_BRIEF §8.1).
        setError(cuerpo.message ?? TEXTO.credencialesInvalidas);
        setEnviando(false);
        return;
      }

      router.replace(cuerpo.redirect_to ?? '/tablero');
      router.refresh();
    } catch {
      setError(TEXTO.errorGenerico);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="space-y-s3">
        <div>
          <Label htmlFor="usuario">Usuario</Label>
          <Input
            id="usuario"
            ref={campoUsuario}
            name="username"
            value={usuario}
            // En minúsculas automáticamente (DESIGN_BRIEF §8.1).
            onChange={(e) => setUsuario(e.target.value.toLowerCase())}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'error-ingreso' : undefined}
            className="mt-s1"
          />
        </div>

        <div>
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative mt-s1">
            <Input
              id="password"
              name="password"
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'error-ingreso' : undefined}
              className="pr-[76px]"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              // El estado va en el texto, no solo en un icono: quien no ve el
              // icono necesita saber si la contraseña está a la vista.
              aria-pressed={verPassword}
              className="absolute right-s1 top-1/2 -translate-y-1/2 rounded px-s1 py-0.5
                         text-nota text-marca-700 hover:underline
                         focus-visible:outline focus-visible:outline-2
                         focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              {verPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
      </div>

      {/*
        Franja de error bajo los campos, sin color de alarma agresivo
        (DESIGN_BRIEF §8.1). La magenta del sistema está reservada al atraso y
        no puede aparecer aquí. `role="alert"` lo anuncia al lector de pantalla.
      */}
      {error ? (
        <p
          id="error-ingreso"
          role="alert"
          className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2
                     text-secundario text-neutro-900"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-s4">
        <Button type="submit" size="login" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </div>
    </form>
  );
}
