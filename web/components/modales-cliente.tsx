'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CANAL } from '@crm123/core/labels';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/dialogo';
import { CampoTelefono, CampoTexto, Desplegable } from '@/components/campos';
import { llamar } from '@/lib/api';

type Canal = Database['public']['Enums']['customer_source'];

const OPCIONES_CANAL = (Object.entries(CANAL) as [Canal, string][]).map(([valor, texto]) => ({
  valor,
  texto,
}));

/**
 * Nuevo cliente.  DESIGN_BRIEF §8.6 y flujo F2.
 *
 * ── El aviso de teléfono duplicado ────────────────────────────────────
 * Al SALIR del campo de teléfono se consulta el servidor. Si el teléfono
 * pertenece a otro compañero, aparece el aviso y el botón de crear se apaga.
 *
 * Lo que se enseña es exactamente el texto del brief y NADA MÁS. Ni el
 * nombre, ni la empresa, ni quién lo lleva. El servidor tampoco los manda:
 * esta ventana es la frontera del aislamiento entre vendedores y el diseño no
 * puede erosionarla ni por curiosidad ni por amabilidad (§14.6).
 *
 * Si el cliente existente ES SUYO, el mensaje cambia y sí se ofrece abrir su
 * ficha: ahí no hay nada que ocultar.
 */
type EstadoTelefono =
  | { tipo: 'vacio' }
  | { tipo: 'comprobando' }
  | { tipo: 'libre' }
  | { tipo: 'invalido'; mensaje: string }
  | { tipo: 'ajeno'; mensaje: string }
  | { tipo: 'propio'; mensaje: string; clienteId: string };

