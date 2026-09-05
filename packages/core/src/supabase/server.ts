import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../types/database';
import { env } from '../env';

/**
 * Cliente de SERVIDOR.  TECHNICAL_SPEC §2, fila «Servidor».
 * Clave anónima + cookie de sesión: lee y escribe COMO EL USUARIO, sujeto a
 * RLS. Es el cliente por defecto de Server Components y Route Handlers.
 *
 * Nunca esquiva RLS. Para eso está `admin.ts`, y solo en los cuatro casos
 * que enumera TECHNICAL_SPEC §2.
 */
export function createClient() {
  const cookieStore = cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env();

  return createServerClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies. El refresco de
          // sesión lo hace el middleware, así que ignorarlo aquí es correcto.
        }
      },
    },
  });
}
