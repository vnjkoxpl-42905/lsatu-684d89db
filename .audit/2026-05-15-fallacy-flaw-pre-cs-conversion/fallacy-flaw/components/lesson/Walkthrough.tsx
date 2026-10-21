import type { ReactNode } from 'react';

export function Walkthrough({
  number,
  title,
  cite,
  stimulus,
  hostileRead,
  objection,
  language,
}: {
  number: number;
  title: string;
  cite: string;
  stimulus: ReactNode;
  hostileRead: ReactNode;
  objection: ReactNode;
  language: ReactNode;
}) {
  return (
    <article className="my-10 border border-rule bg-paper-bright/40 p-6">
      <header className="flex items-baseline gap-3 border-b border-rule-soft pb-2">
        <span className="display-title text-3xl italic text-ink-mute">{number}</span>
        <h4 className="display-title text-xl text-ink">{title}</h4>
        <span className="protocol ml-auto text-ink-mute">{cite}</span>
      </header>
      <blockquote className="mt-4 border-l-2 border-ink-mute pl-4 italic text-ink-soft">
        {stimulus}
      </blockquote>
      <dl className="mt-5 space-y-4">
        <div>
          <dt className="protocol text-verdigris-deep">Hostile read</dt>
          <dd className="mt-1 text-ink-soft">{hostileRead}</dd>
        </div>
        <div>
          <dt className="protocol text-cake-deep">Formulate the objection</dt>
          <dd className="mt-1 text-ink-soft">{objection}</dd>
        </div>
        <div>
          <dt className="protocol text-ink-mute">Most likely answer language</dt>
          <dd className="mt-1 text-ink-soft">{language}</dd>
        </div>
      </dl>
    </article>
  );
}
