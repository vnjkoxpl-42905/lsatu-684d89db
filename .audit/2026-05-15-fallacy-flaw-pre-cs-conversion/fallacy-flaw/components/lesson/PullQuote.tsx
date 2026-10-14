import type { ReactNode } from 'react';

export function PullQuote({ children, attribution }: { children: ReactNode; attribution?: string }) {
  return (
    <blockquote className="pull-quote">
      <p className="m-0">{children}</p>
      {attribution && (
        <footer className="protocol mt-2 not-italic text-ink-mute">
          {attribution}
        </footer>
      )}
    </blockquote>
  );
}

export function Remember({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 border-l-2 border-cake bg-cake-tint/60 px-4 py-3 text-ink-soft">
      <span className="protocol text-cake-deep">Remember · </span>
      <span className="font-display italic">{children}</span>
    </aside>
  );
}
