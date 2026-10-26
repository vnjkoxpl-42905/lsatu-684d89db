import { useState } from "react";
import type { Charge } from "../specimen";
import type { ChargeCall } from "./rounds";
import { renderInlineMarks } from "../../../prompt-format";
import "../specimen-lab.css";
import "./wings.css";

/**
 * The Charge Round.
 *
 * Valence only, at speed. This is the drill's own fallback skill given a lane:
 * his rules tell students that deciding whether a word is positive or negative
 * is a real answer, and this is where that gets rehearsed on its own.
 *
 * The round only contains items whose own text fixes a charge. When there are
 * none, it says so rather than scoring students against a valence nobody
 * authored.
 */

const OPTIONS: Charge[] = ["neg", "neutral", "pos"];
const LABEL: Record<Charge, string> = {
  neg: "Negative",
  neutral: "Neutral",
  pos: "Positive",
};

export function ChargeRound({
  round,
  onComplete,
}: {
  round: ChargeCall[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Charge | null>(null);
  const [because, setBecause] = useState("");
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const call = round[index];

  if (!round.length) {
    return (
      <div
        className="specimen-lab sl-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="charge-round-empty"
      >
        <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Charge round</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--sl-ink-dim))]">
          This round runs on items whose own writeup fixes whether the word leans positive or
          negative. None in this set do, so there is nothing here to call yet.
        </p>
      </div>
    );
  }

  if (!call) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="specimen-lab sl-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--sl-ink))]">
          {right} of {results.length} called right
        </p>
      </div>
    );
  }

  const correct = picked === call.charge;

  function choose(choice: Charge) {
    if (picked) return;
    setPicked(choice);
    setResults((r) => [...r, { order: call.order, correct: choice === call.charge }]);
  }

  function next() {
    setPicked(null);
    setBecause("");
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="specimen-lab sl-wing flex min-h-[560px] flex-col gap-6 px-5 py-8 md:px-12"
      data-testid="charge-round"
    >
      <div className="flex items-center justify-between">
        <span className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Charge round</span>
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
        Which way does <em className="sl-target">{call.word}</em> lean?
      </p>

      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => choose(o)}
            disabled={Boolean(picked)}
            className="sl-button specimen-mono rounded-md px-5 py-2.5 text-xs"
            data-picked={picked === o ? "true" : undefined}
            data-truth={picked ? (o === call.charge ? "true" : undefined) : undefined}
            data-testid={`sl-charge-${o}`}
          >
            {LABEL[o]}
          </button>
        ))}
      </div>

      {/* The one-phrase justification. Captured and shown back beside his
          reasoning, never scored: this lane is about the call. */}
      <label className="flex flex-col gap-2">
        <span className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">
          In a phrase, why?
        </span>
        <input
          value={because}
          onChange={(e) => setBecause(e.target.value)}
          className="sl-input rounded-md px-3 py-2 text-sm"
          placeholder="the thing in the sentence that told you"
          data-testid="sl-charge-because"
        />
      </label>

      {picked ? (
        <div className="flex flex-col gap-3" data-testid="sl-charge-verdict">
          <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">
            {correct ? "Called right" : `The paragraph leans ${LABEL[call.charge].toLowerCase()}`}
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--sl-ink-dim))]">
            {renderInlineMarks(call.why, "why")}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="sl-button specimen-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="sl-charge-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
