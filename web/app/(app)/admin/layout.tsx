import { PestanasAdmin } from './pestanas';

export const dynamic = 'force-dynamic';

/**
 * Administración.  DESIGN_BRIEF §8.8.  Solo supervisor: lo impone el
 * middleware leyendo el rol de `profiles`, no este componente.
 *
 * Tres pestañas: Usuarios · Cuotas · Auditoría. La pestaña viaja en la URL
 * (`/admin/usuarios`, `/admin/cuotas`, `/admin/auditoria`), así que se puede
 * enlazar en frío y el botón de atrás del navegador funciona.
 */
export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mb-s4">
        <h1 className="font-titulo text-h1">Administración</h1>
        <div className="mt-s3">
          <PestanasAdmin />
        </div>
      </header>
      {children}
    </>
  );
}
