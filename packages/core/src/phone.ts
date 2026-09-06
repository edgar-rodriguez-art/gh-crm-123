/**
 * Normalización del teléfono a E.164 español.  TECHNICAL_SPEC §4 R2.
 *
 *   · Se eliminan espacios, guiones y paréntesis.
 *   · Si empieza por 6, 7, 8 o 9 y tiene 9 dígitos, se antepone `+34`.
 *   · Si empieza por `0034` o `34`, se sustituye por `+34`.
 *   · El resultado debe cumplir `^\+34[6-9]\d{8}$`. Si no, se rechaza.
 *
 * ── Por qué esto vive en un solo sitio ────────────────────────────────
 * El teléfono es el identificador único del cliente en todo el sistema
 * (`customers_phone_uk`). Si el formulario normalizara de una manera y la
 * comprobación de duplicados de otra, `612 345 678` y `+34612345678` serían
 * dos clientes distintos para la aplicación y el mismo para la base: el
 * índice único saltaría con un error que nadie sabría explicar.
 *
 * Por eso la comparación de duplicados se hace SIEMPRE sobre el valor
 * normalizado, y ese valor sale siempre de aquí.
 */

export const PATRON_E164_ES = /^\+34[6-9]\d{8}$/;

export type ResultadoTelefono =
  | { ok: true; telefono: string }
  | { ok: false; mensaje: string };

/** Quita todo lo que no sea dígito o el `+` inicial. */
function limpiar(entrada: string): string {
  const s = entrada.trim().replace(/[\s\-().]/g, '');
  return s.startsWith('+') ? `+${s.slice(1).replace(/\D/g, '')}` : s.replace(/\D/g, '');
}

export function normalizarTelefono(entrada: string | null | undefined): ResultadoTelefono {
  const invalido = {
    ok: false as const,
    mensaje: 'El teléfono debe ser un móvil o fijo español válido.',
  };

  if (!entrada) return invalido;

  let s = limpiar(entrada);
  if (!s) return invalido;

  if (s.startsWith('0034')) s = `+34${s.slice(4)}`;
  else if (s.startsWith('+34')) s = `+34${s.slice(3)}`;
  else if (s.startsWith('34') && s.length === 11) s = `+34${s.slice(2)}`;
  else if (/^[6-9]\d{8}$/.test(s)) s = `+34${s}`;

  return PATRON_E164_ES.test(s) ? { ok: true, telefono: s } : invalido;
}
