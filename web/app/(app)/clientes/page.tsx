import type { Metadata } from 'next';
import { PendienteDeHito } from '@/components/pendiente-de-hito';

export const metadata: Metadata = { title: 'Clientes · CRM-123' };
export const dynamic = 'force-dynamic';

export default function PaginaClientes() {
  return (
    <PendienteDeHito
      titulo="Clientes"
      hito={3}
      descripcion="El listado de clientes y la ficha completa con su historial de actividad."
    />
  );
}
