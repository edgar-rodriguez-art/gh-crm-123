import type { Metadata } from 'next';
import { PendienteDeHito } from '@/components/pendiente-de-hito';

export const metadata: Metadata = { title: 'Auditoría · CRM-123' };
export const dynamic = 'force-dynamic';

export default function PaginaAuditoria() {
  return (
    <PendienteDeHito
      titulo="Administración · Auditoría"
      hito={4}
      descripcion="El registro de solo lectura de las 14 acciones auditadas, con sus filtros."
    />
  );
}
