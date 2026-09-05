import type { Config } from 'tailwindcss';

/**
 * Tailwind mapeado sobre los tokens de Broadsheet.
 *
 * Ninguna clase lleva un hexadecimal: todas apuntan a la variable CSS que
 * define `@crm123/core/styles/tokens.css`. Así, cambiar el sistema es
 * cambiar un archivo, y es imposible que una pantalla se salte la paleta
 * (CLAUDE.md prohibición 22).
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../packages/core/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        lienzo: 'var(--color-bg)',
        superficie: 'var(--crm-surface)',
        tinta: 'var(--color-text)',
        filete: 'var(--color-divider)',
        neutro: {
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
        // Marca. Acciones principales, navegación activa, barras de progreso.
        marca: {
          DEFAULT: 'var(--color-accent)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
        },
        // Atraso: LA ÚNICA ALARMA. Ningún otro elemento puede usarla
        // (DESIGN_BRIEF §12, regla de color más importante del sistema).
        atraso: {
          DEFAULT: 'var(--color-accent-2)',
          100: 'var(--color-accent-2-100)',
          700: 'var(--color-accent-2-700)',
          800: 'var(--color-accent-2-800)',
        },
        // Verde: SOLO venta ganada.
        ganada: 'var(--crm-won)',
      },
      fontFamily: {
        cuerpo: ['var(--font-body)'],
        titulo: ['var(--font-heading)'],
      },
      fontSize: {
        // Los tamaños del diseño entregado (README.handoff §3).
        nota: ['12px', { lineHeight: '1.4' }],
        secundario: ['12.5px', { lineHeight: '1.4' }],
        tabla: ['13.5px', { lineHeight: '1.35' }],
        cuerpo: ['14px', { lineHeight: '1.45' }],
        rotulo: ['11.5px', { lineHeight: '1.3', letterSpacing: '0.055em' }],
        h2menor: ['17px', { lineHeight: '1.3' }],
        cifra: ['22px', { lineHeight: '1.2' }],
        h2: ['21px', { lineHeight: '1.25' }],
        h1: ['26px', { lineHeight: '1.2' }],
      },
      spacing: {
        s1: 'var(--space-1)',
        s2: 'var(--space-2)',
        s3: 'var(--space-3)',
        s4: 'var(--space-4)',
        s6: 'var(--space-6)',
        s8: 'var(--space-8)',
        barra: 'var(--crm-sidebar)',
        fila: 'var(--crm-row)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionDuration: {
        // Único movimiento del sistema (DESIGN_BRIEF §12).
        DEFAULT: '150ms',
      },
      keyframes: {
        crmPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        esqueleto: 'crmPulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
