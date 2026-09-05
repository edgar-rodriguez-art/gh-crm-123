import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { env } from '../env';

/**
 * Cliente ADMINISTRADOR.  TECHNICAL_SPEC §2, fila «Administrador».
 *
 * ⚠ ESTA CLAVE ESQUIVA TODAS LAS POLÍTICAS RLS.
 *
 * `import 'server-only'` es la primera línea del archivo a propósito
 * (CLAUDE.md regla 8): si alguien lo importa desde un componente cliente, la
 * compilación FALLA. No es una convención, es un cerrojo.
 *
 * Usos permitidos, y solo estos cuatro (TECHNICAL_SPEC §2):
 *   1. Alta de usuarios (`auth.admin.createUser`).           → Hito 4
 *   2. Resolución de nombre de usuario a email en el ingreso. → Hito 2
 *   3. Escritura en `automation_runs`.                        → Hito 4
 *   4. Comprobación de teléfono duplicado.                    → Hito 3
 *
 * Cada uso lleva una comprobación explícita de rol inmediatamente antes,
 * salvo el ingreso, que es previo a la sesión y por eso solo lee y jamás
 * devuelve al navegador nada de lo leído.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env();

  return createSupabaseClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
