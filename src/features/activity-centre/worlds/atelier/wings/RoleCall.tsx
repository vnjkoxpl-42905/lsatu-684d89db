import { useState } from "react";
import type { RoleCall as Call } from "./rounds";
import "../atelier.css";
import "./wings.css";

/**
 * Role Call.
 *
 * One claim at a time, off its argument: is this the claim being proved, or is
 * it working for the claim being proved? The Step-1 cut, drilled to reflex.
 *
 * The claim arrives alone on purpose. Seeing it in the paragraph lets position
 * answer the question, and position is exactly the habit this drill breaks.
 * The argument appears after the call, so the student can check themselves.
 */

export function RoleCall({
  round,
  onComplete,
}: {
  round: Call[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const call = round[index];

  if (!round.length) {
    return (
      <div
        className="atelier at-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="role-call-empty"
      >
        <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">Role call</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--at-ink-dim))]">
          This round runs on arguments whose conclusion can be pointed at in the text. None in this
          set can, so there is nothing here to call yet.
        </p>
      </div>
    );
  }

  if (!call) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="atelier at-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--at-ink))]">
          {right} of {results.length} called right
        </p>
      </div>
    );
  }

  const answered = picked !== null;
  const correct = answered && picked === call.isConclusion;

  function choose(choice: boolean) {
    if (answered) return;
    setPicked(choice);
    setResults((r) => [...r, { order: call.order, correct: choice === call.isConclusion }]);
  }

  function next() {
    setPicked(null);
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="atelier at-wing flex min-h-[560px] flex-col gap-6 px-5 py-8 md:px-12"
      data-testid="role-call"
    >
      <div className="flex items-center justify-between">
        <span className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">Role call</span>
        <span className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">
          {index + 1} of {round.length} · Level {call.level}
        </span>
      </div>

      <div className="at-pane rounded-sm px-6 py-5" data-testid="at-role-claim">
        <p className="atelier-type text-lg leading-snug">{call.claim}</p>
      </div>

      <p className="text-base text-[hsl(var(--at-ink-dim))]">
        Is this the claim being proved, or is it holding one up?
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => choose(true)}
          disabled={answered}
          className="at-button atelier-mono rounded-md px-5 py-2.5 text-xs"
          data-picked={picked === true ? "true" : undefined}
          data-truth={answered && call.isConclusion ? "true" : undefined}
          data-testid="at-role-conclusion"
        >
          Being proved
        </button>
        <button
          type="button"
          onClick={() => choose(false)}
          disabled={answered}
          className="at-button atelier-mono rounded-md px-5 py-2.5 text-xs"
          data-picked={picked === false ? "true" : undefined}
          data-truth={answered && !call.isConclusion ? "true" : undefined}
          data-testid="at-role-support"
        >
          Holding one up
        </button>
      </div>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="at-role-verdict">
          <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">
            {correct ? "Called right" : call.isConclusion ? "It is being proved" : "It is support"}
          </p>
          {/* The argument, after the call. Checking yourself against the whole
              thing is the point; seeing it first would answer the question. */}
          <div className="at-context rounded-sm px-5 py-4">
            <p className="atelier-type text-sm leading-relaxed">{call.argument}</p>
          </div>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="at-button atelier-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="at-role-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
