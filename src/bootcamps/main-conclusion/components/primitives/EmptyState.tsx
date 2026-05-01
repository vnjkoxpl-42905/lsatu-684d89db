import { type ReactNode } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props {
  title: string;
  body?: string;
  cta?: ReactNode;
  surfaceId?: string;
  /** Optional leading illustration / icon slot. */
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, cta, surfaceId, icon, className }: Props) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden mx-auto max-w-prose px-6 py-16',
        'rounded-5 border border-[rgb(var(--border)/0.08)]',
        'bg-[image:var(--grad-surface-soft)]',
        'shadow-[var(--shadow-1)]',
        'text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-12 h-32 mx-auto w-2/3 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.18), transparent 70%)' }}
      />
      <div className="relative">
        {icon ? (
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.10)] border border-[color:var(--border-accent-mid)] text-mc-accent shadow-[var(--glow-accent-soft)]">
            {icon}
          </div>
        ) : null}
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Empty</div>
        <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">{title}</h2>
        {body ? <p className="mt-3 font-mc-serif text-body-prose text-ink-soft">{body}</p> : null}
        {surfaceId ? (
          <p className="mt-4 font-mc-mono text-mono text-ink-faint">surface-id: {surfaceId}</p>
        ) : null}
        {cta ? <div className="mt-6 flex justify-center">{cta}</div> : null}
      </div>
    </div>
  );
}
