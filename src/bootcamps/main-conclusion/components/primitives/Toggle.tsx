import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}

export function Toggle({ checked, onChange, label, id }: Props) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 ease-eased',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
          checked ? 'bg-[rgb(var(--accent)/0.50)]' : 'bg-[rgb(var(--surface-elev))]',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-[rgb(var(--ink))] transition-transform duration-150 ease-eased',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
      <span className="font-mc-mono text-mono text-ink-soft">{label}</span>
    </label>
  );
}
