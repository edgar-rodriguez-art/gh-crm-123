import 'server-only';
import { z } from 'zod';

/**
 * Validación de las variables de entorno.  TECHNICAL_SPEC §10.
 *
 * «Fallar al arrancar es mucho mejor que fallar a las 07:30 de un martes.»
 *
 * Dos matices respecto al esquema literal de TECHNICAL_SPEC §10, ambos
 * ordenados por BUILD_PLAN, que es quien manda sobre el orden de construcción:
 *
 *  1. `N8N_SHARED_SECRET` y `N8N_WEBHOOK_MORNING_DIGEST_URL` son OPCIONALES
 *     hasta el Hito 4.  BUILD_PLAN §2.1: «no hacen falta todavía […] lib/env.ts
 *     las marca como opcionales hasta entonces».  En el Hito 4 se cambia
 *     HITO_ACTUAL a 4 y pasan a ser obligatorias con su forma exacta
 *     (64 hexadecimales y URL).
 *
 *  2. `APP_BASE_URL` es opcional y cae en `VERCEL_URL` si no está.  Es la
 *     circularidad que describe BUILD_PLAN §2.3 nota: hace falta desplegar
 *     para conocer la URL.  Sin este respaldo, el PRIMER despliegue del
 *     Hito 2 no arrancaría nunca y no habría URL que copiar.
 *
 * La validación es perezosa a propósito: si se ejecutara al importar el
 * módulo, `next build` fallaría en una máquina sin variables. El arranque real
 * lo cubre `assertEnv()`, que llaman los `instrumentation.ts` de cada
 * aplicación — ahí sí, el proceso no levanta si falta algo.
 */

const HITO_ACTUAL = 2;

const secretoN8n = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'Deben ser 64 caracteres hexadecimales (openssl rand -hex 32)');

/**
 * La URL del proyecto, y SOLO la del proyecto: `https://xxxx.supabase.co`.
 *
 * En la pantalla de Supabase → Settings → API hay dos direcciones muy
 * parecidas, una encima de otra: la «Project URL» y la de la API de datos,
 * que ya termina en `/rest/v1`. Si se copia la segunda, el cliente le añade
 * su propio `/rest/v1` y acaba pidiendo `…/rest/v1/rest/v1/profiles`.
 * PostgREST responde `PGRST125 Invalid path specified in request URL`, un
 * error que no se parece en nada a su causa y que cuesta horas encontrar.
 *
 * `z.string().url()` acepta esa URL sin rechistar, así que se comprueba
 * además que no lleve ruta, ni parámetros, ni ancla.
 */
const urlDeProyecto = z
  .string()
  .url()
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return (u.pathname === '' || u.pathname === '/') && !u.search && !u.hash;
      } catch {
        return false;
      }
    },
    {
      message:
        'Debe ser solo la Project URL, sin nada detrás del dominio ' +
        '(https://xxxx.supabase.co). Si acaba en /rest/v1 has copiado la ' +
        'dirección de la API de datos, que está justo al lado en Supabase → ' +
        'Settings → API.',
    },
  );

const base = {
  NEXT_PUBLIC_SUPABASE_URL: urlDeProyecto,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  APP_TIMEZONE: z.literal('Europe/Madrid'),
  APP_LOCALE: z.literal('es-ES'),
  APP_CURRENCY: z.literal('EUR'),
  APP_BASE_URL: z.string().url().optional(),
};

const schema =
  HITO_ACTUAL >= 4
    ? z.object({
        ...base,
        N8N_SHARED_SECRET: secretoN8n,
        N8N_WEBHOOK_MORNING_DIGEST_URL: z.string().url(),
      })
    : z.object({
        ...base,
        N8N_SHARED_SECRET: secretoN8n.optional(),
        N8N_WEBHOOK_MORNING_DIGEST_URL: z.string().url().optional(),
      });

export type Env = z.infer<typeof schema> & { APP_BASE_URL: string };

/** Dónde se obtiene cada valor. Se imprime cuando falta alguno. */
const DONDE: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase → Settings → API → Project URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase → Settings → API → Project API keys → anon public',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase → Settings → API → Project API keys → service_role → Reveal',
  APP_BASE_URL: 'La URL que Vercel asigna tras el primer despliegue, sin barra final',
  APP_TIMEZONE: 'Se escribe tal cual: Europe/Madrid',
  APP_LOCALE: 'Se escribe tal cual: es-ES',
  APP_CURRENCY: 'Se escribe tal cual: EUR',
  N8N_SHARED_SECRET: 'Se genera con: openssl rand -hex 32 (Hito 4)',
  N8N_WEBHOOK_MORNING_DIGEST_URL: 'n8n → nodo Webhook → Production URL (Hito 4)',
};

let cache: Env | null = null;

export function env(): Env {
  if (cache) return cache;

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((i) => {
        const nombre = String(i.path[0] ?? '(desconocida)');
        return `  · ${nombre}: ${i.message}\n    Dónde se obtiene: ${DONDE[nombre] ?? '—'}`;
      })
      .join('\n');

    throw new Error(
      `CRM-123 no puede arrancar: faltan variables de entorno o su valor no es válido.\n${detalle}\n\n` +
        'Ponlas en Vercel → Settings → Environment Variables (Production, Preview y Development) ' +
        'y vuelve a desplegar. Las variables no se aplican al despliegue anterior.',
    );
  }

  // La circularidad de BUILD_PLAN §2.3: sin APP_BASE_URL, se usa la que Vercel
  // inyecta sola. En local, el servidor de desarrollo.
  const baseUrl =
    parsed.data.APP_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  cache = { ...parsed.data, APP_BASE_URL: baseUrl.replace(/\/$/, '') };
  return cache;
}

/** Llamado desde `instrumentation.ts`: el proceso no levanta si falta algo. */
export function assertEnv(): void {
  env();
  if (HITO_ACTUAL < 4 && !process.env.APP_BASE_URL) {
    console.warn(
      '[CRM-123] APP_BASE_URL no está configurada. Se usa la URL que asigna Vercel. ' +
        'Ponla en Vercel con la URL real del despliegue y vuelve a desplegar (BUILD_PLAN §2.4).',
    );
  }
}
