import { useState } from "react";
import type { BoundaryCall } from "./rounds";
import { renderInlineMarks } from "../../../prompt-format";
import "../specimen-lab.css";
import "./wings.css";

/**
 * The Boundary Room.
 *
 * One word, one proposed meaning, one call: is that inside the boundary or
 * outside it? This is where the drill's precision standard gets rehearsed, the
 * balance-not-peace, disinterested-not-uninterested distinction that the Main
 * Hall only etches in passing.
 *
 * Both the accepted and the rejected proposals are Joshua's own words: the
 * credited candidates and the authored traps. Nothing here is a synonym I chose.
 */
export function BoundaryRoom({
  round,
  onComplete,
}: {
  round: BoundaryCall[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<"accept" | "reject" | null>(null);
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const call = round[index];

  if (!round.length) {
    return (
      <div className="specimen-lab sl-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12">
        <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Boundary room</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--sl-ink-dim))]">
          This room runs on the items that name a near-miss. None in this set do.
        </p>
      </div>
    );
  }

  if (!call) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="specimen-lab sl-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Room complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--sl-ink))]">
          {right} of {results.length} boundaries held
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--sl-ink-dim))]">
          {right === results.length
            ? "You kept every near-miss outside the line. That is the difference between knowing roughly what a word means and knowing what it does not mean."
            : "The ones you let through are the ones a test writer builds a wrong answer out of."}
        </p>
      </div>
    );
  }

  const correct = picked === call.verdict;

  function choose(choice: "accept" | "reject") {
    if (picked) return;
    setPicked(choice);
    setResults((r) => [...r, { order: call.order, correct: choice === call.verdict }]);
  }

  function next() {
    setPicked(null);
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="specimen-lab sl-wing flex min-h-[560px] flex-col gap-6 px-5 py-8 md:px-12"
      data-testid="boundary-room"
    >
      <div className="flex items-center justify-between">
        <span className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Boundary room</span>
        <span className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">
          {index + 1} of {round.length}
        </span>
      </div>

      <div className="sl-fieldnote rounded-xl px-6 py-5">
        <p className="text-base leading-relaxed text-[hsl(var(--sl-ink))]">
          {renderInlineMarks(call.fieldNote, "note")}
        </p>
      </div>

      <p className="text-lg text-[hsl(var(--sl-ink))]">
        Does <em className="sl-target">{call.word}</em> mean{" "}
        <strong className="font-semibold">{call.proposal}</strong>?
      </p>

      {picked ? (
        <div className="flex flex-col gap-4" data-testid="sl-boundary-verdict">
          <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">
            {correct ? "Boundary held" : "Boundary crossed"}
            <span className="ml-3 normal-case tracking-normal">
              {call.verdict === "accept" ? "That one is inside the line." : "That one sits outside."}
            </span>
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--sl-ink-dim))]">
            {renderInlineMarks(call.why, "why")}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="sl-button specimen-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="sl-boundary-next"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3" data-testid="sl-boundary-controls">
          <button
            type="button"
            onClick={() => choose("accept")}
            autoFocus
            className="sl-button specimen-mono rounded-md px-5 py-2.5 text-xs"
            data-testid="sl-accept"
          >
            Inside the line
          </button>
          <button
            type="button"
            onClick={() => choose("reject")}
            className="sl-button specimen-mono rounded-md px-5 py-2.5 text-xs"
            data-testid="sl-reject"
          >
            Outside it
          </button>
        </div>
      )}
    </div>
  );
}
