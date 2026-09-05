import type { Database } from './types/database';

/**
 * Enumeración → etiqueta en pantalla.
 *
 * Copiado literalmente de la tabla «Traducción de valores para la interfaz»
 * de SCRIPTS-SQL.md §5, que es normativa. Las etiquetas también son
 * obligatorias según DESIGN_BRIEF §4 y «no se traducen de otra manera».
 *
 * Este archivo existe para que ninguna pantalla invente un texto. Si una
 * etiqueta no está aquí, no existe.
 */

type E = Database['public']['Enums'];

export const ROL: Record<E['user_role'], string> = {
  seller: 'Vendedor',
  supervisor: 'Supervisor',
};

export const CANAL: Record<E['customer_source'], string> = {
  physical_store: 'Tienda física',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  trade_show: 'Feria / showroom',
  referral: 'Referido',
  inbound_call: 'Llamada entrante',
  other: 'Otro',
};

export const ETAPA: Record<E['opportunity_stage'], string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  proposal_sent: 'Propuesta enviada',
  negotiation: 'Negociación',
  closed: 'Cerrado',
};

export const ESTADO: Record<E['opportunity_status'], string> = {
  open: 'Abierta',
  won: 'Ganada',
  lost: 'Perdida',
};

export const MOTIVO_PERDIDA: Record<E['loss_reason'], string> = {
  price: 'Precio',
  no_response: 'No responde',
  bought_from_competitor: 'Compró a la competencia',
  no_budget: 'Sin presupuesto',
  bad_timing: 'No era el momento',
  cancellation: 'Cancelación',
  other: 'Otro',
};

export const TIPO_ACTIVIDAD: Record<E['activity_type'], string> = {
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Email',
  visit: 'Visita',
  note: 'Nota',
};

/**
 * Textos de error y de estado que el diseño fija palabra por palabra.
 * Se centralizan para que no puedan divergir entre pantallas: DESIGN_BRIEF
 * §8.1 exige que el error de ingreso sea IDÉNTICO en los tres casos de fallo,
 * y esa igualdad se rompe sola en cuanto el texto se escribe dos veces.
 */
export const TEXTO = {
  credencialesInvalidas: 'Usuario o contraseña incorrectos.',
  demasiadosIntentos: 'Demasiados intentos. Espera unos minutos.',
  olvidoContrasena: 'Si has olvidado tu contraseña, pídesela a tu supervisor.',
  sinPermiso: 'No tienes permiso para ver esto.',
  soloSupervisores: 'Esta aplicación es solo para supervisores. Entra desde el escritorio.',
  errorGenerico: 'Algo ha fallado. Vuelve a intentarlo.',
  noEncontrado: 'No hemos encontrado lo que buscas.',
  peticionInvalida: 'No hemos podido procesar la petición.',
  sinPermisoAccion: 'No tienes permiso para esta acción.',
  esperaUnosMinutos: 'Espera unos minutos antes de reintentar.',
  importesSinIva: 'Importes sin IVA',
} as const;
