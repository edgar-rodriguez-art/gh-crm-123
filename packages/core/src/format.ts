/**
 * Formatos de pantalla.  DESIGN_BRIEF §5 · CLAUDE.md §5 «Al escribir código».
 *
 * Todo en `es-ES` y `Europe/Madrid`, SIEMPRE explícito. Nunca la zona horaria
 * del servidor ni la del navegador: un vendedor en Canarias y un servidor en
 * Virginia tienen que ver el mismo «Para hoy» que la vista de Postgres.
 */

export const ZONA = 'Europe/Madrid';
export const LOCALE = 'es-ES';

/** `1.250,00 €`. Con `decimales = false`, `1.250 €` para listas densas. */
export function eur(n: number | null | undefined, decimales = true): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimales ? 2 : 0,
    maximumFractionDigits: decimales ? 2 : 0,
    // Sin esto, `es-ES` deja 1000 como «1000»: no agrupa hasta 5 cifras.
    useGrouping: 'always',
  }).format(n);
}

/**
 * `68,3 %`. Sin cuota fijada devuelve `—`, NUNCA `0 %`.
 * Regla R8 de CLAUDE.md §6 y DESIGN_BRIEF §5.
 */
export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n)} %`;
}

function partes(v: string | Date): Record<string, string> {
  const d = typeof v === 'string' ? new Date(v) : v;
  const fmt = new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** `04/09/2026` */
export function fdate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const p = partes(v);
  return `${p.day}/${p.month}/${p.year}`;
}

/** `02/09` */
export function fdm(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const p = partes(v);
  return `${p.day}/${p.month}`;
}

/** `07:30`, 24 h */
export function ftime(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const p = partes(v);
  return `${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

/** `05/09 10:00` */
export function fdmhm(v: string | Date | null | undefined): string {
  if (!v) return '—';
  return `${fdm(v)} ${ftime(v)}`;
}

/** Día del calendario de Madrid, como `aaaa-mm-dd`. Para comparar fechas. */
export function diaMadrid(v: string | Date = new Date()): string {
  const p = partes(v);
  return `${p.year}-${p.month}-${p.day}`;
}

/** `Hoy` · `Ayer` · `Hace 3 días`. Preferido en el historial (DESIGN_BRIEF §5). */
export function frel(v: string | Date | null | undefined, ahora: Date = new Date()): string {
  if (!v) return '—';
  const dias = diasEntre(v, ahora);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
}

/** Días de calendario (Madrid) transcurridos entre `v` y `ahora`. */
export function diasEntre(v: string | Date, ahora: string | Date = new Date()): number {
  const a = Date.parse(`${diaMadrid(v)}T00:00:00Z`);
  const b = Date.parse(`${diaMadrid(ahora)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** `4 días`, con la unidad (DESIGN_BRIEF §5). */
export function fdias(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n} ${n === 1 ? 'día' : 'días'}`;
}

/**
 * `+34 612 345 678` — tres bloques (DESIGN_BRIEF §5).
 * Espera el valor ya normalizado a E.164; si no lo reconoce, lo devuelve tal cual.
 */
export function fphone(p: string | null | undefined): string {
  if (!p) return '—';
  const m = /^\+34(\d{3})(\d{3})(\d{3})$/.exec(p.replace(/\s+/g, ''));
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : p;
}

/** `Buenos días` · `Buenas tardes` · `Buenas noches`, en hora de Madrid. */
export function saludo(ahora: Date = new Date()): string {
  const h = Number(partes(ahora).hour ?? '0');
  if (h < 6) return 'Buenas noches';
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

/** `viernes, 4 de septiembre de 2026` — cabecera del tablero. */
export function fdateLarga(v: string | Date = new Date()): string {
  const d = typeof v === 'string' ? new Date(v) : v;
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}
