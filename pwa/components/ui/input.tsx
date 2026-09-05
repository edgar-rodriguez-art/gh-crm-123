import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // En la PWA los campos también son objetivos de pulsación: 48 px mínimo
        // (DESIGN_BRIEF §13).
        'flex h-[48px] w-full rounded border border-neutro-400 bg-superficie px-s3',
        'font-cuerpo text-cuerpo text-tinta',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-marca',
        'disabled:cursor-not-allowed disabled:bg-neutro-100 disabled:text-neutro-500',
        // El campo con error se marca, pero el mensaje siempre lo acompaña:
        // ninguna información va solo por color (DESIGN_BRIEF §13).
        'aria-[invalid=true]:border-atraso',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
