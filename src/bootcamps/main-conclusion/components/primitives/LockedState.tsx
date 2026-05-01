import { Link } from 'react-router-dom';

interface Props {
  blockedBy: string;
  unlockHint: string;
  gotoBlockerHref: string;
}

export function LockedState({ blockedBy, unlockHint, gotoBlockerHref }: Props): JSX.Element {
  return (
    <div className="px-6 py-12 max-w-prose mx-auto">
      <div className="font-mc-mono text-label uppercase tracking-wider text-mc-warn">Locked</div>
      <h1 className="font-mc-serif text-h1 font-semibold mt-2">This surface is gated</h1>
      <p className="font-mc-serif text-body-prose mt-4 text-ink-soft">{unlockHint}</p>
      <p className="font-mc-mono text-mono text-ink-faint mt-4">Blocker: {blockedBy}</p>
      <Link
        to={gotoBlockerHref}
        className="inline-block mt-6 px-4 py-2 rounded-3 bg-[rgb(var(--accent)/0.10)] text-mc-accent font-mc-mono text-mono hover:bg-[rgb(var(--accent)/0.16)] transition-colors duration-150 ease-eased"
      >
        Go to {blockedBy} →
      </Link>
    </div>
  );
}
