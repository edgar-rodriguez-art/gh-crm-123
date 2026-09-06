'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ftime } from '@crm123/core/format';
import { Button } from '@/components/ui/button';
import { llamar } from '@/lib/api';

type Ejecucion = {
  id: string;
  status: string;
  emails_sent: number | null;
  started_at: string;
  finished_at: string | null;
};

/** Cada 5 segundos, 24 veces: dos minutos de sondeo (TECHNICAL_SPEC §7.7). */
const CADA_MS = 5_000;
const INTENTOS = 24;

/**
 * Envío del resumen matutino.  DESIGN_BRIEF §10.3.
 *
 * El único proceso largo de todo el sistema, y por eso el único sitio donde
 * existe el estado «proceso corriendo» de §6.5. Cinco estados:
 *
 *   A · Confirmación      — la hoja pregunta antes de mandar diez correos.
 *   B · Corriendo         — la hoja NO se puede cerrar y el botón desaparece.
 *   C · Terminado bien    — «10 correos enviados a las 09:42.»
 *   D · Terminado mal     — sin códigos de error, con reintento.
 *   E · Bloqueado         — no abre la hoja; avisa con amabilidad.
 *
 * El estado E se comprueba DOS veces: aquí antes de abrir la hoja, para no
 * hacer pasar a nadie por una confirmación que va a ser rechazada, y en el
 * servidor al recibir el POST, que es la que de verdad protege. Si el
 * servidor dice 429 —porque el otro supervisor pulsó primero— se cierra la
 * hoja y se enseña el mismo aviso, con la hora que él devuelve.
 *
 * El sondeo se corta al desmontar: sin eso, cerrar la pantalla dejaría un
 * temporizador vivo pidiendo datos cada cinco segundos.
 */