export function ModalNuevoCliente({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [telefono, setTelefono] = React.useState('');
  const [nombre, setNombre] = React.useState('');
  const [empresa, setEmpresa] = React.useState('');
  const [canal, setCanal] = React.useState<Canal | ''>('');
  const [estadoTel, setEstadoTel] = React.useState<EstadoTelefono>({ tipo: 'vacio' });
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setTelefono('');
      setNombre('');
      setEmpresa('');
      setCanal('');
      setEstadoTel({ tipo: 'vacio' });
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  /** Se valida al salir del campo, como pide el brief. */
  async function comprobarTelefono() {
    if (!telefono.trim()) {
      setEstadoTel({ tipo: 'vacio' });
      return;
    }
    setEstadoTel({ tipo: 'comprobando' });

    const r = await llamar<{ available: boolean }>('/api/customers/check-phone', {
      metodo: 'POST',
      cuerpo: { phone: telefono },
    });

    if (r.ok) {
      setEstadoTel({ tipo: 'libre' });
      return;
    }
    if (r.error === 'invalid_phone') {
      setEstadoTel({ tipo: 'invalido', mensaje: r.message });
      return;
    }
    if (r.error === 'customer_exists') {
      const ajeno = r.extra.owned_by_other === true;
      setEstadoTel(
        ajeno
          ? { tipo: 'ajeno', mensaje: r.message }
          : { tipo: 'propio', mensaje: r.message, clienteId: String(r.extra.customer_id ?? '') },
      );
      return;
    }
    setEstadoTel({ tipo: 'invalido', mensaje: r.message });
  }

  const bloqueado =
    estadoTel.tipo === 'ajeno' ||
    estadoTel.tipo === 'propio' ||
    estadoTel.tipo === 'invalido' ||
    estadoTel.tipo === 'comprobando';

  const puedeCrear =
    !guardando && !bloqueado && telefono.trim().length > 0 && nombre.trim().length >= 2;

  async function crear() {
    if (!puedeCrear) return;
    setGuardando(true);
    setError(null);

    const r = await llamar<{ id: string }>('/api/customers', {
      metodo: 'POST',
      cuerpo: {
        phone: telefono,
        full_name: nombre.trim(),
        company: empresa.trim() || null,
        source: canal || null,
      },
    });

    if (!r.ok) {
      if (r.error === 'customer_exists') {
        setEstadoTel(
          r.extra.owned_by_other === true
            ? { tipo: 'ajeno', mensaje: r.message }
            : {
                tipo: 'propio',
                mensaje: r.message,
                clienteId: String(r.extra.customer_id ?? ''),
              },
        );
      } else {
        setError(r.message);
      }
      setGuardando(false);
      return;
    }

    onCerrar();
    router.push(`/clientes/${r.datos.id}`);
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Nuevo cliente"
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="dialogo" onClick={crear} disabled={!puedeCrear}>
            {guardando ? 'Guardando…' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <CampoTelefono
        valor={telefono}
        onCambio={(v) => {
          setTelefono(v);
          setEstadoTel({ tipo: 'vacio' });
        }}
        onSalir={comprobarTelefono}
        error={estadoTel.tipo === 'invalido' ? estadoTel.mensaje : null}
        ayuda={estadoTel.tipo === 'comprobando' ? 'Comprobando…' : undefined}
      />

      {estadoTel.tipo === 'ajeno' ? (
        <p
          role="alert"
          className="mt-s2 rounded border border-atraso-700/30 bg-atraso-100 px-s2 py-s2
                     text-secundario text-atraso-800"
        >
          <span aria-hidden="true">⚠ </span>
          <strong>{estadoTel.mensaje}</strong>
        </p>
      ) : null}

      {estadoTel.tipo === 'propio' ? (
        <p
          role="alert"
          className="mt-s2 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2
                     text-secundario text-neutro-900"
        >
          {estadoTel.mensaje}{' '}
          {estadoTel.clienteId ? (
            <Link
              href={`/clientes/${estadoTel.clienteId}`}
              className="text-marca-700 hover:underline"
            >
              Abrir su ficha
            </Link>
          ) : null}
        </p>
      ) : null}

      <CampoTexto
        className="mt-s3"
        etiqueta="Nombre"
        obligatorio
        valor={nombre}
        onCambio={setNombre}
        autoComplete="off"
      />
      <CampoTexto
        className="mt-s3"
        etiqueta="Empresa"
        valor={empresa}
        onCambio={setEmpresa}
        autoComplete="off"
        ayuda="Opcional."
      />
      <Desplegable
        className="mt-s3"
        etiqueta="Canal"
        valor={canal}
        onCambio={setCanal}
        vacio="Sin especificar"
        opciones={OPCIONES_CANAL}
        ayuda="Opcional."
      />

      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/** Editar cliente. El teléfono no aparece: es el identificador único. */
export function ModalEditarCliente({
  abierto,
  cliente,
  onCerrar,
}: {
  abierto: boolean;
  cliente: { id: string; full_name: string; company: string | null; source: Canal | null };
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = React.useState(cliente.full_name);
  const [empresa, setEmpresa] = React.useState(cliente.company ?? '');
  const [canal, setCanal] = React.useState<Canal | ''>(cliente.source ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setNombre(cliente.full_name);
      setEmpresa(cliente.company ?? '');
      setCanal(cliente.source ?? '');
      setError(null);
      setGuardando(false);
    }
  }, [abierto, cliente]);

  async function guardar() {
    if (guardando || nombre.trim().length < 2) return;
    setGuardando(true);
    setError(null);

    const r = await llamar(`/api/customers/${cliente.id}`, {
      metodo: 'PATCH',
      cuerpo: {
        full_name: nombre.trim(),
        company: empresa.trim() || null,
        source: canal || null,
      },
    });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onCerrar();
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Editar cliente"
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="dialogo" onClick={guardar} disabled={guardando || nombre.trim().length < 2}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <CampoTexto etiqueta="Nombre" obligatorio valor={nombre} onCambio={setNombre} />
      <CampoTexto className="mt-s3" etiqueta="Empresa" valor={empresa} onCambio={setEmpresa} />
      <Desplegable
        className="mt-s3"
        etiqueta="Canal"
        valor={canal}
        onCambio={setCanal}
        vacio="Sin especificar"
        opciones={OPCIONES_CANAL}
      />
      <p className="mt-s3 text-nota text-neutro-800">
        El teléfono no se puede cambiar: es el identificador del cliente en todo el sistema.
      </p>
      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/** Reasignar a otro vendedor. Solo supervisor. */
export function ModalReasignar({
  abierto,
  clienteId,
  vendedores,
  onCerrar,
}: {
  abierto: boolean;
  clienteId: string;
  vendedores: ReadonlyArray<{ id: string; full_name: string }>;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [destino, setDestino] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setDestino('');
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  async function reasignar() {
    if (guardando || !destino) return;
    setGuardando(true);
    setError(null);

    const r = await llamar(`/api/customers/${clienteId}/reassign`, {
      metodo: 'POST',
      cuerpo: { to_owner_id: destino },
    });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onCerrar();
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Reasignar a otro vendedor"
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="dialogo" onClick={reasignar} disabled={guardando || !destino}>
            {guardando ? 'Guardando…' : 'Reasignar'}
          </Button>
        </>
      }
    >
      <Desplegable
        etiqueta="Vendedor"
        obligatorio
        valor={destino}
        onCambio={setDestino}
        vacio="Elige un vendedor"
        opciones={vendedores.map((v) => ({ valor: v.id, texto: v.full_name }))}
      />
      <p className="mt-s3 text-secundario text-neutro-800">
        Se traspasarán también sus oportunidades y su historial.
      </p>
      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/**
 * Archivar cliente. Solo supervisor.
 * No dice «eliminar». No advierte de que es irreversible, porque no lo es.
 */
export function ModalArchivar({
  abierto,
  clienteId,
  onCerrar,
}: {
  abierto: boolean;
  clienteId: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  async function archivar() {
    if (guardando) return;
    setGuardando(true);
    setError(null);

    const r = await llamar(`/api/customers/${clienteId}/archive`, { metodo: 'POST' });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onCerrar();
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Archivar cliente"
      onCerrar={onCerrar}
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="dialogo" onClick={archivar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Archivar'}
          </Button>
        </>
      }
    >
      <p className="text-cuerpo text-tinta">
        El cliente dejará de aparecer en las listas. Su historial se conserva y puedes
        desarchivarlo cuando quieras.
      </p>
      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}
