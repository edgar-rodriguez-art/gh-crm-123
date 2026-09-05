import type { Metadata } from 'next';
import { PendienteDeHito } from '@/components/pendiente-de-hito';

export const metadata: Metadata = { title: 'Usuarios · CRM-123' };
export const dynamic = 'force-dynamic';

export default function PaginaUsuarios() {
  return (
    <PendienteDeHito
      titulo="Administración · Usuarios"
      hito={4}
      descripcion="Alta de usuarios con contraseña de un solo uso, edición, desactivar y reactivar."
    />
  );
}
