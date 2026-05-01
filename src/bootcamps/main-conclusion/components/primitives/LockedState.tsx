import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props {
  blockedBy: string;
  unlockHint: string;
  gotoBlockerHref: string;
}

export function LockedState({ blockedBy, unlockHint, gotoBlockerHref }: Props): JSX.Element {
  return (
    <div className="px-6 py-12 max-w-prose mx-auto">
      <div
        className={cn(
          'relative isolate overflow-hidden rounded-5 p-8',
          'bg-[image:var(--grad-surface-soft)]',
          'border border-[rgb(var(--warn)/0.30)]',
          'shadow-[0_24px_48px_-12px_rgb(0_0_0/0.6),0_0_24px_-4px_rgb(250_204_21/0.18)]',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(250 204 21 / 0.22), transparent 70%)' }}
        />
        <div className="relative">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--warn)/0.10)] border border-[rgb(var(--warn)/0.36)] text-[rgb(var(--warn))] motion-safe:animate-glow-pulse motion-reduce:animate-none">
            <Lock className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="mt-4 font-mc-mono text-label uppercase tracking-wider text-[rgb(var(--warn))]">Locked</div>
          <h1 className="mt-1 font-mc-serif text-h1 font-semibold text-ink">This surface is gated</h1>
          <p className="mt-3 font-mc-serif text-body-prose text-ink-soft">{unlockHint}</p>
          <p className="mt-3 font-mc-mono text-mono text-ink-faint">Blocker · {blockedBy}</p>
          <Link
            to={gotoBlockerHref}
            className={cn(
              'mc-shine inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-3',
              'bg-[image:var(--grad-accent-strong)] text-mc-accent font-mc-mono text-mono uppercase tracking-wider',
              'border border-[color:var(--border-accent-mid)]',
              'shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.06)]',
              'hover:border-[color:var(--border-accent-strong)] hover:shadow-[var(--glow-accent-strong),inset_0_1px_0_rgb(255_255_255/0.10)]',
              'active:translate-y-[0.5px]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
              'transition-[transform,box-shadow,border-color] duration-150 ease-eased',
            )}
          >
            Go to {blockedBy}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
