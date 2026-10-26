import { type HTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Tone =
  | 'neutral'
  | 'accent'
  | 'conclusion'
  | 'premise'
  | 'pivot'
  | 'opposing'
  | 'concession'
  | 'background';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** When provided, render a small dismiss affordance. */
  onRemove?: () => void;
  removeLabel?: string;
}

const TONE: Record<Tone, string> = {
  neutral: cn(
    'bg-[rgb(var(--surface-elev)/0.7)] text-ink-soft border-[rgb(var(--border)/0.10)]',
    'backdrop-blur-sm',
  ),
  accent: cn(
    'bg-[image:var(--grad-accent-soft)] text-mc-accent',
    'border-[color:var(--border-accent-mid)]',
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
  ),
  conclusion: 'bg-[rgb(var(--role-conclusion)/0.14)] text-[rgb(var(--role-conclusion))] border-[rgb(var(--role-conclusion)/0.36)]',
  premise: 'bg-[rgb(var(--role-premise)/0.14)] text-[rgb(var(--role-premise))] border-[rgb(var(--role-premise)/0.36)]',
  pivot: 'bg-[rgb(var(--role-pivot)/0.14)] text-[rgb(var(--role-pivot))] border-[rgb(var(--role-pivot)/0.36)]',
  opposing: 'bg-[rgb(var(--role-opposing)/0.14)] text-[rgb(var(--role-opposing))] border-[rgb(var(--role-opposing)/0.36)]',
  concession: 'bg-[rgb(var(--role-concession)/0.14)] text-[rgb(var(--role-concession))] border-[rgb(var(--role-concession)/0.36)]',
  background: 'bg-[rgb(var(--role-background)/0.14)] text-[rgb(var(--role-background))] border-[rgb(var(--role-background)/0.36)]',
};

export function Chip({ tone = 'neutral', onRemove, removeLabel = 'Remove', className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mc-mono text-mono border',
        'transition-colors duration-150 ease-eased',
        TONE[tone],
        className,
      )}
      {...rest}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            '-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full',
            'opacity-60 hover:opacity-100 hover:bg-[rgb(var(--ink)/0.10)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent transition-opacity',
          )}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}
