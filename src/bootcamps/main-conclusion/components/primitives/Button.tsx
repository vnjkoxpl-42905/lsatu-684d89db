import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: cn(
    'mc-shine bg-[image:var(--grad-accent-strong)] text-[rgb(var(--bg))]',
    'border border-[color:var(--border-accent-mid)]',
    'shadow-[0_16px_34px_rgb(26_26_26/0.18)]',
    'hover:-translate-y-[2px] hover:border-[color:var(--border-accent-strong)] hover:shadow-[0_20px_42px_rgb(26_26_26/0.22)]',
    'active:translate-y-[0.5px] active:shadow-[var(--shadow-press)]',
  ),
  ghost: cn(
    'bg-transparent text-ink-soft border border-transparent',
    'hover:bg-[rgb(255_255_255/0.72)] hover:text-ink hover:border-[rgb(26_26_26/0.08)]',
    'active:translate-y-[0.5px]',
  ),
  subtle: cn(
    'bg-[rgb(255_255_255/0.72)] text-ink',
    'border border-[rgb(26_26_26/0.10)]',
    'shadow-[var(--soft-shadow)]',
    'hover:-translate-y-[2px] hover:bg-white hover:border-[rgb(26_26_26/0.22)] hover:shadow-[var(--shadow-1)]',
    'active:translate-y-[0.5px] active:shadow-[var(--shadow-press)]',
  ),
  danger: cn(
    'bg-[rgb(var(--error)/0.14)] text-[rgb(var(--error))]',
    'border border-[rgb(var(--error)/0.32)]',
    'hover:bg-[rgb(var(--error)/0.22)] hover:border-[rgb(var(--error)/0.50)] hover:shadow-[0_0_24px_-4px_rgb(239_68_68/0.32)]',
    'active:translate-y-[0.5px]',
  ),
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-3 text-mono gap-1.5',
  md: 'h-9 px-4 text-body gap-2',
  lg: 'h-11 px-5 text-body-prose gap-2',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, disabled, className, children, ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'group/btn relative inline-flex items-center justify-center rounded-[4px] font-mc-mono uppercase tracking-[0.18em]',
        'transition-[transform,box-shadow,background,border-color] duration-150 ease-eased',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon ? <span className="shrink-0 inline-flex">{leftIcon}</span> : null}
      <span className="relative z-[1] inline-flex items-center justify-center">{children}</span>
      {!loading && rightIcon ? <span className="shrink-0 inline-flex">{rightIcon}</span> : null}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 h-3.5 w-3.5 motion-safe:animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
