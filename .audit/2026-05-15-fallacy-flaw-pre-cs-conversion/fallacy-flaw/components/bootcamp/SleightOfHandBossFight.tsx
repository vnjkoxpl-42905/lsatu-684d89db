

import { useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Day 05's earned-interaction beat. Sleight of Hand is possibly the #1 LR flaw.
 * The widget makes the student stare at term-pairs from real LSAT stimuli and
 * answer the question that breaks the move: "are these two things the same?"
 *
 * Mechanic: 5 real LSAT phrase-pairs (from voiced.md §11). For each, the
 * student picks YES (basically the same) or NO (≠). The system reveals
 * the canonical verdict (always NO) and the why.
 */
interface Pair {
  premiseTerm: string;
  conclusionTerm: string;
  why: string;
}

const PAIRS: Pair[] = [
  {
    premiseTerm: 'accurate',
    conclusionTerm: 'consistent',
    why:
      'A measurement can be consistent (always returning the same number) without being accurate (returning the right number). A scale stuck at +5 lbs is consistent and inaccurate. Real LSAT trap.',
  },
  {
    premiseTerm: 'interest of shareholders',
    conclusionTerm: 'profits high',
    why:
      'Shareholders may want growth, dividends, ethical reputation, long-term stability — not just short-term high profits. The author flattens the first concept into the second and hopes you do the same.',
  },
  {
    premiseTerm: 'better developed neural connections',
    conclusionTerm: 'greater influence on the brain',
    why:
      'Better connections is a structural claim. Greater influence on the brain is a functional claim. The author silently assumes structure entails function. Often it does. Often it doesn\'t.',
  },
  {
    premiseTerm: 'detract from social development',
    conclusionTerm: 'reduction in time interacting with other people',
    why:
      'Time spent interacting and quality of social development are different concepts. A child can have rich social development with limited interaction time, or thin development despite constant interaction. The author equates the two.',
  },
  {
    premiseTerm: 'diets higher in cholesterol',
    conclusionTerm: 'Western diets',
    why:
      'Western diets vary in cholesterol. Some are low. The author treats the category as the property, smuggling in a generalization the premises never supported.',
  },
];

export function SleightOfHandBossFight() {
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<'yes' | 'no' | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ correct: 0, total: 0 });

  const pair = PAIRS[index];
  const isLast = index === PAIRS.length - 1;

  const onLock = (choice: 'yes' | 'no') => {
    setPick(choice);
    setRevealed(true);
    setTally((t) => ({
      correct: t.correct + (choice === 'no' ? 1 : 0),
      total: t.total + 1,
    }));
  };

  const onNext = () => {
    if (isLast) {
      setIndex(0);
      setPick(null);
      setRevealed(false);
      setTally({ correct: 0, total: 0 });
    } else {
      setIndex((i) => i + 1);
      setPick(null);
      setRevealed(false);
    }
  };

  return (
    <figure
      aria-label="Sleight of Hand boss-fight"
      className="my-10 border-2 border-ink bg-paper"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink bg-paper-bright px-6 py-3">
        <span className="protocol text-ink">
          Sleight of Hand · The Boss Fight
        </span>
        <span className="protocol text-ink-mute">
          Pair {String(index + 1).padStart(2, '0')} of {PAIRS.length} · running tally{' '}
          {tally.correct}/{tally.total}
        </span>
      </header>

      <div className="px-6 py-6">
        <p className="protocol text-ink-mute">
          Real LSAT phrase pair. The author treated these two as basically the
          same. They aren&apos;t. Your job · say so.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="border border-rule bg-paper-bright p-4">
            <div className="protocol text-ink-mute">In the premises</div>
            <p className="mt-1 font-display text-xl italic leading-snug text-ink">
              &ldquo;{pair.premiseTerm}&rdquo;
            </p>
          </div>
          <div className="protocol text-center text-ink">≡?</div>
          <div className="border border-rule bg-paper-bright p-4">
            <div className="protocol text-ink-mute">In the conclusion</div>
            <p className="mt-1 font-display text-xl italic leading-snug text-ink">
              &ldquo;{pair.conclusionTerm}&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onLock('yes')}
            disabled={revealed}
            className={cn(
              'protocol border px-4 py-3 text-xs transition-colors',
              !revealed && 'border-rule bg-paper hover:border-ink',
              revealed && pick === 'yes' && 'border-strike bg-strike-tint text-strike',
              revealed && pick !== 'yes' && 'border-rule-soft text-ink-mute',
            )}
          >
            YES · basically the same
          </button>
          <button
            type="button"
            onClick={() => onLock('no')}
            disabled={revealed}
            className={cn(
              'protocol border px-4 py-3 text-xs transition-colors',
              !revealed && 'border-rule bg-paper hover:border-ink',
              revealed && pick === 'no' && 'border-verdigris bg-verdigris-tint text-verdigris-deep',
              revealed && pick !== 'no' && 'border-rule-soft text-ink-mute',
            )}
          >
            NO · ≠
          </button>
        </div>

        {revealed && (
          <div className="mt-6 border-t border-rule pt-5">
            <div className="flex items-baseline justify-between">
              <span
                className={cn(
                  'protocol',
                  pick === 'no' ? 'text-verdigris-deep' : 'text-strike',
                )}
              >
                Verdict · {pick === 'no' ? 'You held the line.' : 'The author got you.'}
              </span>
              <span className="protocol text-ink-mute">Canonical · NO</span>
            </div>
            <p className="mt-3 leading-relaxed text-ink-soft">{pair.why}</p>

            <div className="mt-5 flex items-center justify-between">
              <span className="protocol text-ink-mute">
                Nothing is basically the same on the LSAT.
              </span>
              <button
                type="button"
                onClick={onNext}
                className="protocol border border-ink bg-ink px-4 py-2 text-xs text-paper hover:bg-ink-soft"
              >
                {isLast ? 'Reset · run again' : 'Next pair →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
