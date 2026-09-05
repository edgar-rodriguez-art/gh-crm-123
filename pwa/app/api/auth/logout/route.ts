import { createClient } from '@crm123/core/supabase/server';
import { jsonOk, registrarFallo } from '@crm123/core/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/logout · TECHNICAL_SPEC §7.1. Cierra sesión y vuelve al ingreso. */
export async function POST() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (e) {
    // Si la sesión ya no era válida, el resultado es el mismo: fuera.
    registrarFallo('POST /api/auth/logout', e);
  }
  return jsonOk({ redirect_to: '/login' });
}