export function EnvioResumen({
  ultima,
  minutosEnfriamiento,
  hayVendedores,
}: {
  ultima: Ejecucion | null;
  minutosEnfriamiento: number;
  hayVendedores: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = React.useState<
    'cerrada' | 'confirmar' | 'enviando' | 'largo' | 'hecho' | 'fallo'
  >('cerrada');
  const [limite, setLimite] = React.useState<{ minutos: number; hora: string } | null>(null);
  const [sinConfigurar, setSinConfigurar] = React.useState<string | null>(null);
  const [resultado, setResultado] = React.useState<Ejecucion | null>(null);

  const temporizador = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const vivo = React.useRef(true);

  React.useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const abierta = estado !== 'cerrada';

  /** Minutos que faltan para poder volver a enviar, o 0 si ya se puede. */
  function bloqueo(): { minutos: number; hora: string } | null {
    if (!ultima) return null;
    const inicio = new Date(ultima.started_at).getTime();
    const reapertura = inicio + minutosEnfriamiento * 60_000;
    if (Date.now() >= reapertura) return null;
    return {
      minutos: Math.max(1, Math.round((Date.now() - inicio) / 60_000)),
      hora: ftime(new Date(reapertura)),
    };
  }

  function pulsarEnviar() {
    const b = bloqueo();
    if (b) {
      // Estado E: la hoja no llega a abrirse.
      setLimite(b);
      return;
    }
    setLimite(null);
    setSinConfigurar(null);
    setEstado('confirmar');
  }

  async function confirmar() {
    setEstado('enviando');
    setResultado(null);

    const r = await llamar<{ run_id: string; status: string }>(
      '/api/automation/morning-digest/trigger',
      { metodo: 'POST' },
    );

    if (!vivo.current) return;

    if (!r.ok) {
      if (r.error === 'too_soon') {
        // Otro supervisor se ha adelantado entre el clic y el envío.
        setEstado('cerrada');
        setLimite({
          minutos: Number(r.extra.minutes_ago ?? 1),
          hora: String(r.extra.retry_at ?? ''),
        });
        router.refresh();
        return;
      }
      if (r.error === 'automation_not_configured') {
        // No es un fallo del envío: es que todavía no hay a dónde enviar.
        // Decir «vuelve a intentarlo en unos minutos» sería mentir, porque
        // esperar no lo arregla.
        setEstado('cerrada');
        setSinConfigurar(r.message);
        return;
      }
      setEstado('fallo');
      return;
    }

    sondear(r.datos.run_id, 0);
  }

  function sondear(runId: string, intento: number) {
    if (!vivo.current) return;

    if (intento >= INTENTOS) {
      // Ni bien ni mal: sigue corriendo. Se deja cerrar, porque retenerla más
      // tiempo no aporta nada y el envío continúa sin la pantalla abierta.
      setEstado('largo');
      router.refresh();
      return;
    }

    temporizador.current = setTimeout(async () => {
      const r = await llamar<{ items: Ejecucion[] }>(
        `/api/automation/runs?run_id=${encodeURIComponent(runId)}`,
      );
      if (!vivo.current) return;

      const fila = r.ok ? r.datos.items[0] : undefined;

      if (fila?.status === 'success') {
        setResultado(fila);
        setEstado('hecho');
        router.refresh();
        return;
      }
      if (fila?.status === 'failed') {
        setResultado(fila);
        setEstado('fallo');
        router.refresh();
        return;
      }
      // Un fallo de red al sondear NO es un fallo del envío: se reintenta.
      sondear(runId, intento + 1);
    }, CADA_MS);
  }

  function cerrar() {
    if (estado === 'enviando') return; // Estado B: la hoja no se cierra.
    if (temporizador.current) clearTimeout(temporizador.current);
    setEstado('cerrada');
  }

  return (
    <>
      {/* --- El botón, fijo sobre la navegación inferior --- */}
      <div
        className="fixed inset-x-0 bottom-[56px] z-30 border-t border-filete bg-superficie
                   px-s4 pt-s3"
        style={{ paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom))' }}
      >
        {limite ? (
          <p
            role="status"
            className="mb-s2 rounded border border-neutro-300 bg-neutro-100 px-s3 py-s2
                       text-secundario text-tinta"
          >
            <strong className="font-semibold">
              Ya has enviado el resumen hace {limite.minutos}{' '}
              {limite.minutos === 1 ? 'minuto' : 'minutos'}.
            </strong>{' '}
            {limite.hora ? `Podrás volver a enviarlo a las ${limite.hora}.` : null}
          </p>
        ) : null}

        {sinConfigurar ? (
          <p
            role="status"
            className="mb-s2 rounded border border-neutro-300 bg-neutro-100 px-s3 py-s2
                       text-secundario text-tinta"
          >
            {sinConfigurar}
          </p>
        ) : null}

        <Button className="h-[48px] w-full" onClick={pulsarEnviar} disabled={!hayVendedores}>
          Enviar resumen matutino ahora
        </Button>

        <p className="mt-s2 text-center text-nota text-neutro-800">{ultimoEnvio(ultima)}</p>
      </div>

      {/* --- La hoja inferior --- */}
      {abierta ? (
        <Hoja cerrable={estado !== 'enviando'} onCerrar={cerrar}>
          {estado === 'confirmar' ? (
            <>
              <h2 id="hoja-titulo" className="font-titulo text-h2menor">
                Enviar el resumen matutino
              </h2>
              <p id="hoja-descripcion" className="mt-s2 text-cuerpo text-neutro-800">
                Se enviará un correo a cada vendedor activo con sus oportunidades atrasadas, sus
                acciones de hoy y su avance de meta.
              </p>
              <div className="mt-s4 flex gap-s2">
                <Button variant="outline" className="h-[44px] flex-1" onClick={cerrar}>
                  Cancelar
                </Button>
                <Button className="h-[44px] flex-1" onClick={confirmar}>
                  Enviar ahora
                </Button>
              </div>
            </>
          ) : null}

          {estado === 'enviando' ? (
            <>
              <h2 id="hoja-titulo" className="font-titulo text-h2menor">
                Enviando resúmenes…
              </h2>
              <div
                role="progressbar"
                aria-label="Enviando resúmenes"
                className="mt-s3 h-1.5 w-full overflow-hidden rounded-sm bg-neutro-300"
              >
                {/* Indeterminado: no se finge un porcentaje que nadie conoce. */}
                <div className="h-full w-1/3 animate-esqueleto bg-marca" />
              </div>
              <p id="hoja-descripcion" className="mt-s3 text-cuerpo text-neutro-800">
                Esto tarda menos de un minuto. Puedes cerrar la aplicación, el envío continuará.
              </p>
            </>
          ) : null}

          {estado === 'largo' ? (
            <>
              <h2 id="hoja-titulo" className="font-titulo text-h2menor">
                Sigue enviándose
              </h2>
              <p id="hoja-descripcion" className="mt-s2 text-cuerpo text-neutro-800">
                Está tardando más de lo normal, pero no se ha detenido. Cierra tranquilo: verás el
                resultado en «Último envío».
              </p>
              <div className="mt-s4">
                <Button className="h-[44px] w-full" onClick={cerrar}>
                  Cerrar
                </Button>
              </div>
            </>
          ) : null}

          {estado === 'hecho' ? (
            <>
              <h2 id="hoja-titulo" className="font-titulo text-h2menor text-ganada">
                <span aria-hidden="true">✓</span> Resúmenes enviados
              </h2>
              <p id="hoja-descripcion" className="mt-s2 text-cuerpo text-neutro-800">
                {resultado?.emails_sent ?? 0}{' '}
                {resultado?.emails_sent === 1 ? 'correo enviado' : 'correos enviados'}
                {resultado?.finished_at ? ` a las ${ftime(resultado.finished_at)}.` : '.'}
              </p>
              <div className="mt-s4">
                <Button className="h-[44px] w-full" onClick={cerrar}>
                  Cerrar
                </Button>
              </div>
            </>
          ) : null}

          {estado === 'fallo' ? (
            <>
              <h2 id="hoja-titulo" className="font-titulo text-h2menor text-atraso-800">
                <span aria-hidden="true">✕</span> No se han podido enviar
              </h2>
              {/* Sin códigos de error, sin detalles técnicos (§10.3 D). */}
              <p id="hoja-descripcion" className="mt-s2 text-cuerpo text-neutro-800">
                El envío ha fallado. Vuelve a intentarlo en unos minutos.
              </p>
              <div className="mt-s4 flex gap-s2">
                <Button variant="outline" className="h-[44px] flex-1" onClick={cerrar}>
                  Cerrar
                </Button>
                <Button className="h-[44px] flex-1" onClick={confirmar}>
                  Reintentar
                </Button>
              </div>
            </>
          ) : null}
        </Hoja>
      ) : null}
    </>
  );
}

/**
 * La hoja inferior: sube desde el borde de la pantalla (§10.3).
 *
 * Atrapa el foco, devuelve el foco a quien la abrió y se cierra con `Esc`
 * —salvo en el estado B, que es el único caso que el brief exceptúa (§13)—.
 */
function Hoja({
  cerrable,
  onCerrar,
  children,
}: {
  cerrable: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const caja = React.useRef<HTMLDivElement>(null);
  const disparador = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    disparador.current = document.activeElement as HTMLElement | null;
    const primero = caja.current?.querySelector<HTMLElement>('button:not([disabled])');
    primero?.focus();
    return () => disparador.current?.focus?.();
  }, []);

  React.useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  function alPulsarTecla(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && cerrable) {
      e.stopPropagation();
      onCerrar();
      return;
    }
    if (e.key !== 'Tab') return;

    const enfocables = caja.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-neutro-900/35"
      onMouseDown={(e) => {
        if (cerrable && e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-titulo"
        aria-describedby="hoja-descripcion"
        onKeyDown={alPulsarTecla}
        className="w-full rounded-t-lg border-t border-filete bg-superficie px-s4 pt-s4 shadow-lg"
        style={{ paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
    </div>
  );
}

/** «Último envío: hoy a las 07:30 · 10 correos.» (§10.1, punto 6). */
function ultimoEnvio(e: Ejecucion | null): string {
  if (!e) return 'Todavía no se ha enviado ningún resumen.';

  const cuando = new Date(e.finished_at ?? e.started_at);
  const hoy =
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(cuando) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());

  const dia = hoy
    ? 'hoy'
    : `el ${new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: 'numeric',
        month: 'short',
      }).format(cuando)}`;

  if (e.status === 'failed') return `Último intento: ${dia} a las ${ftime(cuando)} · falló.`;
  if (e.status === 'running') return `Enviándose desde ${dia} a las ${ftime(cuando)}.`;

  const n = e.emails_sent ?? 0;
  return `Último envío: ${dia} a las ${ftime(cuando)} · ${n} ${n === 1 ? 'correo' : 'correos'}.`;
}
