import * as React from 'react';
import { cn } from '@/lib/utils';

interface ScorePredictionProps {
  /** Questions in the section, the top of the range. */
  total: number;
  onPredict: (score: number) => void;
  onSkip: () => void;
}

/**
 * Asked once, in the gap between submitting a section and learning anything
 * about it.
 *
 * The value is not the number. It is that a student who can call their own
 * score within a point or two knows which questions they were guessing on,
 * and a student who is ten out has been feeling confident about the wrong
 * things. That gap is the thing worth seeing, and it can only be measured if
 * the guess is made before the score is known.
 *
 * Skipping is a plain link and costs nothing.
 */
export function ScorePrediction({ total, onPredict, onSkip }: ScorePredictionProps) {
  const [value, setValue] = React.useState(() => Math.round(total / 2));

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Section submitted</h1>
          <p className="text-muted-foreground">How many do you think you got right?</p>
        </div>

        <div className="space-y-5">
          <div className="text-5xl font-semibold tabular-nums">
            {value} <span className="text-2xl text-muted-foreground">/ {total}</span>
          </div>

          <input
            type="range"
            min={0}
            max={total}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label="Predicted score"
            className="w-full accent-foreground"
          />

          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>0</span>
            <span>{total}</span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => onPredict(value)}
            className={cn(
              'w-full rounded-xl bg-foreground px-6 py-4 text-base font-semibold text-background',
              'transition-colors hover:bg-foreground/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2',
            )}
          >
            Lock it in
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="block w-full text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
