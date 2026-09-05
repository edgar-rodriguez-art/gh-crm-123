import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `tailwind-merge` con la escala tipográfica del sistema declarada.
 *
 * ── Por qué esto no es opcional ───────────────────────────────────────
 * Los tamaños de `tailwind.config.ts` se llaman `nota`, `secundario`,
 * `cuerpo`… así que producen clases como `text-nota`. Sin configurar,
 * tailwind-merge no distingue eso de un color (`text-neutro-800`): los mete
 * en el mismo grupo y se queda con el último. El resultado es que
 * `cn('text-nota', 'text-neutro-800')` PIERDE el tamaño y el texto sale a
 * 14 px en vez de a 12.
 *
 * Declarando los nombres, cada clase cae en su grupo y las dos sobreviven.
 * Si se añade un tamaño en `tailwind.config.ts`, hay que añadirlo aquí.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'nota',
            'secundario',
            'tabla',
            'cuerpo',
            'rotulo',
            'h2menor',
            'cifra',
            'h2',
            'h1',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
