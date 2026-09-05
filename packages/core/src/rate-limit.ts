import 'server-only';

/**
 * Límite de intentos de ingreso.  TECHNICAL_SPEC §7.1 y BUILD_PLAN §2.2:
 * 10 intentos cada 15 minutos por IP → `429 too_many_attempts`.
 * DESIGN_BRIEF §8.1 lo muestra como «Demasiados intentos. Espera unos minutos.»
 *
 * ⚠ LIMITACIÓN CONOCIDA — en memoria del proceso.
 *
 * Vercel ejecuta funciones sin estado compartido: cada instancia lleva su
 * propia cuenta, así que con varias instancias activas el límite efectivo es
 * mayor que 10. Frena el ataque torpe y el reintento nervioso, que es para lo
 * que está en este hito, pero NO es un control de fuerza bruta serio.
 *
 * Para que lo sea hace falta un almacén compartido. La decisión no está en
 * ningún documento, así que no se inventa aquí: queda anotada para que el
 * humano decida (Upstash/Redis, o una tabla — pero una tabla nueva tocaría
 * SCRIPTS-SQL.md, que es inmutable, así que sería un almacén externo).
 */

const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO = 10;

type Cuenta = { intentos: number; expira: number };

const cuentas = new Map<string, Cuenta>();

function limpiar(ahora: number) {
  for (const [k, v] of cuentas) if (v.expira <= ahora) cuentas.delete(k);
}

export type ResultadoLimite = {
  permitido: boolean;
  /** Segundos que faltan para poder reintentar. Solo si `permitido` es falso. */
  reintentarEn: number;
};

/** Cuenta un intento. Llamar ANTES de comprobar la credencial. */
export function registrarIntento(clave: string): ResultadoLimite {
  const ahora = Date.now();
  if (cuentas.size > 5000) limpiar(ahora);

  const actual = cuentas.get(clave);

  if (!actual || actual.expira <= ahora) {
    cuentas.set(clave, { intentos: 1, expira: ahora + VENTANA_MS });
    return { permitido: true, reintentarEn: 0 };
  }

  actual.intentos += 1;

  if (actual.intentos > MAXIMO) {
    return { permitido: false, reintentarEn: Math.ceil((actual.expira - ahora) / 1000) };
  }

  return { permitido: true, reintentarEn: 0 };
}

/** Un ingreso correcto borra la cuenta: el límite castiga fallos, no usos. */
export function olvidarIntentos(clave: string): void {
  cuentas.delete(clave);
}

/**
 * IP del cliente. En Vercel llega en `x-forwarded-for`; el primer valor es el
 * cliente real y el resto son los proxies por los que pasó.
 */
export function ipDe(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const primera = xff.split(',')[0]?.trim();
    if (primera) return primera;
  }
  return request.headers.get('x-real-ip')?.trim() || 'desconocida';
}
