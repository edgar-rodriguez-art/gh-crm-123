import { NextResponse } from 'next/server';

/**
 * Forma única de los errores de la API.  TECHNICAL_SPEC §7 y §12.
 *
 *   { "error": "codigo_maquina", "message": "Texto para la persona" }
 *
 * `message` es lo que lee una persona sin perfil técnico. Nunca lleva el
 * mensaje crudo de Postgres, ni un código de restricción, ni una traza
 * (TECHNICAL_SPEC §12). El detalle va al registro del servidor.
 */

export type CuerpoError = { error: string; message?: string } & Record<string, unknown>;

export function jsonError(
  status: number,
  error: string,
  message?: string,
  extra: Record<string, unknown> = {},
): NextResponse<CuerpoError> {
  return NextResponse.json({ error, ...(message ? { message } : {}), ...extra }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(
  data: T,
  status = 200,
): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * Registra el detalle técnico en el servidor. Nunca viaja al navegador.
 * Los registros JAMÁS contienen la clave de servicio, el secreto compartido,
 * contraseñas ni teléfonos completos (TECHNICAL_SPEC §12).
 */
export function registrarFallo(contexto: string, e: unknown): void {
  const detalle = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  console.error(`[CRM-123] ${contexto} — ${detalle}`);
}
