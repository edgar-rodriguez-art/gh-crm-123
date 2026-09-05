import { z } from 'zod';

/**
 * Reglas de la contraseña nueva.  TECHNICAL_SPEC §6 «Cambio de contraseña en
 * el primer ingreso» y DESIGN_BRIEF §8.2.
 *
 *   · Mínimo 10 caracteres.
 *   · No puede contener el nombre de usuario.
 *   · Se rechazan las 100 contraseñas más comunes.
 *
 * DESIGN_BRIEF §8.2 solo muestra dos requisitos al usuario (longitud y
 * usuario), así que la lista de comunes se comprueba al enviar y se explica
 * entonces: enseñar «tu contraseña es demasiado común» antes de que la
 * escriba no ayuda a nadie.
 */

export const LONGITUD_MINIMA = 10;

/** Las 100 más usadas, en minúsculas. Se compara sin distinguir mayúsculas. */
const COMUNES = new Set([
  '123456', '123456789', '12345678', 'password', 'qwerty123', 'qwerty1', '111111', '12345',
  'secret', '123123', '1234567890', '1234567', '000000', 'qwerty', 'abc123', 'password1',
  'iloveyou', '11111111', 'dragon', 'monkey', '123321', '654321', '666666', '123qwe',
  'contraseña', 'contrasena', 'principal', 'sunshine', 'football', 'shadow', 'michael',
  'computer', 'jesus', 'ninja', 'mustang', 'password123', 'admin', 'administrador',
  'welcome', 'login', 'passw0rd', 'starwars', 'freedom', 'whatever', 'trustno1',
  'batman', 'zaq12wsx', 'qazwsx', 'asdfgh', 'asdfghjkl', 'zxcvbnm', 'qwertyuiop',
  '1q2w3e4r', '1qaz2wsx', 'q1w2e3r4', 'baseball', 'superman', 'hello', 'charlie',
  'donald', 'letmein', 'access', 'master', 'flower', 'hottie', 'loveme', 'zaq1zaq1',
  'password12', 'test1234', 'abcd1234', 'a1b2c3d4', '87654321', '123456a', '696969',
  'jordan23', 'harley', 'ranger', 'buster', 'thomas', 'robert', 'soccer', 'hockey',
  'killer', 'george', 'andrew', 'tigger', 'joshua', 'pepper', 'daniel', 'hunter',
  'summer', 'amanda', 'jennifer', 'jessica', 'ashley', 'nicole', 'chelsea', 'biteme',
  'matthew', 'access14', 'yankees', 'dallas', 'austin', 'thunder', 'taylor', 'matrix',
  'madrid', 'barcelona', 'realmadrid', 'espana', 'españa', 'sevilla', 'valencia',
]);

export type FalloContrasena =
  | { codigo: 'corta'; mensaje: string }
  | { codigo: 'contiene_usuario'; mensaje: string }
  | { codigo: 'comun'; mensaje: string };

/** Devuelve `null` si la contraseña vale; si no, el primer fallo encontrado. */
export function validarContrasena(password: string, username: string): FalloContrasena | null {
  if (password.length < LONGITUD_MINIMA) {
    return {
      codigo: 'corta',
      mensaje: `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`,
    };
  }

  const u = username.trim().toLowerCase();
  if (u.length >= 3 && password.toLowerCase().includes(u)) {
    return {
      codigo: 'contiene_usuario',
      mensaje: 'La contraseña no puede contener tu nombre de usuario.',
    };
  }

  if (COMUNES.has(password.toLowerCase())) {
    return {
      codigo: 'comun',
      mensaje: 'Esa contraseña es demasiado común. Elige otra.',
    };
  }

  return null;
}

/**
 * Los dos requisitos que la pantalla marca en verde según se escriben
 * (DESIGN_BRIEF §8.2). El de «demasiado común» no está aquí a propósito.
 */
export function requisitosEnVivo(password: string, username: string) {
  const u = username.trim().toLowerCase();
  return [
    {
      texto: `Mínimo ${LONGITUD_MINIMA} caracteres`,
      cumplido: password.length >= LONGITUD_MINIMA,
    },
    {
      texto: 'No puede contener tu nombre de usuario',
      cumplido: password.length > 0 && !(u.length >= 3 && password.toLowerCase().includes(u)),
    },
  ];
}

/** Esquema de servidor. La validación de cliente es cortesía, no seguridad. */
export const esquemaCambioContrasena = z.object({
  password: z.string().min(LONGITUD_MINIMA),
  confirmacion: z.string().min(LONGITUD_MINIMA),
});
