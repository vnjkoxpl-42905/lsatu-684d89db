import { useState } from "react";
import type { AssayCall } from "./rounds";
import "../polarity.css";
import "./wings.css";

/**
 * The Assay.
 *
 * What kind of claim is on the plate? Every negation move in this drill follows
 * from that answer, so it is the step before the chamber's own: you cannot pick
 * the weakest contradiction until you know what you are contradicting.
 *
 * This is not one of the two wings the spec names. Both of those need candidate
 * negations the bank does not author, and inventing them would put my sentences
 * in front of a student as near misses of his. The gap is recorded in the
 * drill's README; it is bank work, not code.
 */

export function Assay({
  round,
  onComplete,
}: {
  round: AssayCall[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const call = round[index];

  if (!round.length) {
    return (
      <div
        className="polarity po-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="assay-empty"
      >
        <p className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">The assay</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--po-ink-dim))]">
          This round needs at least four kinds of statement to choose between. This set does not
          carry that many, so there is nothing here to assay yet.
        </p>
      </div>
    );
  }

  if (!call) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="polarity po-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--po-ink))]">
          {right} of {results.length} identified
        </p>
      </div>
    );
  }

  const answered = picked !== null;
  const correct = picked === call.kind;

  function choose(kind: string) {
    if (answered) return;
    setPicked(kind);
    setResults((r) => [...r, { order: call.order, correct: kind === call.kind }]);
  }

  function next() {
    setPicked(null);
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="polarity po-wing flex min-h-[560px] flex-col justify-center gap-7 px-5 py-8 md:px-12"
      data-testid="assay"
    >
      <div className="flex items-center justify-between">
        <span className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">The assay</span>
        <span className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">
          {index + 1} of {round.length}
        </span>
      </div>

      <div className="po-face rounded-sm px-7 py-7" data-testid="po-assay-statement">
        <p className="text-xl leading-snug">{call.statement}</p>
      </div>

      <p className="text-base text-[hsl(var(--po-ink-dim))]">What kind of claim is this?</p>

      <div className="flex flex-wrap gap-2.5">
        {call.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => choose(o)}
            disabled={answered}
            className="po-button polarity-mono rounded-md px-4 py-2.5 text-xs"
            data-picked={picked === o ? "true" : undefined}
            data-truth={answered && o === call.kind ? "true" : undefined}
            data-testid={`po-assay-option`}
          >
            {o}
          </button>
        ))}
      </div>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="po-assay-verdict">
          <p className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">
            {correct ? "Identified" : `It is a ${call.kind}`}
          </p>
          {/* The bank's own note on how this kind gets negated: the reason the
              identification matters at all. */}
          <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--po-ink-dim))]">
            {call.why}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="po-button polarity-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="po-assay-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
