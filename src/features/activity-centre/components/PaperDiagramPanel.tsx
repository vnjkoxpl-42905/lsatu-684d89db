import { useEffect, useRef, useState } from "react";
import { ArrowRight, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActivityItem, FeedbackState } from "../api/types";
import { MAX_ATTEMPTS } from "../api/types";
import type { DiagramSide, PaperDiagramChoice } from "../worlds/switchyard/diagramChoices";
import { CoachFeedback } from "./CoachFeedback";
import { NegatedCondition } from "../conditionals/NegatedCondition";
import "./paper-diagram-timing.css";

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
  diagramSeconds?: number;
  /** Absolute deadline owned and persisted by the runner. Never restarted here. */
  paperDeadline?: string;
  phaseLabel?: string;
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
        {side.inverted ? <NegatedCondition text={side.text} /> : <span>{side.text}</span>}
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
  diagramSeconds,
  paperDeadline,
  phaseLabel,
}: PaperDiagramPanelProps) {
  const [localPaperReady, setPaperReady] = useState(false);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const canSubmit = choices.some(choice => choice.id === value) && !judging && !resolved && !result;
  const showRetry = !!result && result.verdict !== "correct" && !revealed && attempts < MAX_ATTEMPTS;
  const choicesLocked = judging || resolved || revealed || !!result;
  const pairedChoices = choices.every(choice => !!choice.contrapositiveRoutes?.length);
  const timed = !!diagramSeconds && diagramSeconds > 0;
  const deadline = paperDeadline ? Date.parse(paperDeadline) : NaN;
  const [now, setNow] = useState(() => Date.now());
  const paperReady = savedPaperReady ?? localPaperReady;
  const promptHidden = timed && (paperReady || localPaperReady || (Number.isFinite(deadline) && now >= deadline));
  const expiryNotified = useRef(false);
  const remaining = timed && Number.isFinite(deadline)
    ? Math.max(0, Math.min(diagramSeconds!, Math.ceil((deadline - now) / 1000))) : null;
  const ready = () => { setPaperReady(true); onPaperReady?.(); };

  useEffect(() => {
    if (!timed || savedPaperReady || localPaperReady || !Number.isFinite(deadline)) return;
    const tick = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= deadline && !expiryNotified.current) {
        expiryNotified.current = true;
        setPaperReady(true);
        onPaperReady?.();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [timed, savedPaperReady, localPaperReady, deadline, onPaperReady]);

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
      {phaseLabel && <p className="paper-phase-label">{phaseLabel}</p>}
      {timed && !paperReady && !promptHidden && <>
        <div className="paper-timing-header">
          <span>Diagramming time</span>
          <span role="timer" aria-live="off" aria-label={remaining === null ? "Preparing diagram timer" : `${remaining} seconds remaining`} className="paper-timing-clock">
            {remaining === null ? "Preparing…" : `0:${String(remaining).padStart(2, "0")}`}
          </span>
        </div>
        <div className="paper-timing-track" aria-hidden="true"><span style={{ width: `${remaining === null ? 100 : remaining / diagramSeconds! * 100}%` }} /></div>
      </>}
      {timed && (!promptHidden || resolved) && <div className="paper-timed-statement">
        <span>{resolved ? "Original statement" : "Statement"}</span>
        <p>{item.prompt}</p>
      </div>}
      {!paperReady && promptHidden ? (
        <div className="py-8">
          <p className="paper-hidden-note" role="status">Statement hidden. Save your diagramming step to open the untimed choices.</p>
          <Button className={actionButton} onClick={ready}>Continue to choices</Button>
        </div>
      ) : !paperReady ? (
        <div className="flex min-h-[360px] flex-1 flex-col justify-center">
          <PencilLine className="h-7 w-7 text-[hsl(var(--aw-accent,var(--ac-emerald)))]" aria-hidden="true" />
          <h2 className="mt-5 font-serif text-2xl font-semibold text-foreground">Diagram it on paper</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Write the diagram and its contrapositive. Keep every condition and negation.
          </p>
          {timed && <p className="paper-timing-instruction">The statement disappears when time ends or you’re ready. Then use your paper to choose an answer. Answer choices are untimed.</p>}
          <Button className={`${actionButton} mt-7`} onClick={ready} autoFocus>
            {timed ? "I’m ready" : "I’ve diagrammed it"}
          </Button>
        </div>
      ) : (
        <>
          <div>
            {timed && !resolved && <p className="paper-hidden-note" role="status">Statement hidden. Use your paper. Take the time you need to choose.</p>}
            <h2 className="font-serif text-xl font-semibold text-foreground">Which option matches the diagram you made?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {pairedChoices ? "Check both rows. The diagram and contrapositive must both express the original statement." : "Choose the diagram that expresses the complete statement."}
            </p>
          </div>

          <div className="mt-5 grid gap-2.5" role="radiogroup" aria-label={`${choices.length} conditional diagram options`}>
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

                  <div className="paper-paired-option pr-9">
                    {[{ label: "Diagram", routes: choice.routes }, ...(choice.contrapositiveRoutes ? [{ label: "Contrapositive", routes: choice.contrapositiveRoutes }] : [])].map(group => <div className="paper-paired-row" key={group.label}>
                    <span className="paper-paired-label">{group.label}</span>
                    {group.routes.map((route, routeIndex) => (
                      <div
                        key={`${choice.id}-${routeIndex}`}
                        className="flex items-center gap-2 rounded-xl bg-[hsl(var(--muted)/0.55)] px-3 py-2.5"
                      >
                        <DiagramSideView prefix="IF" side={route.ifSide} />
                        <ArrowRight className="h-4 w-4 shrink-0 text-[hsl(var(--aw-accent,var(--muted-foreground)))]" aria-hidden="true" />
                        <DiagramSideView prefix="THEN" side={route.thenSide} />
                      </div>
                    ))}
                    </div>)}
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
