'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../types/database';

/**
 * Cliente de NAVEGADOR.  TECHNICAL_SPEC §2, fila «Navegador».
 * Clave anónima. Todas sus lecturas pasan por RLS, así que la clave es
 * pública por diseño y no revela nada por sí sola.
 *
 * No importa `env.ts`: ese módulo es `server-only`. Next.js sustituye las
 * `NEXT_PUBLIC_*` literales en tiempo de compilación, por eso se leen así.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
