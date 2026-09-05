import { NextResponse, type NextRequest } from 'next/server';
import { actualizarSesion, respuestaSinConfigurar } from '@crm123/core/supabase/middleware';

/**
 * Middleware de la PWA. Las mismas reglas de TECHNICAL_SPEC §6, más una:
 * **solo entran supervisores** (DESIGN_BRIEF §9).
 *
 * El rechazo del vendedor se decide con el rol leído de `profiles`
 * (CLAUDE.md regla 10), y ocurre en el servidor: escribir /panel a mano en la
 * barra del navegador no sirve de nada.
 */

const PUBLICAS = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response, perfil, faltanVariables } = await actualizarSesion(request);

  // Sin configuración no se puede decidir nada sobre la sesión. Se para aquí
  // con un mensaje que dice qué falta, en vez de reventar con un 500 opaco.
  if (faltanVariables.length > 0) return respuestaSinConfigurar(faltanVariables);

  const esPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!perfil || !perfil.is_active) {
    if (esPublica) return response;
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Un vendedor con sesión válida (por ejemplo, la cookie del escritorio en el
  // mismo dominio) no pasa de aquí.
  if (perfil.role !== 'supervisor') {
    if (esPublica) return response;
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'only_supervisors' }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '?motivo=solo-supervisores';
    return NextResponse.redirect(url);
  }

  if (pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = perfil.must_change_password ? '/cambiar-contrasena' : '/panel';
    url.search = '';
    return NextResponse.redirect(url);
  }

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

  if (pathname === '/cambiar-contrasena') {
    const url = request.nextUrl.clone();
    url.pathname = '/panel';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|sin-conexion.html|icons/|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$).*)',
  ],
};
