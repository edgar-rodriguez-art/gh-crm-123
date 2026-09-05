import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** La raíz no es una pantalla: el inicio del escritorio es el tablero del día. */
export default function Raiz() {
  redirect('/tablero');
}
