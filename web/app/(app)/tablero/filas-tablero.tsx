'use client';

import * as React from 'react';
import Link from 'next/link';
import { eur, ftime } from '@crm123/core/format';
import type { Database } from '@crm123/core/types';
import { Button } from '@/components/ui/button';
import { EtiquetaEtapa, MotivoAtraso } from '@/components/piezas';
import { ModalActividad } from '@/components/modales-oportunidad';

export type FilaTablero = {
  opportunity_id: string;
  customer_id: string;
  customer_name: string;
  customer_company: string | null;
  stage: Database['public']['Enums']['opportunity_stage'];
  estimated_amount: number;
  next_action_at: string | null;
  days_without_activity: number | null;
  is_overdue: boolean;
};

/**
 * Las filas de los bloques «Atrasadas» y «Para hoy».  DESIGN_BRIEF §8.3.
 *
 * Rejilla de pistas FIJAS —`minmax(0,1fr) 132px 96px`— con dos áreas, para
 * que todas las filas midan exactamente lo mismo (82 px) tengan o no motivo
 * de atraso. El bloque del nombre lleva `min-height: 36px` por eso mismo:
 * un cliente sin empresa no debe encoger su fila.
 *
 * El botón «Registrar actividad» abre una VENTANA, no navega: el vendedor
 * despacha las siete atrasadas sin salir de la pantalla (flujo F1).
 */
export function FilasTablero({
  filas,
  modo,
}: {
  filas: FilaTablero[];
  modo: 'atrasadas' | 'hoy';
}) {
  const [actividadDe, setActividadDe] = React.useState<FilaTablero | null>(null);

  return (
    <>
      <ul>
        {filas.map((f) => (
          <li
            key={f.opportunity_id}
            className="grid h-[82px] items-center gap-x-s4 gap-y-s1 border-b border-filete
                       px-s3 last:border-b-0"
            style={{
              gridTemplateColumns: 'minmax(0,1fr) 132px 96px auto',
              gridTemplateAreas: '"nombre etapa importe acciones" "motivo motivo motivo acciones"',
            }}
          >
            <div style={{ gridArea: 'nombre' }} className="min-h-[36px] min-w-0">
              <Link
                href={`/clientes/${f.customer_id}`}
                className="block truncate font-semibold text-tinta hover:underline
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-marca"
              >
                {f.customer_name}
              </Link>
              {f.customer_company ? (
                <span className="block truncate text-secundario text-neutro-700">
                  {f.customer_company}
                </span>
              ) : null}
            </div>

            <div style={{ gridArea: 'etapa' }}>
              <EtiquetaEtapa etapa={f.stage} />
            </div>

            <div style={{ gridArea: 'importe' }} className="text-right text-cuerpo">
              {eur(f.estimated_amount, false)}
            </div>

            <div style={{ gridArea: 'motivo' }} className="min-w-0 truncate">
              {modo === 'atrasadas' ? (
                <MotivoAtraso
                  esVencida={f.is_overdue}
                  proximaAccion={f.next_action_at}
                  diasSinActividad={f.days_without_activity}
                />
              ) : (
                // «Para hoy» muestra la hora, sin color de alarma: está bajo control.
                <span className="text-secundario text-neutro-800">
                  Hoy a las {ftime(f.next_action_at)}
                </span>
              )}
            </div>

            <div style={{ gridArea: 'acciones' }} className="flex items-center gap-s2">
              <Button size="sm" onClick={() => setActividadDe(f)}>
                Registrar actividad
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/clientes/${f.customer_id}`}>Abrir</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ModalActividad
        abierto={actividadDe !== null}
        oportunidadId={actividadDe?.opportunity_id ?? null}
        nombreCliente={actividadDe?.customer_name}
        onCerrar={() => setActividadDe(null)}
      />
    </>
  );
}
