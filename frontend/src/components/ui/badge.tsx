import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-navy text-white hover:bg-navy-dark',
        secondary: 'border-bluegray/40 bg-bluegray/20 text-navy hover:bg-bluegray/30',
        destructive: 'border-transparent bg-rose-50 text-rose-700 border border-rose-200',
        outline: 'border-bluegray/60 text-navy bg-white/80',
        accent: 'border-beige-dark bg-beige/60 text-navy font-semibold',
        success: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium',
        warning: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
