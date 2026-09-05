/**
 * Marcador de una pantalla que este hito todavía no construye.
 *
 * Existe para que el ARMAZÓN de navegación esté completo (BUILD_PLAN §2.2):
 * la barra lateral dibuja los enlaces de cada rol, y un enlace que lleva a un
 * 404 no es un armazón. Cada uno de estos archivos se sustituye entero por la
 * pantalla real en su hito; ninguno lleva lógica que haya que desmontar.
 */
export function PendienteDeHito({
  titulo,
  hito,
  descripcion,
}: {
  titulo: string;
  hito: 3 | 4;
  descripcion: string;
}) {
  return (
    <>
      <header>
        <h1 className="font-titulo text-h1">{titulo}</h1>
      </header>
      <div className="mt-s6 rounded border border-filete bg-superficie px-s4 py-s6">
        <p className="text-cuerpo text-tinta">{descripcion}</p>
        <p className="mt-s2 text-secundario text-neutro-800">
          Esta pantalla se construye en el Hito {hito}.
        </p>
      </div>
    </>
  );
}
