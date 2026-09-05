import { NextResponse, type NextRequest } from 'next/server';
import { actualizarSesion, respuestaSinConfigurar } from '@crm123/core/supabase/middleware';

/**
 * Las cinco reglas de rutas de TECHNICAL_SPEC §6.
 *
 *   /login, /api/auth/login .............. público
 *   /api/n8n/* .......................... firma HMAC, no sesión   (Hito 4)
 *   /cambiar-contrasena ................. sesión válida
 *   /admin/* ............................ sesión + rol supervisor LEÍDO DE profiles
 *   todo lo demás ....................... sesión + must_change_password = false
 *
 * Se impone en el SERVIDOR, no con una redirección de cliente: escribir
 * /tablero a mano en la barra del navegador tiene que devolver al cambio de
 * contraseña igual que pulsar un enlace (BUILD_PLAN §2.5 prueba 6).
 */

const PUBLICAS = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hito 4. Se declara ya para que nadie meta estas rutas bajo la sesión:
  // n8n no tiene cookie, se autentica con la firma HMAC del propio manejador.
  if (pathname.startsWith('/api/n8n/')) return NextResponse.next();

  const { response, perfil, faltanVariables } = await actualizarSesion(request);

  // Sin configuración no se puede decidir nada sobre la sesión. Se para aquí
  // con un mensaje que dice qué falta, en vez de reventar con un 500 opaco.
  if (faltanVariables.length > 0) return respuestaSinConfigurar(faltanVariables);

  const esPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // --- Sin sesión válida (o cuenta desactivada a media jornada) ---------
  if (!perfil || !perfil.is_active) {
    if (esPublica) return response;

    // Una petición de API contesta 401; una navegación va al ingreso.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // --- Con sesión: el ingreso ya no tiene sentido ------------------------
  if (pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = perfil.must_change_password ? '/cambiar-contrasena' : '/tablero';
    return NextResponse.redirect(url);
  }

  // --- Cambio de contraseña obligatorio, sin escapatoria -----------------
  // DESIGN_BRIEF §14.9: no existe forma de saltárselo.
  if (perfil.must_change_password) {
    const permitidas =
      pathname === '/cambiar-contrasena' ||
      pathname === '/api/auth/change-password' ||
      pathname === '/api/auth/logout';
    if (!permitidas) {
      const url = request.nextUrl.clone();
      url.pathname = '/cambiar-contrasena';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Ya la cambió: volver aquí no tiene sentido.
  if (pathname === '/cambiar-contrasena') {
    const url = request.nextUrl.clone();
    url.pathname = '/tablero';
    return NextResponse.redirect(url);
  }

  // --- Rutas de supervisor -----------------------------------------------
  // El rol viene de `profiles`, nunca del JWT (CLAUDE.md regla 10).
  //
  // TECHNICAL_SPEC §6 solo nombra `/admin/*`, pero `/equipo` también es
  // exclusiva del supervisor: DESIGN_BRIEF §14.5 prohíbe cualquier ranking o
  // comparativa entre compañeros en la vista del vendedor, y BUILD_PLAN §4.7
  // prueba 2 exige que a un vendedor se le deniegue el panel del equipo. Sin
  // esta línea caería en «todo lo demás» y bastaría una sesión para entrar.
  if (pathname.startsWith('/admin') || pathname.startsWith('/equipo')) {
    if (perfil.role !== 'supervisor') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      // Reescritura, no redirección: la URL se queda donde está y la persona
      // ve «No tienes permiso para ver esto.» sin botón de reintentar.
      const url = request.nextUrl.clone();
      url.pathname = '/sin-permiso';
      return NextResponse.rewrite(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todo salvo los estáticos de Next, el icono y las imágenes. El
     * middleware lee `profiles` en cada petición: pasarlo por un .png es
     * una consulta tirada a la basura.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$).*)',
  ],
};
