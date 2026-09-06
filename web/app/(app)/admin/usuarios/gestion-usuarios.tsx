'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ROL } from '@crm123/core/labels';
import { fdate, frel } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/dialogo';
import { CampoImporte, CampoTexto, Desplegable, aNumero } from '@/components/campos';
import { llamar } from '@/lib/api';
import { cn } from '@/lib/utils';

type Rol = Database['public']['Enums']['user_role'];

export type Usuario = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: Rol;
  is_active: boolean;
  created_at: string;
  deactivated_at: string | null;
};

/**
 * Administración › Usuarios.  DESIGN_BRIEF §8.8.
 *
 * ── La palabra que no aparece ─────────────────────────────────────────
 * No hay «eliminar» en ningún sitio. La acción es **Desactivar**, y su
 * contraria **Reactivar**. Un usuario desactivado no puede entrar, pero su
 * cartera sigue visible para el supervisor y se puede reasignar (R7).
 */
export function GestionUsuarios({
  usuarios,
  yoId,
}: {
  usuarios: Usuario[];
  yoId: string;
}) {
  const router = useRouter();
  const [nuevoAbierto, setNuevoAbierto] = React.useState(false);
  const [credenciales, setCredenciales] = React.useState<{
    username: string;
    full_name: string;
    password: string;
  } | null>(null);
  const [ocupado, setOcupado] = React.useState<string | null>(null);

  async function accion(id: string, ruta: string) {
    if (ocupado) return;
    setOcupado(id);
    const r = await llamar<{ password_shown_once?: string; username?: string; full_name?: string }>(
      `/api/admin/users/${id}/${ruta}`,
      { metodo: 'POST' },
    );
    setOcupado(null);

    if (r.ok && r.datos.password_shown_once) {
      setCredenciales({
        username: r.datos.username ?? '',
        full_name: r.datos.full_name ?? '',
        password: r.datos.password_shown_once,
      });
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-s3 flex justify-end">
        <Button onClick={() => setNuevoAbierto(true)}>+ Nuevo usuario</Button>
      </div>

      <div className="overflow-x-auto rounded border border-filete bg-superficie">
        <table className="w-full border-collapse text-tabla" style={{ minWidth: 900 }}>
          <thead>
            <tr className="border-b border-filete">
              {['Usuario', 'Nombre', 'Email', 'Rol', 'Estado', 'Alta', 'Acciones'].map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="px-s2 py-s1 text-left text-rotulo uppercase text-neutro-700"
                >
                  {c === 'Acciones' ? <span className="sr-only">{c}</span> : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr
                key={u.id}
                className={cn(
                  'h-fila border-b border-filete last:border-b-0',
                  i % 2 === 1 && 'bg-neutro-100',
                )}
              >
                <td className="px-s2 font-semibold">{u.username}</td>
                <td className="px-s2">{u.full_name}</td>
                <td className="max-w-[220px] truncate px-s2 text-neutro-800">{u.email}</td>
                <td className="px-s2">{ROL[u.role]}</td>
                <td className="px-s2">
                  <span
                    className={
                      u.is_active ? 'text-tinta' : 'font-semibold text-neutro-500'
                    }
                  >
                    {u.is_active ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-s2 text-neutro-800">{fdate(u.created_at)}</td>
                <td className="px-s2">
                  <div className="flex flex-wrap gap-s2">
                    <Button
                      variant="link"
                      size="sm"
                      disabled={ocupado === u.id}
                      onClick={() => accion(u.id, 'reset-password')}
                    >
                      Restablecer contraseña
                    </Button>
                    {u.is_active ? (
                      <Button
                        variant="link"
                        size="sm"
                        // Desactivarse a uno mismo dejaría el CRM sin supervisor.
                        disabled={ocupado === u.id || u.id === yoId}
                        title={u.id === yoId ? 'No puedes desactivar tu propia cuenta.' : undefined}
                        onClick={() => accion(u.id, 'deactivate')}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        variant="link"
                        size="sm"
                        disabled={ocupado === u.id}
                        onClick={() => accion(u.id, 'activate')}
                      >
                        Reactivar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalNuevoUsuario
        abierto={nuevoAbierto}
        onCerrar={() => setNuevoAbierto(false)}
        onCreado={(c) => setCredenciales(c)}
      />

      {credenciales ? (
        <PantallaCredenciales
          credenciales={credenciales}
          onCerrar={() => setCredenciales(null)}
        />
      ) : null}
    </>
  );
}

/** Ventana de alta.  DESIGN_BRIEF §8.8. */
function ModalNuevoUsuario({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: (c: { username: string; full_name: string; password: string }) => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = React.useState('');
  const [usuario, setUsuario] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [rol, setRol] = React.useState<Rol | ''>('seller');
  const [password, setPassword] = React.useState('');
  const [meta, setMeta] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (abierto) {
      setNombre('');
      setUsuario('');
      setEmail('');
      setRol('seller');
      setPassword('');
      setMeta('');
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  const usuarioValido = /^[a-z0-9._-]{3,32}$/.test(usuario);
  const puedeCrear =
    !guardando &&
    nombre.trim().length >= 2 &&
    usuarioValido &&
    email.includes('@') &&
    rol !== '' &&
    password.length >= 10;

  async function generar() {
    // La contraseña la genera el SERVIDOR, no el navegador: aquí se pide una
    // de usar y tirar al mismo endpoint que las restablece.
    const r = await llamar<{ password: string }>('/api/admin/users/generate-password');
    if (r.ok) setPassword(r.datos.password);
  }

  async function crear() {
    if (!puedeCrear) return;
    setGuardando(true);
    setError(null);

    const r = await llamar<{
      username: string;
      full_name: string;
      password_shown_once: string;
    }>('/api/admin/users', {
      metodo: 'POST',
      cuerpo: {
        username: usuario,
        full_name: nombre.trim(),
        email: email.trim(),
        role: rol,
        password,
        quota_amount: aNumero(meta),
      },
    });

    if (!r.ok) {
      setError(r.message);
      setGuardando(false);
      return;
    }

    onCerrar();
    onCreado({
      username: r.datos.username,
      full_name: r.datos.full_name,
      password: r.datos.password_shown_once,
    });
    router.refresh();
  }

  return (
    <Dialogo
      abierto={abierto}
      titulo="Nuevo usuario"
      onCerrar={onCerrar}
      ancho="ancho"
      pie={
        <>
          <Button variant="outline" size="dialogo" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="dialogo" onClick={crear} disabled={!puedeCrear}>
            {guardando ? 'Guardando…' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <CampoTexto etiqueta="Nombre completo" obligatorio valor={nombre} onCambio={setNombre} />
      <CampoTexto
        className="mt-s3"
        etiqueta="Nombre de usuario"
        obligatorio
        valor={usuario}
        onCambio={(v) => setUsuario(v.toLowerCase())}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        ayuda="Minúsculas, sin espacios. Es con lo que entrará."
        error={usuario.length > 0 && !usuarioValido ? 'Solo minúsculas, números, punto, guion y guion bajo (3-32).' : null}
      />
      <CampoTexto
        className="mt-s3"
        etiqueta="Email"
        obligatorio
        type="email"
        valor={email}
        onCambio={setEmail}
        ayuda="Solo se usa para enviarle el resumen matutino. El usuario nunca lo verá."
      />
      <Desplegable
        className="mt-s3"
        etiqueta="Rol"
        obligatorio
        valor={rol}
        onCambio={setRol}
        opciones={[
          { valor: 'seller' as Rol, texto: 'Vendedor' },
          { valor: 'supervisor' as Rol, texto: 'Supervisor' },
        ]}
      />

      <div className="mt-s3 flex items-end gap-s2">
        <CampoTexto
          className="flex-1"
          etiqueta="Contraseña inicial"
          obligatorio
          valor={password}
          onCambio={setPassword}
          autoComplete="off"
          error={password.length > 0 && password.length < 10 ? 'Mínimo 10 caracteres.' : null}
        />
        <Button variant="outline" size="sm" onClick={generar}>
          Generar
        </Button>
      </div>

      <CampoImporte
        className="mt-s3"
        etiqueta="Meta de este mes"
        valor={meta}
        onCambio={setMeta}
        ayuda="Opcional. Sin meta, su avance mostrará «—»."
      />

      {error ? (
        <p role="alert" className="mt-s3 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900">
          {error}
        </p>
      ) : null}
    </Dialogo>
  );
}

/**
 * Pantalla de entrega de credenciales.
 *
 * La contraseña se muestra UNA SOLA VEZ. No está guardada en ningún sitio: lo
 * único que existe es su huella bcrypt dentro de `auth.users`. Recargar esta
 * pantalla no la recupera, y el aviso lo dice sin rodeos.
 */
function PantallaCredenciales({
  credenciales,
  onCerrar,
}: {
  credenciales: { username: string; full_name: string; password: string };
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = React.useState<'usuario' | 'contrasena' | null>(null);

  async function copiar(texto: string, cual: 'usuario' | 'contrasena') {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Sin permiso de portapapeles no se dice que se copió.
    }
  }

  return (
    <Dialogo
      abierto
      titulo="Usuario creado"
      onCerrar={onCerrar}
      pie={
        <Button size="dialogo" onClick={onCerrar}>
          Hecho
        </Button>
      }
    >
      <p className="text-cuerpo text-tinta">{credenciales.full_name}</p>

      <dl className="mt-s3 space-y-s2">
        <div>
          <dt className="text-rotulo uppercase text-neutro-700">Usuario</dt>
          <dd className="flex items-center gap-s2">
            <code className="rounded bg-neutro-200 px-s1 py-0.5 text-cuerpo">
              {credenciales.username}
            </code>
            <button
              type="button"
              onClick={() => copiar(credenciales.username, 'usuario')}
              className="rounded text-nota text-marca-700 hover:underline
                         focus-visible:outline focus-visible:outline-2
                         focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              {copiado === 'usuario' ? 'Copiado' : 'Copiar'}
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-rotulo uppercase text-neutro-700">Contraseña</dt>
          <dd className="flex items-center gap-s2">
            <code className="rounded bg-neutro-200 px-s1 py-0.5 text-cuerpo">
              {credenciales.password}
            </code>
            <button
              type="button"
              onClick={() => copiar(credenciales.password, 'contrasena')}
              className="rounded text-nota text-marca-700 hover:underline
                         focus-visible:outline focus-visible:outline-2
                         focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              {copiado === 'contrasena' ? 'Copiado' : 'Copiar'}
            </button>
          </dd>
        </div>
      </dl>

      <p
        role="alert"
        className="mt-s4 rounded border border-neutro-300 bg-neutro-200 px-s2 py-s2 text-secundario text-neutro-900"
      >
        <strong>Entrega esta contraseña al usuario en persona. No volverá a mostrarse.</strong>
        <br />
        Se le pedirá cambiarla en su primer acceso.
      </p>
    </Dialogo>
  );
}
