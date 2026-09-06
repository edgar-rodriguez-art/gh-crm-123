/**
 * Next ejecuta `register()` una sola vez, al levantar el proceso.
 *
 * Es el sitio donde TECHNICAL_SPEC §10 quiere la comprobación: si falta una
 * variable, la aplicación NO ARRANCA y el registro dice cuál falta y dónde
 * se obtiene. «Fallar al arrancar es mucho mejor que fallar a las 07:30 de
 * un martes.»
 *
 * ── OJO: esto depende de una bandera de `next.config.mjs` ──────────────
 * En Next 14 este archivo NO SE EJECUTA a menos que la configuración lleve
 * `experimental.instrumentationHook: true`. Sin esa línea el archivo se queda
 * aquí con toda la apariencia de funcionar y no comprueba nada. Es
 * exactamente lo que pasó entre el Hito 2 y el Hito 4: la comprobación de
 * arranque estuvo muerta sin que se notara, porque una comprobación que no
 * se ejecuta nunca se queja.
 *
 * Si algún día hay que quitar la bandera, hay que quitar también este
 * archivo. Si no, vuelve a mentir.
 *
 * Comprobado: `next build` NO llama a `register()`, así que la compilación
 * sigue funcionando en una máquina sin variables. La comprobación ocurre al
 * arrancar el servidor, que es donde tiene sentido.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('@crm123/core/env');
    assertEnv();
  }
}
