'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ModalNuevoCliente } from '@/components/modales-cliente';

/** Botón principal de cabecera + su ventana. Se usa en Tablero y Clientes. */
export function BotonNuevoCliente({ texto = '+ Nuevo cliente' }: { texto?: string }) {
  const [abierto, setAbierto] = React.useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>{texto}</Button>
      <ModalNuevoCliente abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}
