import type { Metadata } from 'next';
import { PendienteDeHito } from '@/components/pendiente-de-hito';

export const metadata: Metadata = { title: 'Oportunidades · CRM-123' };
export const dynamic = 'force-dynamic';

export default function PaginaOportunidades() {
  return (
    <PendienteDeHito
      titulo="Oportunidades"
      hito={3}
      descripcion="La tabla densa con sus nueve columnas, filtros, orden y paginación de 50 en 50."
    />
  );
}
