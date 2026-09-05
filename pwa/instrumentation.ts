/**
 * Next ejecuta `register()` una sola vez, al levantar el proceso.
 *
 * Es el sitio donde TECHNICAL_SPEC §10 quiere la comprobación: si falta una
 * variable, la aplicación NO ARRANCA y el registro dice cuál falta y dónde
 * se obtiene. «Fallar al arrancar es mucho mejor que fallar a las 07:30 de
 * un martes.»
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('@crm123/core/env');
    assertEnv();
  }
}
