import type { Metadata } from 'next';
import { PendienteDeHito } from '@/components/pendiente-de-hito';

export const metadata: Metadata = { title: 'Equipo · CRM-123' };
export const dynamic = 'force-dynamic';

/** Solo supervisor. El middleware lo impone antes de llegar aquí. */
export default function PaginaEquipo() {
  return (
    <PendienteDeHito
      titulo="Equipo"
      hito={4}
      descripcion="El avance del equipo, la tabla de vendedores y los motivos de pérdida del mes."
    />
  );
}
