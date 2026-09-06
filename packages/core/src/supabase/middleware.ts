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
  /**
   * Nombres de las variables de entorno que faltan. Si trae algo, la
   * aplicación NO está configurada y no se puede decidir nada sobre la
   * sesión: hay que devolver `respuestaSinConfigurar()` y parar ahí.
   */
  faltanVariables: string[];
};

/**
 * Dónde se obtiene cada una. Se enseña en la pantalla de error, porque quien
 * la va a leer no tiene por qué saber buscarlo.
 */
const DONDE: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL:
    'Supabase → Settings → API → Project URL. Solo el dominio ' +
    '(https://xxxx.supabase.co): si acaba en /rest/v1 es la dirección de la API ' +
    'de datos, que está justo al lado, y no sirve aquí.',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase → Settings → API → Project API keys → anon public',
};

/**
 * La Project URL no puede llevar ruta. Copiar la dirección de la API de datos
 * —que acaba en `/rest/v1`— hace que el cliente pida `/rest/v1/rest/v1/...` y
 * PostgREST conteste `PGRST125`, un error que no se parece a su causa.
 * Se detecta aquí para que salga la pantalla de «falta configurar» en vez de
 * dejar que todo falle más adelante con un mensaje incomprensible.
 */
function urlDeProyectoValida(v: string): boolean {
  try {
    const u = new URL(v);
    return (
      (u.protocol === 'https:' || u.protocol === 'http:') &&
      (u.pathname === '' || u.pathname === '/') &&
      !u.search &&
      !u.hash
    );
  } catch {
    return false;
  }
}

/**
 * Refresca la sesión y lee el perfil, para el middleware de ambas aplicaciones.
 *
 * El rol y `is_active` salen de `profiles` en CADA petición (TECHNICAL_SPEC §6):
 * un usuario desactivado en mitad de su jornada queda fuera en la siguiente
 * navegación, sin esperar a que caduque su token.
 *
 * ── Por qué comprueba las variables a mano ────────────────────────────
 * El middleware corre en el entorno de borde, donde `lib/env.ts` no sirve:
 * es `server-only` y Zod no se ejecuta ahí. Next sustituye las `NEXT_PUBLIC_*`
 * al COMPILAR, así que si no estaban puestas en ese momento llegan aquí como
 * `undefined` y `createServerClient` lanza «Your project's URL and Key are
 * required». Como el middleware cubre todas las rutas, esa excepción tumba el
 * sitio entero con un `MIDDLEWARE_INVOCATION_FAILED` que no le dice nada a
 * nadie. Por eso se comprueba antes y se contesta con un mensaje legible.
 */
export async function actualizarSesion(request: NextRequest): Promise<SesionMiddleware> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const faltanVariables = [
    ...(url && urlDeProyectoValida(url) ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
    ...(anon ? [] : ['NEXT_PUBLIC_SUPABASE_ANON_KEY']),
  ];

  let response = NextResponse.next({ request });

  if (faltanVariables.length > 0) {
    console.error(
      `[CRM-123] Faltan variables de entorno: ${faltanVariables.join(', ')}. ` +
        'Ponlas en Vercel y VUELVE A DESPLEGAR: las NEXT_PUBLIC_ se incrustan al compilar, ' +
        'así que un despliegue hecho sin ellas no las recoge aunque se añadan después.',
    );
    return { response, userId: null, perfil: null, faltanVariables };
  }

  const supabase = createServerClient<Database>(url as string, anon as string, {
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
  });

  try {
    // getUser() y no getSession(): valida el token contra el servidor de auth.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { response, userId: null, perfil: null, faltanVariables: [] };

    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, role, is_active, must_change_password')
      .eq('id', user.id)
      .single();

    return { response, userId: user.id, perfil: perfil ?? null, faltanVariables: [] };
  } catch (e) {
    // Supabase caído o sin red. Se falla CERRADO: sin perfil, el llamante
    // manda al ingreso. Nunca se deja pasar a nadie por un fallo de red.
    console.error('[CRM-123] El middleware no pudo comprobar la sesión:', e);
    return { response, userId: null, perfil: null, faltanVariables: [] };
  }
}

/**
 * Pantalla de «falta configurar», en lugar del 500 opaco de la plataforma.
 *
 * Se sirve con 503 y sin caché: es un estado temporal que se arregla poniendo
 * las variables y volviendo a desplegar. No revela ningún valor, solo qué
 * nombre falta y dónde se obtiene.
 */
export function respuestaSinConfigurar(faltan: string[]): NextResponse {
  const filas = faltan
    .map(
      (v) =>
        `<li><code>${v}</code><br><span class="donde">${DONDE[v] ?? 'Ver .env.example'}</span></li>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="es-ES"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Falta configurar · CRM-123</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#f3f2f2;color:#201e1d;padding:24px;
       font-family:'Source Serif 4',Georgia,'Times New Roman',serif;line-height:1.45}
  main{max-width:560px}
  h1{font-size:21px;font-weight:600;margin:0 0 12px}
  p{font-size:14px;color:#444141;margin:0 0 16px}
  ul{margin:0 0 16px;padding-left:20px;font-size:14px}
  li{margin-bottom:8px}
  code{background:#eae7e7;padding:1px 5px;border-radius:2px;font-family:ui-monospace,monospace;font-size:13px}
  .donde{font-size:12px;color:#605d5d}
  .aviso{border-left:3px solid #0088b0;padding-left:12px;font-size:13px;color:#444141}
</style></head>
<body><main>
  <h1>CRM-123 todavía no está configurado</h1>
  <p>Faltan estas variables de entorno:</p>
  <ul>${filas}</ul>
  <p class="aviso">Ponlas en Vercel, en <strong>Settings → Environment Variables</strong>,
  marcando Production, Preview y Development. Después <strong>vuelve a desplegar</strong>:
  las variables no se aplican al despliegue anterior.</p>
</main></body></html>`;

  return new NextResponse(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
