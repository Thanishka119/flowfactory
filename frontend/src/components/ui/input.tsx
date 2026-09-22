import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-bluegray/60 bg-white px-3 py-1.5 text-sm text-navy shadow-sm transition-all placeholder:text-bluegray-dark/60 focus-visible:outline-none focus-visible:border-navy focus-visible:ring-1 focus-visible:ring-navy disabled:cursor-not-allowed disabled:bg-cream/40 disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
