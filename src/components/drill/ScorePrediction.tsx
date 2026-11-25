import * as React from 'react';
import { SectionFinishDialog } from './SectionFinishDialog';
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
  const [value, setValue] = React.useState<number | null>(null);

  return (
    <SectionFinishDialog title="Section submitted" description="How many do you think you got right?">
      <div className="space-y-5">
        <div className="text-5xl font-semibold tabular-nums">
          {value ?? '–'} <span className="text-2xl text-muted-foreground">/ {total}</span>
        </div>

        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={value ?? Math.round(total / 2)}
          onChange={(event) => setValue(Number(event.currentTarget.value))}
          onPointerUp={(event) => setValue(Number(event.currentTarget.value))}
          aria-label="Predicted score"
          className="w-full accent-emerald-800"
        />

        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>0</span>
          <span>{total}</span>
        </div>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          disabled={value === null}
          onClick={() => { if (value !== null) onPredict(value); }}
          className={cn(
            'w-full rounded-xl bg-foreground px-6 py-4 text-base font-semibold text-background',
            'transition-colors hover:bg-foreground/90 disabled:opacity-40',
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
    </SectionFinishDialog>
  );
}
