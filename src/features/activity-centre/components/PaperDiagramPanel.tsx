import { useEffect, useRef, useState } from "react";
import { ArrowRight, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActivityItem, FeedbackState } from "../api/types";
import { MAX_ATTEMPTS } from "../api/types";
import type { DiagramSide, PaperDiagramChoice } from "../worlds/switchyard/diagramChoices";
import { CoachFeedback } from "./CoachFeedback";

interface PaperDiagramPanelProps {
  item: ActivityItem;
  choices: PaperDiagramChoice[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onShowAnswer: () => void;
  onNext: () => void;
  judging: boolean;
  attempts: number;
  result: { verdict: FeedbackState; feedback: string; covered?: number[] } | null;
  revealed: boolean;
  resolved: boolean;
  isLast: boolean;
  creditedSecondaryLabel?: string;
  /** Optional persisted paper/choice state for a saved practice run. */
  paperReady?: boolean;
  onPaperReady?: () => void;
}

const actionButton =
  "w-full bg-[hsl(var(--aw-accent,var(--ac-emerald)))] text-black hover:brightness-95 h-12 px-6 text-[15px] font-semibold rounded-xl sm:w-auto";

function DiagramSideView({ prefix, side }: { prefix: "IF" | "THEN"; side: DiagramSide }) {
  return (
    <div className="min-w-0 flex-1">
      <span className="text-[10px] font-bold tracking-[0.16em] text-[hsl(var(--aw-soft,var(--muted-foreground)))]">
        {prefix}
      </span>
      <div className="mt-1 flex items-start gap-1.5 text-sm font-medium leading-snug text-foreground">
        <span className="relative inline-block" role={side.inverted ? "img" : undefined} aria-label={side.inverted ? `Not: ${side.text}` : undefined}>
          <span aria-hidden={side.inverted || undefined}>{side.text}</span>
          {side.inverted && <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100"><line x1="2" y1="94" x2="98" y2="6" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>}
        </span>
      </div>
    </div>
  );
}

/** Paper first, then a truthful structured record of the diagram the student made. */
export function PaperDiagramPanel({
  item,
  choices,
  value,
  onChange,
  onSubmit,
  onRetry,
  onShowAnswer,
  onNext,
  judging,
  attempts,
  result,
  revealed,
  resolved,
  isLast,
  creditedSecondaryLabel,
  paperReady: savedPaperReady,
  onPaperReady,
}: PaperDiagramPanelProps) {
  const [localPaperReady, setPaperReady] = useState(false);
  const paperReady = savedPaperReady ?? localPaperReady;
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const canSubmit = value.length > 0 && !judging && !resolved && !result;
  const showRetry = !!result && result.verdict !== "correct" && !revealed && attempts < MAX_ATTEMPTS;
  const choicesLocked = judging || resolved || revealed || !!result;

  useEffect(() => {
    if (resolved) feedbackRef.current?.focus();
  }, [resolved]);

  return (
    <div
      className="flex h-full flex-col rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(30,24,16,0.05)] md:p-8"
      onKeyDown={(event) => {
        if (!resolved || event.key !== "Enter") return;
        if ((event.target as HTMLElement).closest("button")) return;
        event.preventDefault();
        onNext();
      }}
    >
      {!paperReady ? (
        <div className="flex min-h-[360px] flex-1 flex-col justify-center">
          <PencilLine className="h-7 w-7 text-[hsl(var(--aw-accent,var(--ac-emerald)))]" aria-hidden="true" />
          <h2 className="mt-5 font-serif text-2xl font-semibold text-foreground">Diagram it on paper</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Put the sufficient condition on the left and the necessary condition on the right. Write the
            contrapositive too if that helps you check the route.
          </p>
          <Button className={`${actionButton} mt-7`} onClick={() => { setPaperReady(true); onPaperReady?.(); }} autoFocus>
            I’ve diagrammed it
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="font-serif text-xl font-semibold text-foreground">Which diagram matches your paper?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Choose the one diagram that expresses the complete statement. A contrapositive expresses the same rule, even when your paper looks different.
            </p>
          </div>

          <div className="mt-5 grid gap-2.5" role="radiogroup" aria-label="Five possible conditional diagrams">
            {choices.map((choice, choiceIndex) => {
              const selected = value === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={choicesLocked}
                  onClick={() => onChange(choice.id)}
                  className={`group relative rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--aw-accent,var(--ring)))] focus-visible:ring-offset-2 disabled:cursor-default ${
                    selected
                      ? "border-[hsl(var(--aw-accent,var(--foreground)))] bg-[hsl(var(--aw-accent,var(--muted)))/0.09]"
                      : "border-border bg-background hover:border-[hsl(var(--aw-accent,var(--foreground)))/0.55]"
                  }`}
                >
                  <span
                    className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                      selected
                        ? "border-[hsl(var(--aw-accent,var(--foreground)))] bg-[hsl(var(--aw-accent,var(--foreground)))] text-black"
                        : "border-border text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    {String.fromCharCode(65 + choiceIndex)}
                  </span>

                  <div className="space-y-2 pr-9">
                    {choice.routes.map((route, routeIndex) => (
                      <div
                        key={`${choice.id}-${routeIndex}`}
                        className="flex items-center gap-2 rounded-xl bg-[hsl(var(--muted)/0.55)] px-3 py-2.5"
                      >
                        <DiagramSideView prefix="IF" side={route.ifSide} />
                        <ArrowRight className="h-4 w-4 shrink-0 text-[hsl(var(--aw-accent,var(--muted-foreground)))]" aria-hidden="true" />
                        <DiagramSideView prefix="THEN" side={route.thenSide} />
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!resolved && !showRetry && (
              <Button onClick={onSubmit} disabled={!canSubmit} className={actionButton}>
                Check my diagram
              </Button>
            )}
            {showRetry && (
              <>
                <Button onClick={onRetry} className={actionButton}>
                  Try again
                </Button>
                <Button variant="ghost" onClick={onShowAnswer} className="text-muted-foreground">
                  Show answer
                </Button>
                <span className="text-xs text-muted-foreground">
                  Attempt {attempts} of {MAX_ATTEMPTS}
                </span>
              </>
            )}
            {resolved && (
              <Button onClick={onNext} className={actionButton}>
                {isLast ? "Finish" : "Next"}
              </Button>
            )}
          </div>

          {result && (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              className="mt-6 border-t border-border pt-6 outline-none"
              role="status"
              aria-live="polite"
            >
              <CoachFeedback
                verdict={result.verdict}
                feedback={result.feedback}
                revealed={revealed}
                resolved={resolved}
                secondaryLabel={creditedSecondaryLabel}
                item={item}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
