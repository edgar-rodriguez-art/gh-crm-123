import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

/**
 * Diagnóstico de la clave de servicio, para el REGISTRO DEL SERVIDOR.
 *
 * ── El problema que resuelve ──────────────────────────────────────────
 * Si en `SUPABASE_SERVICE_ROLE_KEY` se pega por error la clave anónima —los
 * dos valores empiezan por `eyJ` y se parecen muchísimo—, el cliente
 * «administrador» queda sujeto a RLS. Entonces `select` sobre `profiles`
 * como anónimo NO da error: devuelve CERO FILAS, en silencio.
 *
 * Para el código de ingreso eso es indistinguible de «ese usuario no existe»,
 * así que contestaría «Usuario o contraseña incorrectos.» aunque el usuario
 * exista y la contraseña sea correcta. Una tarde entera persiguiendo un
 * fantasma.
 *
 * Esta función solo se llama cuando el ingreso YA ha fallado, así que no
 * cuesta nada en el camino bueno. No cambia lo que ve la persona —el mensaje
 * genérico sigue siendo el mismo, como exige DESIGN_BRIEF §8.1—; solo deja
 * en el registro del servidor la diferencia entre las dos causas.
 */
export async function avisarSiLaClaveNoEsDeServicio(
  admin: SupabaseClient<Database>,
): Promise<void> {
  try {
    const { count, error } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error(
        '[CRM-123] La clave de servicio no puede leer `profiles`. ' +
          'Revisa SUPABASE_SERVICE_ROLE_KEY en Vercel. Detalle:',
        error.message,
      );
      return;
    }

    if ((count ?? 0) === 0) {
      console.error(
        '[CRM-123] ATENCIÓN: la clave de servicio no ve NINGUNA fila de `profiles`, ' +
          'y la base tiene usuarios. Casi seguro que en SUPABASE_SERVICE_ROLE_KEY ' +
          'está pegada la clave ANÓNIMA en lugar de la de servicio: al estar sujeta ' +
          'a RLS, lee cero filas sin dar error. Cópiala de Supabase → Settings → API ' +
          '→ service_role → Reveal, y vuelve a desplegar.',
      );
      return;
    }

    // Hay filas: la clave es correcta y el fallo es de credenciales de verdad.
    console.info(
      `[CRM-123] Ingreso fallido con credenciales inválidas. La clave de servicio ` +
        `funciona (ve ${count} perfiles).`,
    );
  } catch (e) {
    console.error('[CRM-123] No se pudo diagnosticar la clave de servicio:', e);
  }
}
