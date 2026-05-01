import { type ReactNode } from 'react';

interface Props {
  title: string;
  body?: string;
  cta?: ReactNode;
  surfaceId?: string;
}

export function EmptyState({ title, body, cta, surfaceId }: Props) {
  return (
    <div className="px-6 py-16 max-w-prose mx-auto text-center">
      <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Placeholder</div>
      <h2 className="font-mc-serif text-h2 font-semibold mt-2">{title}</h2>
      {body ? <p className="font-mc-serif text-body-prose mt-3 text-ink-soft">{body}</p> : null}
      {surfaceId ? (
        <p className="mt-4 font-mc-mono text-mono text-ink-faint">surface-id: {surfaceId}</p>
      ) : null}
      {cta ? <div className="mt-6 flex justify-center">{cta}</div> : null}
    </div>
  );
}
