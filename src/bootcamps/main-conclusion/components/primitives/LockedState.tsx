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
          'relative isolate overflow-hidden rounded-[8px] p-8',
          'bg-white',
          'border border-[rgb(var(--warn)/0.30)]',
          'shadow-[var(--shadow-2)]',
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
          <h1 className="mt-1 font-mc-serif text-h1 font-medium italic text-ink">This section is locked</h1>
          <p className="mt-3 font-mc-sans text-body-prose text-ink-soft">{unlockHint}</p>
          <p className="mt-3 font-mc-mono text-mono text-ink-faint">Blocker · {blockedBy}</p>
          <Link
            to={gotoBlockerHref}
            className={cn(
              'mc-shine inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-[4px]',
              'bg-[image:var(--grad-accent-strong)] text-[rgb(var(--bg))] font-mc-mono text-mono uppercase tracking-[0.18em]',
              'border border-[color:var(--border-accent-mid)]',
              'shadow-[0_16px_34px_rgb(26_26_26/0.18)]',
              'hover:-translate-y-[2px] hover:shadow-[0_20px_42px_rgb(26_26_26/0.22)]',
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
