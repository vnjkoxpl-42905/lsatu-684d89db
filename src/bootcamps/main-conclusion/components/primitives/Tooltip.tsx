import { useState, type ReactNode } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface Props {
  content: string;
  children: ReactNode;
  side?: Side;
  className?: string;
}

const POS: Record<Side, string> = {
  top: 'left-1/2 bottom-full mb-2 -translate-x-1/2',
  bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

const ARROW: Record<Side, string> = {
  top: 'left-1/2 top-full -translate-x-1/2 border-t-[rgb(var(--surface-elev))] border-x-transparent border-b-transparent',
  bottom: 'left-1/2 bottom-full -translate-x-1/2 border-b-[rgb(var(--surface-elev))] border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-[rgb(var(--surface-elev))] border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-[rgb(var(--surface-elev))] border-y-transparent border-l-transparent',
};

export function Tooltip({ content, children, side = 'bottom', className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className={cn(
            'absolute z-30 pointer-events-none',
            'motion-safe:animate-mc-tooltip-in motion-reduce:animate-none',
            POS[side],
            className,
          )}
        >
          <span
            className={cn(
              'relative inline-block whitespace-nowrap rounded-2 px-2.5 py-1.5',
              'bg-[image:var(--grad-surface-elev)] text-ink-soft font-mc-mono text-mono',
              'border border-[rgb(var(--border)/0.12)]',
              'shadow-[var(--shadow-2)] backdrop-blur-md',
            )}
          >
            {content}
            <span
              aria-hidden="true"
              className={cn('absolute h-0 w-0 border-[5px] border-solid', ARROW[side])}
            />
          </span>
        </span>
      ) : null}
    </span>
  );
}
