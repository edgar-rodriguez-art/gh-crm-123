/**
 * Cliente de la API, para los componentes de navegador.
 *
 * Devuelve siempre la misma forma, así que ninguna pantalla tiene que
 * acordarse de mirar `res.ok`: si `ok` es falso hay `error` y `message`, y ese
 * `message` es el texto que ya viene escrito para una persona
 * (TECHNICAL_SPEC §7 y §12). Nunca se inventa un mensaje aquí.
 */
export type Respuesta<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string; message: string; extra: Record<string, unknown> };

export async function llamar<T>(
  url: string,
  opciones: { metodo?: 'GET' | 'POST' | 'PATCH'; cuerpo?: unknown } = {},
): Promise<Respuesta<T>> {
  const { metodo = 'GET', cuerpo } = opciones;

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });

    const texto = await res.text();
    const datos = texto ? (JSON.parse(texto) as Record<string, unknown>) : {};

    if (!res.ok) {
      const { error, message, ...extra } = datos as {
        error?: string;
        message?: string;
      } & Record<string, unknown>;
      return {
        ok: false,
        error: error ?? 'internal_error',
        message: message ?? 'Algo ha fallado. Vuelve a intentarlo.',
        extra,
      };
    }

    return { ok: true, datos: datos as T };
  } catch {
    return {
      ok: false,
      error: 'network',
      message: 'Algo ha fallado. Vuelve a intentarlo.',
      extra: {},
    };
  }
}
