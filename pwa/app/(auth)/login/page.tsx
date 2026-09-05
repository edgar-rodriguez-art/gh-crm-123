import type { Metadata } from 'next';
import { FormularioIngreso } from './formulario-ingreso';

export const metadata: Metadata = { title: 'Entrar · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Inicio de sesión de la PWA.  DESIGN_BRIEF §8.1 y §9.
 *
 * Mismo formulario que el escritorio, con objetivos de pulsación de 48 px
 * como mínimo. Solo entran supervisores: el rechazo lo decide el servidor
 * tras autenticar, nunca el cliente.
 */
export default function PaginaIngresoPwa({
  searchParams,
}: {
  searchParams: { motivo?: string };
}) {
  // El middleware manda aquí con este motivo cuando un vendedor que ya tenía
  // sesión intenta abrir la PWA. Se lee en el servidor y se pasa como prop:
  // así el aviso está en el primer pintado, sin parpadeo.
  const avisoInicial =
    searchParams.motivo === 'solo-supervisores'
      ? 'Esta aplicación es solo para supervisores. Entra desde el escritorio.'
      : null;

  return (
    <main className="flex min-h-[100dvh] flex-col justify-center px-s4 py-s8">
      <div className="mx-auto w-full max-w-[360px]">
        <h1 className="font-titulo text-h1 tracking-tight">CRM-123</h1>
        <div className="mt-s6">
          <FormularioIngreso avisoInicial={avisoInicial} />
        </div>
        <p className="mt-s6 text-nota text-neutro-800">
          Si has olvidado tu contraseña, pídesela a tu supervisor.
        </p>
      </div>
    </main>
  );
}
