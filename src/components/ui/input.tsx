import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'border-line bg-surface text-foreground placeholder:text-foreground-subtle flex h-9 w-full rounded-md border px-3 py-1.5 text-sm shadow-xs transition-colors',
          'focus-visible:outline-primary focus-visible:border-primary focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
