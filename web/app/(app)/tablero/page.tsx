import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { saludo, fdateLarga, eur, pct } from '@crm123/core/format';
import { TEXTO } from '@crm123/core/labels';
import { Button } from '@/components/ui/button';
import { VacioPrimeraVez } from '@/components/estados';

export const metadata: Metadata = { title: 'Tablero del día · CRM-123' };
export const dynamic = 'force-dynamic';

/**
 * Tablero del día — pantalla de inicio.  DESIGN_BRIEF §8.3.
 * Responde a «¿qué hago ahora?».
 *
 * ── ESTADO DE ESTE HITO ───────────────────────────────────────────────
 * BUILD_PLAN §2.2: «Los tres bloques dibujados con su estructura real, en su
 * ESTADO VACÍO. Ninguna consulta de datos todavía, más allá del perfil del
 * usuario.»
 *
 * Por eso no hay `select` sobre `v_opportunity_board` ni sobre
 * `v_seller_month_progress`: eso es el Hito 3. Lo que sí está es la
 * estructura definitiva y los vacíos con su texto exacto, para que conectar
 * los datos sea sustituir un array, no rehacer la pantalla.
 *
 * El botón «+ Nuevo cliente» se dibuja porque la cabecera es parte del
 * armazón, pero la ventana que abre llega en el Hito 3.
 */
export default async function PaginaTablero() {
  const perfil = await perfilActual();
  if (!perfil) redirect('/login');

  const nombreCorto = perfil.full_name.split(' ')[0] ?? perfil.full_name;

  return (
    <>
      {/* Cabecera: título a la izquierda, acciones a la derecha, una sola línea. */}
      <header className="flex flex-wrap items-baseline justify-between gap-s3">
        <h1 className="font-titulo text-h1">
          {saludo()}, {nombreCorto}
        </h1>
        <div className="flex items-center gap-s3">
          <span className="text-secundario text-neutro-800">{fdateLarga()}</span>
          <Button disabled title="Disponible en el Hito 3">
            + Nuevo cliente
          </Button>
        </div>
      </header>

      <div className="mt-s6 space-y-s6">
        {/* --- Bloque 1 · Atrasadas -------------------------------------
            El más prominente: es lo primero que se ve y lo que más pesa.
            Su vacío es una BUENA NOTICIA y se presenta sereno, sin ofrecer
            ninguna acción (DESIGN_BRIEF §8.3). */}
        <section aria-labelledby="t-atrasadas">
          <h2 id="t-atrasadas" className="font-titulo text-h2">
            Atrasadas <span className="text-neutro-700">(0)</span>
          </h2>
          <div className="mt-s2 rounded border border-filete bg-superficie">
            <VacioPrimeraVez titulo="Nada atrasado. Todo tu embudo está al día." sereno />
          </div>
        </section>

        {/* --- Bloque 2 · Para hoy --------------------------------------
            Mismas filas, ordenadas por hora. Sin color de alarma: esto está
            bajo control. */}
        <section aria-labelledby="t-hoy">
          <h2 id="t-hoy" className="font-titulo text-h2menor">
            Para hoy <span className="text-neutro-700">(0)</span>
          </h2>
          <div className="mt-s2 rounded border border-filete bg-superficie">
            <VacioPrimeraVez titulo="No tienes acciones agendadas para hoy." sereno />
          </div>
        </section>

        {/* --- Bloque 3 · Mi mes ---------------------------------------
            Franja horizontal, más baja que los bloques anteriores, cuatro
            cifras en línea. Sin cuota fijada: la barra NO se dibuja y el
            avance muestra «—», nunca «0 %» (regla R8). */}
        <section aria-labelledby="t-mes">
          <h2 id="t-mes" className="font-titulo text-h2menor">
            Mi mes
          </h2>
          <div className="mt-s2 rounded border border-filete bg-superficie px-s4 py-s3">
            <dl className="flex flex-wrap gap-s8">
              {[
                { rotulo: 'Cerrado', valor: eur(0) },
                { rotulo: 'Meta', valor: '—' },
                { rotulo: 'Falta', valor: '—' },
                { rotulo: 'Avance', valor: pct(null) },
              ].map((c) => (
                <div key={c.rotulo}>
                  <dt className="text-rotulo uppercase text-neutro-700">{c.rotulo}</dt>
                  <dd className="mt-0.5 font-titulo text-cifra">{c.valor}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-s3 text-nota text-neutro-800">
              Tu supervisor aún no ha fijado tu meta de este mes.
            </p>
            <p className="mt-s1 text-nota text-neutro-800">{TEXTO.importesSinIva}</p>
          </div>
        </section>
      </div>

      <p className="mt-s6">
        <Button variant="link" size="sm" disabled title="Disponible en el Hito 3">
          Ver todas mis oportunidades
        </Button>
      </p>
    </>
  );
}
