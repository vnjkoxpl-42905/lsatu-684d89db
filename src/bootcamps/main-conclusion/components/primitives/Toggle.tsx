import { motion } from 'framer-motion';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, id, className }: Props) {
  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', className)}>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full',
          'transition-[background,box-shadow,border-color] duration-180 ease-eased',
          'border',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
          checked
            ? 'bg-[image:var(--grad-accent-strong)] border-[color:var(--border-accent-strong)] shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.10)]'
            : 'bg-[rgb(var(--surface-elev))] border-[rgb(var(--border)/0.12)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.5 }}
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full',
            'shadow-[0_1px_2px_rgb(0_0_0/0.6),0_0_0_1px_rgb(0_0_0/0.18)]',
            checked
              ? 'translate-x-[18px] bg-[rgb(var(--ink))]'
              : 'translate-x-[3px] bg-[rgb(var(--ink-soft))]',
          )}
        />
      </button>
      <span className="font-mc-mono text-mono text-ink-soft">{label}</span>
    </label>
  );
}
