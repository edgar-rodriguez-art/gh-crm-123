import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { fdateLarga } from '@crm123/core/format';
import { CerrarSesion } from '@/components/cerrar-sesion';

export const metadata: Metadata = { title: 'El equipo hoy · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Panel del supervisor.  DESIGN_BRIEF §10.1.
 * Responde a «¿cómo va el equipo, en diez segundos?».
 *
 * ── ESTADO DE ESTE HITO ───────────────────────────────────────────────
 * BUILD_PLAN §2.2 pide para la PWA: «Proyecto creado, manifest.json, iconos,
 * instalable. Inicio de sesión con rechazo de vendedores. PANEL VACÍO.»
 *
 * Están la cabecera y el ancla del semáforo, que es lo que la navegación
 * inferior necesita. Las cinco piezas con datos —tarjeta del equipo, tarjeta
 * de alerta, semáforo, botón de envío y línea del último envío— son del
 * Hito 4, junto con la hoja de envío y sus cinco estados.
 */
export default async function PaginaPanel() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  return (
    <>
      <header>
        <h1 className="font-titulo text-h2">El equipo hoy</h1>
        <p className="mt-s1 text-secundario text-neutro-800">{fdateLarga()}</p>
      </header>

      <section id="semaforo" className="mt-s6 scroll-mt-s4" aria-labelledby="t-semaforo">
        <h2 id="t-semaforo" className="sr-only">
          Semáforo del equipo
        </h2>
        <div className="rounded border border-filete bg-superficie px-s4 py-s6">
          {/*
            Vacío de DESIGN_BRIEF §10.1: sin vendedores con cuota fijada. Es el
            estado real de este hito, porque todavía no se consultan datos.
          */}
          <p className="text-cuerpo text-tinta">
            Aún no has fijado las metas del mes. Hazlo desde el escritorio.
          </p>
        </div>
      </section>

      <div className="mt-s6 border-t border-filete pt-s4">
        <p className="text-secundario text-tinta">{perfil.full_name}</p>
        <p className="text-nota text-neutro-800">Supervisor</p>
        <div className="mt-s2">
          <CerrarSesion />
        </div>
      </div>
    </>
  );
}
