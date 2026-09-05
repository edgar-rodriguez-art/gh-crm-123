import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * `start_url` del manifest. El inicio de la PWA es el panel del equipo.
 * Si no hay sesión, el middleware ya habrá desviado al ingreso.
 */
export default function Raiz() {
  redirect('/panel');
}
