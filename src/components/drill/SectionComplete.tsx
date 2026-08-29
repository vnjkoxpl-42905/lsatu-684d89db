import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionCompleteProps {
  onBlindReview: () => void;
  onSeeResults: () => void;
  /** Questions answered correctly under the clock. Used only for the peek. */
  score?: number;
  /** Questions in the section. */
  total?: number;
}

/**
 * What a student meets the moment a section closes.
 *
 * The three ways out are deliberately unequal, because they are not equally
 * good for the student. Blind review is the work; it gets the primary button.
 * Looking at the score is a peek, so it reveals the number here and takes
 * nothing away: the review is still waiting underneath. Leaving for the full
 * report is the quiet third option.
 *
 * This replaces a screen that offered two equal cards and warned that seeing
 * the score would lock blind review for good, which made the useful path
 * something a student could lose by being curious once.
 */
export function SectionComplete({
  onBlindReview,
  onSeeResults,
  score,
  total,
}: SectionCompleteProps) {
  const [peeked, setPeeked] = React.useState(false);
  const canPeek = typeof score === 'number' && typeof total === 'number' && total > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Section complete</h1>

        {/* The peek. Nothing is spent by looking, so nothing warns against it. */}
        {canPeek && (
          <div className="min-h-[4.5rem] flex items-center justify-center">
            {peeked ? (
              <div className="animate-in fade-in duration-200">
                <div className="text-4xl font-semibold tabular-nums">
                  {score} <span className="text-muted-foreground">/ {total}</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Under the clock. Blind review is still open.
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPeeked(true)}
                className={cn(
                  'rounded-full border border-border px-5 py-2 text-sm font-medium',
                  'text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
                )}
              >
                Peek at score
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={onBlindReview}
            className={cn(
              'w-full rounded-xl bg-foreground px-6 py-4 text-base font-semibold text-background',
              'transition-colors hover:bg-foreground/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2',
            )}
          >
            Blind review
          </button>
          <p className="text-sm text-muted-foreground">
            Walk the section again, untimed, without seeing what was right. Change
            any answer you want to change.
          </p>
        </div>

        <button
          type="button"
          onClick={onSeeResults}
          className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        >
          Skip to results
        </button>
      </div>
    </div>
  );
}
