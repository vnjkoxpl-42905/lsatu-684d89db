import { useState, type ReactNode } from 'react';

interface Props {
  content: string;
  children: ReactNode;
}

/**
 * Minimal CSS-only tooltip. For accessible interactions prefer aria-describedby on the
 * trigger; this component is for hint text on hover/focus.
 */
export function Tooltip({ content, children }: Props) {
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
          className="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 rounded-2 bg-[rgb(var(--surface-elev))] text-ink-soft font-mc-mono text-mono whitespace-nowrap z-30 pointer-events-none border border-[rgb(var(--border)/0.10)]"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
