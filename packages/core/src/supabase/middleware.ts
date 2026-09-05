import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../types/database';

export type SesionMiddleware = {
  /** Respuesta con las cookies de sesión ya refrescadas. Hay que devolverla. */
  response: NextResponse;
  /** `null` si no hay sesión válida. */
  userId: string | null;
  /** Perfil leído de la TABLA `profiles`. Nunca del JWT. CLAUDE.md regla 10. */
  perfil: {
    id: string;
    role: Database['public']['Enums']['user_role'];
    is_active: boolean;
    must_change_password: boolean;
  } | null;
};

/**
 * Refresca la sesión y lee el perfil, para el middleware de ambas aplicaciones.
 *
 * El rol y `is_active` salen de `profiles` en CADA petición (TECHNICAL_SPEC §6):
 * un usuario desactivado en mitad de su jornada queda fuera en la siguiente
 * navegación, sin esperar a que caduque su token.
 */
export async function actualizarSesion(request: NextRequest): Promise<SesionMiddleware> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() y no getSession(): valida el token contra el servidor de auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { response, userId: null, perfil: null };

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, role, is_active, must_change_password')
    .eq('id', user.id)
    .single();

  return { response, userId: user.id, perfil: perfil ?? null };
}
