import 'server-only';

import crypto from 'node:crypto';

/**
 * Firma HMAC entre la aplicación y n8n.  TECHNICAL_SPEC §8, capa 3.
 *
 * Cadena que se firma:  `${timestamp}.${nonce}.${cuerpoCrudo}`
 *
 * Cabeceras de toda petición firmada:
 *   x-crm123-timestamp   segundos Unix
 *   x-crm123-nonce       UUID v4 único de esta petición
 *   x-crm123-signature   `sha256=` + HMAC en hexadecimal
 *
 * ── Las tres reglas grabadas en piedra ────────────────────────────────
 *
 * 1. `crypto.timingSafeEqual`, NUNCA `===`. Comparar cadenas con `===` se
 *    detiene en el primer carácter distinto, y esa diferencia de microsegundos
 *    permite adivinar la firma byte a byte (CLAUDE.md regla 9).
 *
 * 2. El cuerpo se lee CRUDO con `await req.text()` y se firma esa cadena
 *    exacta. Si se hiciera `JSON.parse` y luego `JSON.stringify`, el orden de
 *    las claves o el espaciado cambiarían y la firma no cuadraría.
 *
 * 3. Ventana de 5 minutos + nonce de un solo uso: una petición capturada
 *    caduca enseguida, y dentro de la ventana tampoco puede reenviarse.
 *
 * Este módulo exige el runtime de Node: `node:crypto` no existe en el entorno
 * de borde. Por eso los manejadores que lo usan declaran
 * `export const runtime = 'nodejs'` (CLAUDE.md §8).
 */

const VENTANA_SEGUNDOS = 300; // 5 minutos
const NONCE_VIDA_MS = 10 * 60 * 1000; // 10 minutos

export function firmar(timestamp: string, nonce: string, cuerpoCrudo: string, secreto: string) {
  const hmac = crypto
    .createHmac('sha256', secreto)
    .update(`${timestamp}.${nonce}.${cuerpoCrudo}`, 'utf8')
    .digest('hex');
  return `sha256=${hmac}`;
}

/**
 * Nonces ya usados.
 *
 * ⚠ LIMITACIÓN CONOCIDA — en memoria del proceso, igual que el límite de
 * intentos de ingreso. Con varias instancias de función activas, un reenvío
 * que caiga en otra instancia no se detectaría por el nonce.
 *
 * Las otras dos defensas siguen en pie: la firma y la ventana de 5 minutos.
 * Para que el nonce fuera absoluto haría falta un almacén compartido, y esa
 * decisión no está en ningún documento: queda anotada, no inventada.
 */
const nonces = new Map<string, number>();

function nonceYaUsado(nonce: string): boolean {
  const ahora = Date.now();

  if (nonces.size > 5000) {
    for (const [k, expira] of nonces) if (expira <= ahora) nonces.delete(k);
  }

  const expira = nonces.get(nonce);
  if (expira && expira > ahora) return true;

  nonces.set(nonce, ahora + NONCE_VIDA_MS);
  return false;
}

export type ResultadoVerificacion =
  | { valido: true }
  | { valido: false; motivo: 'faltan_cabeceras' | 'fuera_de_ventana' | 'nonce_repetido' | 'firma_invalida' };

/**
 * Verifica una petición firmada. Devuelve el motivo para el REGISTRO del
 * servidor; a quien llama se le responde siempre el mismo `401
 * invalid_signature`, sin decirle en qué falló.
 */
export function verificar(
  cabeceras: Headers,
  cuerpoCrudo: string,
  secreto: string,
): ResultadoVerificacion {
  const ts = cabeceras.get('x-crm123-timestamp');
  const nonce = cabeceras.get('x-crm123-nonce');
  const recibida = cabeceras.get('x-crm123-signature');

  if (!ts || !nonce || !recibida) return { valido: false, motivo: 'faltan_cabeceras' };

  const edad = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(edad) || edad > VENTANA_SEGUNDOS) {
    return { valido: false, motivo: 'fuera_de_ventana' };
  }

  const esperada = firmar(ts, nonce, cuerpoCrudo, secreto);

  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);

  // Longitudes distintas: `timingSafeEqual` lanzaría. Se comprueba antes,
  // pero se compara igualmente contra sí misma para no filtrar la diferencia
  // por el tiempo de respuesta.
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return { valido: false, motivo: 'firma_invalida' };
  }

  // OBLIGATORIO timingSafeEqual. Jamás `===`.
  if (!crypto.timingSafeEqual(a, b)) return { valido: false, motivo: 'firma_invalida' };

  // El nonce se consume DESPUÉS de validar la firma: si se consumiera antes,
  // cualquiera podría quemar nonces ajenos mandando basura.
  if (nonceYaUsado(nonce)) return { valido: false, motivo: 'nonce_repetido' };

  return { valido: true };
}

/** Cabeceras firmadas para una llamada saliente a n8n. */
export function cabecerasFirmadas(cuerpoCrudo: string, secreto: string): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  return {
    'Content-Type': 'application/json',
    'x-crm123-timestamp': timestamp,
    'x-crm123-nonce': nonce,
    'x-crm123-signature': firmar(timestamp, nonce, cuerpoCrudo, secreto),
  };
}
