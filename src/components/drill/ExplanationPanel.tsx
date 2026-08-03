import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLrExplanation, type LrStyleKey } from '@/hooks/useLrExplanation';

/**
 * The authored LSAT Lab explanation for a single question.
 *
 * Layout mirrors the source: the argument breakdown, then every answer choice
 * with its tag and the share of students who picked it, with that choice's
 * explanation directly underneath.
 *
 * Two rules this component must not break:
 *  - Never invent content. A missing tag, percentage, or note renders as
 *    absent, not as a placeholder or a guess.
 *  - The style selector shows exactly the styles the source published for this
 *    question. One style means no selector at all; two means two.
 */

interface ExplanationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pt?: number | null;
  section?: number | null;
  questionNumber?: number | null;
  /** The student's own pick, highlighted so they can find it fast. */
  selectedAnswer?: string | null;
  /** Rendered when the source published no authored explanation. */
  fallback?: React.ReactNode;
}

function ChoiceRow({
  letter,
  text,
  tag,
  studentPercent,
  isCorrect,
  isSelected,
  note,
}: {
  letter: string;
  text: string;
  tag: string | null;
  studentPercent: number | null;
  isCorrect: boolean;
  isSelected: boolean;
  note?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isCorrect ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-foreground">{letter}.</span>
        <span className="flex-1 text-sm text-foreground">{text}</span>
      </div>

      {/* Tag and percentage come straight from the source; either may be absent. */}
      {(tag || studentPercent != null || isSelected) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {tag && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-medium',
                isCorrect ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {tag}
            </span>
          )}
          {studentPercent != null && (
            <span className="text-muted-foreground">{studentPercent}% of students</span>
          )}
          {isSelected && (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
              Your answer
            </span>
          )}
        </div>
      )}

      {note && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}

export function ExplanationPanel({
  open,
  onOpenChange,
  pt,
  section,
  questionNumber,
  selectedAnswer,
  fallback,
}: ExplanationPanelProps) {
  const { data, isLoading, error } = useLrExplanation(
    { pt, section, questionNumber },
    open,
  );

  const [activeStyle, setActiveStyle] = React.useState<LrStyleKey | null>(null);

  // Reset the selector whenever the question changes so a style chosen on the
  // previous question can't leak onto one that doesn't publish it.
  React.useEffect(() => {
    setActiveStyle(null);
  }, [pt, section, questionNumber]);

  const styles = data?.styles ?? [];
  const current = styles.find((s) => s.style === activeStyle) ?? styles[0];

  // Where the source said a style's breakdown is "(same as Standard)" it did
  // not repeat the text, so that style carries no steps. Showing nothing would
  // misrepresent the source, which asserts the breakdown is identical — so we
  // borrow Standard's and label it. This is not a guess: the absence only ever
  // means "identical to Standard", never "no breakdown exists".
  const standardSteps = styles.find((s) => s.style === 'standard')?.steps ?? [];
  const borrowsStandard =
    current != null && current.style !== 'standard' && current.steps.length === 0 && standardSteps.length > 0;
  const steps = borrowsStandard ? standardSteps : (current?.steps ?? []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            Explanation
            {data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                PT{data.preptest} · S{data.section} · Q{data.questionNumber}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <p className="mt-6 text-sm text-muted-foreground">Loading explanation…</p>
        )}

        {error && (
          <p className="mt-6 text-sm text-muted-foreground">
            Could not load the explanation. Try again in a moment.
          </p>
        )}

        {!isLoading && !error && !data?.hasAuthored && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              No written explanation was published for this question.
            </p>
            {/* Tags and percentages often exist even with no prose — show what we have. */}
            {data && data.choices.length > 0 && (
              <div className="space-y-2">
                {data.choices.map((c) => (
                  <ChoiceRow
                    key={c.letter}
                    letter={c.letter}
                    text={c.text}
                    tag={c.tag}
                    studentPercent={c.studentPercent}
                    isCorrect={c.isCorrect}
                    isSelected={selectedAnswer === c.letter}
                  />
                ))}
              </div>
            )}
            {fallback}
          </div>
        )}

        {!isLoading && !error && data?.hasAuthored && current && (
          <div className="mt-6 space-y-5">
            {data.correctChoice && (
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Correct answer: </span>
                <span className="font-semibold">{data.correctChoice}</span>
              </p>
            )}

            {/* Only render a selector when the source actually published more
                than one style for this question. */}
            {styles.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <Button
                    key={s.style}
                    size="sm"
                    variant={s.style === current.style ? 'default' : 'outline'}
                    onClick={() => setActiveStyle(s.style)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}

            {steps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Argument breakdown
                  {borrowsStandard && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      same as Standard
                    </span>
                  )}
                </h3>
                {steps.map((step) => (
                  <div key={step.position} className="text-sm">
                    <span className="font-medium text-foreground">{step.label}: </span>
                    <span className="whitespace-pre-line text-muted-foreground">{step.body}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Answer choices</h3>
              {data.choices.map((c) => (
                <ChoiceRow
                  key={c.letter}
                  letter={c.letter}
                  text={c.text}
                  tag={c.tag}
                  studentPercent={c.studentPercent}
                  isCorrect={c.isCorrect}
                  isSelected={selectedAnswer === c.letter}
                  note={current.notesByLetter[c.letter]}
                />
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ExplanationPanel;
