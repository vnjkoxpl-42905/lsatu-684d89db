import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: Props<T>) {
  const layoutId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex rounded-[6px] p-1',
        'bg-[rgb(255_255_255/0.74)]',
        'border border-[rgb(26_26_26/0.10)]',
        'shadow-[var(--soft-shadow)]',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative h-8 px-3.5 rounded-[4px] font-mc-mono text-mono uppercase tracking-[0.18em] transition-colors duration-150 ease-eased',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-1',
              active ? 'text-mc-accent' : 'text-ink-soft hover:text-ink',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`mc-segctl-${layoutId}`}
                aria-hidden="true"
                transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.6 }}
                className={cn(
                  'absolute inset-0 rounded-[4px]',
                  'bg-white',
                  'border border-[rgb(26_26_26/0.12)]',
                  'shadow-[var(--soft-shadow)]',
                )}
              />
            ) : null}
            <span className="relative z-[1]">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
