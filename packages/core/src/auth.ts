import 'server-only';

import { createClient } from './supabase/server';
import type { Database } from './types/database';

export type Perfil = {
  id: string;
  username: string;
  full_name: string;
  role: Database['public']['Enums']['user_role'];
  is_active: boolean;
  must_change_password: boolean;
};

/**
 * El perfil de quien hace la petición, leído SIEMPRE de la tabla `profiles`.
 *
 * CLAUDE.md regla 10 y TECHNICAL_SPEC §5.1: el rol nunca sale del JWT, de
 * `user_metadata` ni de `app_metadata`. Un token manipulado con
 * `role: supervisor` no sirve de nada porque nadie lo lee.
 *
 * Devuelve `null` si no hay sesión, si el perfil no existe o si la cuenta
 * está desactivada — los tres casos se tratan igual: no hay usuario.
 */
export async function perfilActual(): Promise<Perfil | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, is_active, must_change_password')
    .eq('id', user.id)
    .single();

  if (!data || !data.is_active) return null;
  return data;
}

/** `true` solo si hay sesión activa Y el perfil dice `supervisor`. */
export async function esSupervisor(): Promise<boolean> {
  const p = await perfilActual();
  return p?.role === 'supervisor';
}
