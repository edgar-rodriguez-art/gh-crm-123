import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Botón de shadcn/ui, revestido con los tokens de Broadsheet.
 * Equivalencias fijadas en README.handoff §4 — NO se crean variantes nuevas.
 *
 *   default   → botón principal   (marca, #0088b0)
 *   outline   → botón secundario  (borde neutro-400, fondo transparente)
 *   link      → botón de texto    (marca-700, sin borde)
 *   ghost/icon→ botón de tres puntos
 *
 * Sin degradados, sin esquinas grandes, y nunca los dos acentos en el mismo
 * componente. La magenta de atraso no aparece aquí: no hay botón de alarma.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-cuerpo ' +
    'transition-colors duration-150 ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-marca ' +
    'disabled:pointer-events-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-marca text-white hover:bg-marca-600 ' +
          'disabled:bg-neutro-400 disabled:text-neutro-100',
        outline:
          'border border-neutro-400 bg-transparent text-tinta hover:bg-neutro-100 ' +
          'disabled:border-neutro-300 disabled:text-neutro-500',
        link:
          'bg-transparent text-marca-700 underline-offset-4 hover:underline ' +
          'disabled:text-neutro-500',
        ghost: 'bg-transparent text-tinta hover:bg-neutro-100 disabled:text-neutro-500',
      },
      size: {
        // Alturas exactas del diseño entregado (README.handoff §3).
        default: 'h-[38px] px-s3 text-cuerpo',
        sm: 'h-[34px] px-s2 text-secundario',
        dialogo: 'h-[40px] px-s4 text-cuerpo',
        login: 'h-[44px] w-full px-s4 text-cuerpo',
        icon: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        // Un botón sin `type` dentro de un formulario envía. Más de un doble
        // envío nace justo aquí.
        type={asChild ? undefined : (type ?? 'button')}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
