import { type HTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Variant = 'surface' | 'elev' | 'ghost';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** Add hover-lift micro-interaction with shadow elevation. Default false. Pass true on clickable cards. */
  interactive?: boolean;
  /** Tint border + glow with accent gold. Use for highlighted/featured cards. */
  accent?: boolean;
}

const VAR: Record<Variant, string> = {
  surface: cn(
    'bg-[image:var(--grad-surface-soft)]',
    'border border-[rgb(var(--border)/0.08)]',
    'shadow-[var(--shadow-1)]',
  ),
  elev: cn(
    'bg-[image:var(--grad-surface-elev)]',
    'border border-[rgb(var(--border)/0.10)]',
    'shadow-[var(--shadow-2)]',
  ),
  ghost: cn(
    'bg-transparent',
    'border border-[rgb(var(--border)/0.08)]',
  ),
};

const INTERACTIVE = cn(
  'transition-[transform,box-shadow,border-color] duration-180 ease-eased',
  'hover:-translate-y-[2px] hover:border-[color:var(--border-accent-mid)] hover:shadow-[var(--shadow-lift)]',
);

const ACCENT_OVERLAY = cn(
  'border-[color:var(--border-accent-soft)]',
  'shadow-[var(--shadow-2),var(--glow-accent-soft)]',
);

export function Card({
  variant = 'surface',
  interactive = false,
  accent = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        'mc-card-highlight relative isolate overflow-hidden rounded-4 p-4',
        VAR[variant],
        accent && ACCENT_OVERLAY,
        interactive && INTERACTIVE,
        className,
      )}
      {...rest}
    >
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
