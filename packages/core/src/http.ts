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
  console.error(`[CRM-123] ${contexto} — ${describir(e)}`);
}

/**
 * Los errores de Supabase NO son `Error`: son objetos planos con `message`,
 * `code`, `details` y `hint`. Pasarlos por `String()` da «[object Object]»,
 * que es peor que no registrar nada porque parece un registro útil.
 */
function describir(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;

  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const partes = [
      typeof o.message === 'string' ? o.message : null,
      typeof o.code === 'string' ? `code=${o.code}` : null,
      typeof o.details === 'string' && o.details ? `details=${o.details}` : null,
      typeof o.hint === 'string' && o.hint ? `hint=${o.hint}` : null,
    ].filter(Boolean);

    if (partes.length > 0) return partes.join(' · ');

    try {
      return JSON.stringify(e);
    } catch {
      return '(objeto no serializable)';
    }
  }

  return String(e);
}
