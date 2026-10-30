

import { useState } from 'react';
import { cn } from '../../lib/utils';
import { KeywordPill } from '../ui/KeywordPill';
import type { Language } from '../../types/drill';

interface QuizOption {
  id: Language;
  label: string;
}

const OPTIONS: QuizOption[] = [
  { id: 'assumption', label: 'Assumption' },
  { id: 'objection', label: 'Objection' },
  { id: 'match', label: 'Match' },
];

export function QuizCard({
  number,
  total,
  partLabel,
  prompt,
  correct,
  test,
  onResolve,
}: {
  number: number;
  total: number;
  partLabel: string;
  prompt: string;
  correct: Language;
  test: string;
  onResolve: (wasCorrect: boolean) => void;
}) {
  const [picked, setPicked] = useState<Language | null>(null);
  const [resolved, setResolved] = useState(false);

  function handlePick(opt: Language) {
    if (resolved) return;
    setPicked(opt);
    if (opt === correct) {
      setResolved(true);
      onResolve(true);
    } else {
      // wrong answer — let user retry, but record the miss the first time
      if (!resolved) onResolve(false);
    }
  }

  return (
    <article className="border border-ink bg-paper-bright/60">
      <header className="flex items-baseline justify-between border-b border-rule px-5 py-3">
        <span className="protocol text-ink-mute">{partLabel}</span>
        <span className="protocol text-ink-mute">
          {String(number).padStart(2, '0')} · {total}
        </span>
      </header>
      <div className="px-5 py-6">
        <p className="font-display text-xl italic leading-relaxed text-ink">{prompt}</p>
      </div>
      <div className="grid grid-cols-3 gap-px border-t border-rule bg-rule">
        {OPTIONS.map((opt) => {
          const isCorrect = resolved && opt.id === correct;
          const isWrong = picked === opt.id && opt.id !== correct;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePick(opt.id)}
              disabled={resolved}
              className={cn(
                'protocol px-3 py-3 text-xs transition-colors',
                isCorrect
                  ? 'bg-verdigris text-paper'
                  : isWrong
                    ? 'bg-strike-tint text-strike'
                    : 'bg-paper hover:bg-paper-deep',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {resolved && (
        <div className="border-t border-verdigris bg-verdigris-tint px-5 py-4">
          <div className="flex items-baseline gap-3">
            <KeywordPill variant={correct}>{correct}</KeywordPill>
            <span className="protocol text-verdigris-deep">test</span>
          </div>
          <p className="mt-2 font-mono text-sm leading-relaxed text-verdigris-deep">{test}</p>
        </div>
      )}
      {picked && !resolved && (
        <div className="border-t border-strike bg-strike-tint/40 px-5 py-3 text-sm text-strike">
          Not quite. Re-read the trigger verb. Try again.
        </div>
      )}
    </article>
  );
}
