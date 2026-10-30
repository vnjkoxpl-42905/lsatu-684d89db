import { useState } from "react";
import { TRAPS, TRAP_LABEL, type AutopsyCase } from "./rounds";
import "../chamber.css";
import "./wings.css";

/**
 * Trap Autopsy.
 *
 * A flawed answer to a rebuttal item, and the question is which of the four
 * archetypes it commits. Diagnosing somebody else's error is the check that
 * catches your own, and it is easier to run on a sentence you are not attached
 * to.
 *
 * Every answer under examination is authored: the bank's quoted overshoot, its
 * quoted scope note, or a sentence lifted whole from the argument.
 */

const WHY: Record<string, string> = {
  overshoot: "It contradicts their claim and then keeps going past what the author argued.",
  "scope-drop": "The claim is right, but a qualifier that changes its reach has gone missing.",
  "vague-referential": "It points at their claim and never says what the author's claim is.",
  premise: "It restates the argument's evidence rather than the claim that evidence supports.",
};

export function TrapAutopsy({
  round,
  onComplete,
}: {
  round: AutopsyCase[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [fix, setFix] = useState("");
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const item = round[index];

  if (!round.length) {
    return (
      <div
        className="chamber ch-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="trap-autopsy-empty"
      >
        <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Trap autopsy</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ch-ink-dim))]">
          This round examines flawed answers the bank itself names. None in this set carry one, so
          there is nothing here to open up yet.
        </p>
      </div>
    );
  }

  if (!item) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="chamber ch-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--ch-ink))]">
          {right} of {results.length} diagnosed
        </p>
      </div>
    );
  }

  const answered = picked !== null;
  const correct = picked === item.trap;

  function choose(t: string) {
    if (answered) return;
    setPicked(t);
    setResults((r) => [...r, { order: item.order, correct: t === item.trap }]);
  }

  function next() {
    setPicked(null);
    setFix("");
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="chamber ch-wing flex min-h-[560px] flex-col gap-5 px-5 py-8 md:px-12"
      data-testid="trap-autopsy"
    >
      <div className="flex items-center justify-between">
        <span className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Trap autopsy</span>
        <span className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">
          {index + 1} of {round.length} · Level {item.level}
        </span>
      </div>

      <div className="ch-context rounded-sm px-5 py-4">
        <p className="chamber-mono mb-2 text-xs text-[hsl(var(--ch-ink-dim))]">The argument</p>
        <p className="chamber-type text-sm leading-relaxed">{item.argument}</p>
      </div>

      <div>
        <p className="chamber-mono mb-2 text-xs text-[hsl(var(--ch-ink-dim))]">
          A student's answer
        </p>
        <div className="ch-specimen rounded-sm px-5 py-4" data-testid="ch-autopsy-answer">
          <p className="chamber-type text-base leading-snug">{item.answer}</p>
        </div>
      </div>

      <p className="text-base text-[hsl(var(--ch-ink-dim))]">What has it done wrong?</p>

      <div className="flex flex-wrap gap-2.5">
        {TRAPS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => choose(t)}
            disabled={answered}
            className="ch-button chamber-mono rounded-md px-4 py-2.5 text-xs"
            data-picked={picked === t ? "true" : undefined}
            data-truth={answered && t === item.trap ? "true" : undefined}
            data-testid={`ch-autopsy-${t}`}
          >
            {TRAP_LABEL[t]}
          </button>
        ))}
      </div>

      {/* The one-line fix. Captured and shown beside the credited claim, never
          scored: naming the trap is the exercise, and writing the repair is
          what the student takes back into their own answers. */}
      <label className="flex flex-col gap-2">
        <span className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">
          Fix it in one line
        </span>
        <input
          value={fix}
          onChange={(e) => setFix(e.target.value)}
          className="ch-input rounded-md px-3 py-2 text-sm"
          placeholder="what the author actually claims"
          data-testid="ch-autopsy-fix"
        />
      </label>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="ch-autopsy-verdict">
          <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">
            {correct ? "Diagnosed" : `It is a ${TRAP_LABEL[item.trap].toLowerCase()}`}
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ch-ink-dim))]">
            {WHY[item.trap]}
          </p>
          <div>
            <p className="chamber-mono mb-1.5 text-xs text-[hsl(var(--ch-ink-dim))]">
              The author's claim
            </p>
            <div className="ch-plinth rounded-sm px-5 py-4">
              <p className="chamber-type text-base leading-snug">{item.credited}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="ch-button chamber-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="ch-autopsy-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
