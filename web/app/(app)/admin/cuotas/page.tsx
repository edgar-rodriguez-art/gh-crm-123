import type { Metadata } from 'next';
import { PendienteDeHito } from '@/components/pendiente-de-hito';

export const metadata: Metadata = { title: 'Cuotas · CRM-123' };
export const dynamic = 'force-dynamic';

export default function PaginaCuotas() {
  return (
    <PendienteDeHito
      titulo="Administración · Cuotas"
      hito={4}
      descripcion="Las metas del mes por vendedor, editables en línea, con copia del mes anterior."
    />
  );
}
