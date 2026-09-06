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

/**
 * Registra por qué falló `signInWithPassword`, distinguiendo lo esperado de
 * lo que es un problema de configuración.
 *
 * Sin esto, una contraseña equivocada y una clave anónima mal puesta dejan
 * exactamente el mismo rastro —ninguno—, y la persona ve el mismo mensaje en
 * los dos casos. Eso último es correcto y no se toca (DESIGN_BRIEF §8.1); lo
 * que no puede ser es que el servidor tampoco sepa distinguirlos.
 */
export function registrarFalloDeAutenticacion(error: unknown): void {
  const e = error as { message?: string; code?: string; status?: number } | null;
  const mensaje = e?.message ?? String(error);
  const codigo = e?.code ?? '(sin código)';
  const estado = e?.status ?? '(sin estado)';

  // El caso normal: existe el usuario y la contraseña no es la suya.
  if (e?.code === 'invalid_credentials' || e?.code === 'invalid_grant') {
    console.info('[CRM-123] Ingreso rechazado: contraseña incorrecta.');
    return;
  }

  console.error(
    `[CRM-123] La autenticación falló por algo que NO es una contraseña equivocada. ` +
      `code=${codigo} · status=${estado} · ${mensaje}\n` +
      '  Sospechosos, por orden:\n' +
      '   1. NEXT_PUBLIC_SUPABASE_ANON_KEY mal copiada, truncada, o de otro proyecto.\n' +
      '   2. El proveedor de Email/contraseña está desactivado en Supabase → ' +
      'Authentication → Providers → Email.\n' +
      '   3. NEXT_PUBLIC_SUPABASE_URL apunta a un proyecto distinto del que tiene ' +
      'los usuarios.',
  );
}
