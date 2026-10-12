import { type HTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Tone = 'neutral' | 'success' | 'warn' | 'error' | 'accent';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Render a leading dot indicator. Pulses when `pulse` is true. */
  dot?: boolean;
  pulse?: boolean;
}

const TONE: Record<Tone, { container: string; dot: string }> = {
  neutral: {
    container: 'bg-[rgb(var(--ink)/0.06)] text-[rgb(var(--ink-faint))] border border-[rgb(var(--border)/0.08)]',
    dot: 'bg-[rgb(var(--ink-faint))]',
  },
  success: {
    container: 'bg-[rgb(var(--success)/0.14)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.30)]',
    dot: 'bg-[rgb(var(--success))]',
  },
  warn: {
    container: 'bg-[rgb(var(--warn)/0.14)] text-[rgb(var(--warn))] border border-[rgb(var(--warn)/0.30)]',
    dot: 'bg-[rgb(var(--warn))]',
  },
  error: {
    container: 'bg-[rgb(var(--error)/0.14)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.30)]',
    dot: 'bg-[rgb(var(--error))]',
  },
  accent: {
    container: cn(
      'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]',
      'border border-[rgb(var(--accent)/0.22)] shadow-[var(--glow-accent-soft)]',
    ),
    dot: 'bg-[rgb(var(--accent))]',
  },
};

export function Badge({ tone = 'neutral', dot = false, pulse = false, className, children, ...rest }: Props) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 font-mc-mono text-mono uppercase tracking-[0.18em]',
        t.container,
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span aria-hidden="true" className="relative inline-flex">
          <span className={cn('inline-block h-1.5 w-1.5 rounded-full', t.dot)} />
          {pulse ? (
            <span
              className={cn(
                'absolute inset-0 rounded-full opacity-60',
                t.dot,
                'motion-safe:animate-ping motion-reduce:animate-none',
              )}
            />
          ) : null}
        </span>
      ) : null}
      {children}
    </span>
  );
}
