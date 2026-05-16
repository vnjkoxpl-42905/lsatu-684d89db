

import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CheckpointQuestion {
  prompt: ReactNode;
  answer: ReactNode;
}

export function Checkpoint({
  section,
  questions,
}: {
  section: string;
  questions: CheckpointQuestion[];
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  return (
    <section className="my-10 border border-rule bg-paper-bright/70 p-5">
      <header className="flex items-baseline justify-between border-b border-rule-soft pb-2">
        <h4 className="display-title text-xl text-ink">Checkpoint · {section}</h4>
        <span className="protocol text-ink-mute">recognition only · no time</span>
      </header>
      <ol className="mt-4 space-y-4">
        {questions.map((q, i) => {
          const open = revealed[i];
          return (
            <li key={i} className="space-y-2">
              <div className="flex gap-3">
                <span className="protocol text-ink-mute">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 leading-relaxed text-ink-soft">{q.prompt}</div>
              </div>
              <button
                type="button"
                onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
                className={cn(
                  'protocol text-xs px-2 py-1 border transition-colors',
                  open
                    ? 'border-verdigris bg-verdigris-tint text-verdigris-deep'
                    : 'border-rule hover:border-ink hover:text-ink',
                )}
              >
                {open ? 'Hide answer' : 'Reveal answer'}
              </button>
              {open && (
                <div className="ml-9 border-l-2 border-verdigris pl-3 text-ink-soft">{q.answer}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
