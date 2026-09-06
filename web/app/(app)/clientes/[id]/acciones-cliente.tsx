'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import {
  ModalArchivar,
  ModalEditarCliente,
  ModalReasignar,
} from '@/components/modales-cliente';
import { ModalNuevaOportunidad } from '@/components/modales-oportunidad';
import { llamar } from '@/lib/api';

type Canal = Database['public']['Enums']['customer_source'];

export function BotonEditar({
  cliente,
}: {
  cliente: { id: string; full_name: string; company: string | null; source: Canal | null };
}) {
  const [abierto, setAbierto] = React.useState(false);
  return (
    <>
      <Button variant="link" size="sm" onClick={() => setAbierto(true)}>
        Editar
      </Button>
      <ModalEditarCliente
        abierto={abierto}
        cliente={cliente}
        onCerrar={() => setAbierto(false)}
      />
    </>
  );
}

/**
 * Botón de nueva oportunidad.
 *
 * Este componente SOLO se monta cuando el cliente no tiene ninguna abierta.
 * Cuando la tiene, el botón no aparece deshabilitado: no se dibuja en
 * absoluto (DESIGN_BRIEF §8.5 y §14.10). La base lo respalda con el índice
 * `opportunities_one_open_per_customer_uk`.
 */
export function BotonNuevaOportunidad({ clienteId }: { clienteId: string }) {
  const [abierto, setAbierto] = React.useState(false);
  return (
    <>
      <Button onClick={() => setAbierto(true)}>+ Nueva oportunidad</Button>
      <ModalNuevaOportunidad
        abierto={abierto}
        clienteId={clienteId}
        onCerrar={() => setAbierto(false)}
      />
    </>
  );
}

/** Acciones del supervisor, al pie de la columna y visualmente apartadas. */
export function AccionesSupervisor({
  clienteId,
  archivado,
  vendedores,
}: {
  clienteId: string;
  archivado: boolean;
  vendedores: ReadonlyArray<{ id: string; full_name: string }>;
}) {
  const router = useRouter();
  const [modal, setModal] = React.useState<'reasignar' | 'archivar' | null>(null);
  const [desarchivando, setDesarchivando] = React.useState(false);

  async function desarchivar() {
    if (desarchivando) return;
    setDesarchivando(true);
    await llamar(`/api/customers/${clienteId}/unarchive`, { metodo: 'POST' });
    setDesarchivando(false);
    router.refresh();
  }

  if (archivado) {
    return (
      <div className="border-t border-filete pt-s3">
        <Button variant="outline" size="sm" onClick={desarchivar} disabled={desarchivando}>
          {desarchivando ? 'Guardando…' : 'Desarchivar'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-s2 border-t border-filete pt-s3">
      <Button variant="outline" size="sm" onClick={() => setModal('reasignar')}>
        Reasignar a otro vendedor
      </Button>
      <Button variant="outline" size="sm" onClick={() => setModal('archivar')}>
        Archivar cliente
      </Button>

      <ModalReasignar
        abierto={modal === 'reasignar'}
        clienteId={clienteId}
        vendedores={vendedores}
        onCerrar={() => setModal(null)}
      />
      <ModalArchivar
        abierto={modal === 'archivar'}
        clienteId={clienteId}
        onCerrar={() => setModal(null)}
      />
    </div>
  );
}

/** Copia el teléfono al portapapeles de verdad (README.handoff §7 punto 15). */
export function CopiarTelefono({ telefono }: { telefono: string }) {
  const [copiado, setCopiado] = React.useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(telefono);
      // El aviso solo aparece si la escritura tuvo éxito.
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles no se miente diciendo que se copió.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="rounded text-nota text-marca-700 hover:underline
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      {copiado ? 'Copiado' : 'Copiar'}
      <span className="sr-only"> teléfono</span>
    </button>
  );
}
