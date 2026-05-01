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
    container: 'bg-[rgb(var(--surface-elev))] text-ink-faint border border-[rgb(var(--border)/0.10)]',
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
      'bg-[image:var(--grad-accent-soft)] text-mc-accent',
      'border border-[color:var(--border-accent-mid)]',
      'shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
    ),
    dot: 'bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]',
  },
};

export function Badge({ tone = 'neutral', dot = false, pulse = false, className, children, ...rest }: Props) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-2 px-2 py-0.5 font-mc-mono text-mono uppercase tracking-wider',
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
