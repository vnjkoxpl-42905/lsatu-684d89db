import { useState } from "react";
import type { RelationKind } from "../observatory";
import type { Flash } from "./rounds";
import "../observatory.css";
import "./wings.css";

/**
 * The Indicator Speed Round.
 *
 * One bare indicator on the sky, and the student calls its type. This is the
 * recognition layer the Main Hall's full statements sit on.
 *
 * There is no timer. The spec asks for "under three seconds each" and a clock
 * would be the obvious way to say that, but a countdown that scores a student
 * would be measuring their reading speed on a phone as much as their
 * recognition. The round shows the count instead, and the pressure comes from
 * the indicator standing alone with no sentence to reason from.
 */

const OPTIONS: RelationKind[] = ["conditional", "causal", "comparative"];
const LABEL: Record<RelationKind, string> = {
  conditional: "Conditional",
  causal: "Causal",
  comparative: "Comparison",
};

export function SpeedRound({
  round,
  onComplete,
}: {
  round: Flash[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<RelationKind | null>(null);
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const flash = round[index];

  if (!round.length) {
    return (
      <div
        className="observatory ob-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="speed-round-empty"
      >
        <p className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
          Indicator speed round
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ob-ink-dim))]">
          This round runs on indicators the bank names. None in this set do, so there is nothing
          here to call yet.
        </p>
      </div>
    );
  }

  if (!flash) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="observatory ob-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--ob-ink))]">
          {right} of {results.length} called right
        </p>
      </div>
    );
  }

  const answered = picked !== null;
  const correct = answered && picked === flash.kind;

  function choose(kind: RelationKind) {
    if (answered) return;
    setPicked(kind);
    setResults((r) => [...r, { order: flash.order, correct: kind === flash.kind }]);
  }

  function next() {
    setPicked(null);
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="observatory ob-wing flex min-h-[560px] flex-col justify-center gap-8 px-5 py-8 md:px-12"
      data-testid="speed-round"
    >
      <div className="flex items-center justify-between">
        <span className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
          Indicator speed round
        </span>
        <span className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
          {index + 1} of {round.length} · Rung {flash.rung}
        </span>
      </div>

      <p
        className="ob-flash observatory-type text-center text-4xl md:text-5xl"
        data-testid="ob-flash"
      >
        {flash.indicator}
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {OPTIONS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => choose(k)}
            disabled={answered}
            className="ob-button observatory-mono rounded-md px-5 py-2.5 text-xs"
            data-picked={picked === k ? "true" : undefined}
            data-truth={answered && k === flash.kind ? "true" : undefined}
            data-testid={`ob-speed-${k}`}
          >
            {LABEL[k]}
          </button>
        ))}
      </div>

      {answered ? (
        <div className="flex flex-col items-center gap-3" data-testid="ob-speed-verdict">
          <p className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
            {correct ? "Called right" : `It is ${LABEL[flash.kind].toLowerCase()}`}
          </p>
          {/* The statement it came from, after the call: seeing the indicator
              back in context is what makes the bare word mean something. */}
          <p className="max-w-prose text-center text-sm leading-relaxed text-[hsl(var(--ob-ink-dim))]">
            {flash.statement}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="ob-button observatory-mono rounded-md px-4 py-2 text-xs"
            data-testid="ob-speed-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
