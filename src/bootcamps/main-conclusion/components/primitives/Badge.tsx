import { type HTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'warn' | 'error' | 'accent';
}

const TONE = {
  neutral: 'bg-[rgb(var(--surface-elev))] text-ink-faint',
  success: 'bg-[rgb(var(--success)/0.16)] text-[rgb(var(--success))]',
  warn: 'bg-[rgb(var(--warn)/0.16)] text-[rgb(var(--warn))]',
  error: 'bg-[rgb(var(--error)/0.16)] text-[rgb(var(--error))]',
  accent: 'bg-[rgb(var(--accent)/0.12)] text-mc-accent',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-2 px-1.5 py-0.5 font-mc-mono text-mono uppercase tracking-wider',
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
