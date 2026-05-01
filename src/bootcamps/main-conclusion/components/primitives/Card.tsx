import { type HTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elev' | 'ghost';
}

const VAR = {
  surface: 'bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.08)]',
  elev: 'bg-[rgb(var(--surface-elev))] border border-[rgb(var(--border)/0.10)]',
  ghost: 'bg-transparent border border-[rgb(var(--border)/0.08)]',
};

export function Card({ variant = 'surface', className, ...rest }: Props) {
  return <div className={cn('rounded-4 p-4', VAR[variant], className)} {...rest} />;
}
