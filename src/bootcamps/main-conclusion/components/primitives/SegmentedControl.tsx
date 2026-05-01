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
        'inline-flex rounded-3 p-0.5',
        'bg-[image:var(--grad-surface-elev)]',
        'border border-[rgb(var(--border)/0.10)]',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.4)]',
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
              'relative h-7 px-3.5 rounded-2 font-mc-mono text-mono transition-colors duration-150 ease-eased',
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
                  'absolute inset-0 rounded-2',
                  'bg-[image:var(--grad-accent-soft)]',
                  'border border-[color:var(--border-accent-mid)]',
                  'shadow-[inset_0_1px_0_rgb(255_255_255/0.08),var(--glow-accent-soft)]',
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
