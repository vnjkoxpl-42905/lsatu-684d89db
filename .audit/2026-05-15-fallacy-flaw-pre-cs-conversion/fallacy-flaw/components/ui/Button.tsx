import { cn } from '../../lib/utils';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'verdict' | 'cake';

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-paper hover:bg-ink-soft border border-ink',
  ghost:
    'bg-transparent text-ink border border-rule hover:border-ink hover:bg-paper-bright',
  verdict:
    'bg-verdigris text-paper hover:bg-verdigris-deep border border-verdigris-deep',
  cake:
    'bg-cake text-paper hover:bg-cake-deep border border-cake-deep',
};

interface BaseProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: BaseProps & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 protocol text-xs transition-colors',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  variant = 'primary',
  className,
  children,
  onClick,
}: BaseProps & { href?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 protocol text-xs transition-colors',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
