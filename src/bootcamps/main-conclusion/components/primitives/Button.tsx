import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[rgb(var(--accent)/0.18)] text-mc-accent border border-[rgb(var(--accent)/0.40)] hover:bg-[rgb(var(--accent)/0.26)]',
  ghost: 'bg-transparent text-ink-soft hover:bg-[rgb(var(--surface-elev))] border border-transparent',
  subtle: 'bg-[rgb(var(--surface-elev))] text-ink hover:bg-[rgb(var(--surface-elev)/0.7)] border border-[rgb(var(--border)/0.08)]',
  danger: 'bg-[rgb(var(--error)/0.14)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.32)] hover:bg-[rgb(var(--error)/0.22)]',
};
const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-mono',
  md: 'h-9 px-3.5 text-body',
  lg: 'h-11 px-5 text-body-prose',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-3 font-mc-mono transition-colors duration-150 ease-eased',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
});
