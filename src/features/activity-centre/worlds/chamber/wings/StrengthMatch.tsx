import { useState } from "react";
import type { MatchCall } from "./rounds";
import "../chamber.css";
import "./wings.css";

/**
 * Strength Match.
 *
 * Their claim, and every authored near miss the item carries. Pick the one at
 * the author's exact strength.
 *
 * The Main Hall asks the student to produce that claim. Here they only have to
 * recognise it, which is the easier half of the same skill and the right place
 * to learn what an overshoot looks like from outside your own sentence.
 */

const KIND_CAPTION = {
  credited: "The minimal negation. It contradicts their claim and stops there.",
  overshoot: "More than the author claims.",
  premise: "Evidence. It holds a claim up, it is not the claim.",
  "vague-referential": "Points at their claim without stating the author's.",
  "scope-drop": "The right claim with a qualifier missing.",
} as const;

export function StrengthMatch({
  round,
  onComplete,
}: {
  round: MatchCall[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const call = round[index];

  if (!round.length) {
    return (
      <div
        className="chamber ch-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="strength-match-empty"
      >
        <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Strength match</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ch-ink-dim))]">
          This round needs at least three authored candidates per argument, so a call cannot be
          guessed between two. None in this set carry that many, so there is nothing here to weigh
          yet.
        </p>
      </div>
    );
  }

  if (!call) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="chamber ch-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--ch-ink))]">
          {right} of {results.length} matched
        </p>
      </div>
    );
  }

  const answered = picked !== null;
  const correct = picked === "credited";

  function choose(id: string) {
    if (answered) return;
    setPicked(id);
    setResults((r) => [...r, { order: call.order, correct: id === "credited" }]);
  }

  function next() {
    setPicked(null);
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="chamber ch-wing flex min-h-[560px] flex-col gap-5 px-5 py-8 md:px-12"
      data-testid="strength-match"
    >
      <div className="flex items-center justify-between">
        <span className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Strength match</span>
        <span className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">
          {index + 1} of {round.length} · Level {call.level}
        </span>
      </div>

      <div>
        <p className="chamber-mono mb-2 text-xs text-[hsl(var(--ch-ink-dim))]">Their claim</p>
        <div className="ch-plinth rounded-sm px-5 py-4" data-testid="ch-match-attributed">
          <p className="chamber-type text-base leading-snug">{call.attributed}</p>
        </div>
      </div>

      <p className="text-base text-[hsl(var(--ch-ink-dim))]">
        Which one states the author's claim at their exact strength?
      </p>

      <div className="flex flex-col gap-3">
        {call.candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => choose(c.id)}
            disabled={answered}
            className="ch-choice rounded-sm px-5 py-4 text-left"
            data-picked={picked === c.id ? "true" : undefined}
            data-truth={answered && c.kind === "credited" ? "true" : undefined}
            data-testid={`ch-match-${c.id}`}
          >
            <p className="chamber-type text-base leading-snug">{c.text}</p>
            {answered ? (
              <p className="chamber-mono mt-2 text-xs text-[hsl(var(--ch-ink-dim))]">
                {KIND_CAPTION[c.kind]}
              </p>
            ) : null}
          </button>
        ))}
      </div>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="ch-match-verdict">
          <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">
            {correct ? "Matched" : "Not that one"}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="ch-button chamber-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="ch-match-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
