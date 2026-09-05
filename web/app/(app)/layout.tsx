import { redirect } from 'next/navigation';
import { perfilActual } from '@crm123/core/auth';
import { BarraLateral } from '@/components/barra-lateral';

export const dynamic = 'force-dynamic';

/**
 * Armazón de la aplicación: barra lateral fija de 240 px y área de contenido.
 * DESIGN_BRIEF §7 «Estructura común». Sin barra superior.
 *
 * El rol sale de `profiles` en el servidor (CLAUDE.md regla 10) y decide qué
 * enlaces se DIBUJAN. La frontera real es RLS más el middleware; esto es solo
 * la interfaz.
 */
export default async function LayoutAplicacion({ children }: { children: React.ReactNode }) {
  const perfil = await perfilActual();

  // El middleware ya lo cubre; esta comprobación es la segunda cerradura, por
  // si algún día alguien toca el `matcher`.
  if (!perfil) redirect('/login');
  if (perfil.must_change_password) redirect('/cambiar-contrasena');

  return (
    <div className="min-h-screen bg-lienzo">
      <BarraLateral nombre={perfil.full_name} rol={perfil.role} />
      <main className="ml-barra px-[30px] pb-[60px] pt-[26px]">{children}</main>
    </div>
  );
}
