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
}

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-3 bg-[rgb(var(--surface-elev))] p-0.5 border border-[rgb(var(--border)/0.08)]"
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
              'h-7 px-3 rounded-2 font-mc-mono text-mono transition-colors duration-150 ease-eased',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
              active
                ? 'bg-[rgb(var(--accent)/0.18)] text-mc-accent'
                : 'text-ink-soft hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
