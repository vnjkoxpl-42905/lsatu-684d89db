import { useState } from "react";
import { foundPhrase, type ReverseCall } from "./rounds";
import "../loom.css";
import "./wings.css";

/**
 * The Reverse Loom.
 *
 * Here is an idea from the first sheet; find where the passage picks it up
 * again. The lower sheet is unmarked, because the marking is the answer.
 *
 * This is the harder direction and the one real reading comprehension asks for:
 * you meet the idea first and have to notice it coming back in different words.
 */

export function ReverseLoom({
  round,
  onComplete,
}: {
  round: ReverseCall[];
  onComplete?: (results: { order: number; found: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ order: number; found: boolean }[]>([]);

  const call = round[index];

  if (!round.length) {
    return (
      <div
        className="loom lo-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="reverse-loom-empty"
      >
        <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">Reverse loom</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--lo-paper)/0.7)]">
          This wing runs on passages whose referenced idea can be pointed at. None in this set can,
          so there is nothing here to trace yet.
        </p>
      </div>
    );
  }

  if (!call) {
    const found = results.filter((r) => r.found).length;
    return (
      <div className="loom lo-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--lo-paper))]">
          {found} of {results.length} traced
        </p>
      </div>
    );
  }

  const found = submitted && foundPhrase(call, answer);

  function submit() {
    if (!answer.trim() || submitted) return;
    setSubmitted(true);
    setResults((r) => [...r, { order: call.order, found: foundPhrase(call, answer) }]);
  }

  function next() {
    setSubmitted(false);
    setAnswer("");
    const at = index + 1;
    setIndex(at);
    if (at >= round.length) onComplete?.(results);
  }

  return (
    <div
      className="loom lo-wing flex min-h-[560px] flex-col gap-5 px-5 py-8 md:px-12"
      data-testid="reverse-loom"
    >
      <div className="flex items-center justify-between">
        <span className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">Reverse loom</span>
        <span className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">
          {index + 1} of {round.length} · Q{call.rung}
        </span>
      </div>

      <div>
        <p className="loom-mono mb-2 text-xs text-[hsl(var(--lo-paper)/0.6)]">The idea</p>
        <div className="lo-sheet rounded-sm px-6 py-4" data-testid="lo-reverse-idea">
          <p className="text-base leading-relaxed">{call.idea}</p>
        </div>
      </div>

      <p className="text-base text-[hsl(var(--lo-paper)/0.75)]">
        Where does the passage pick this up again? Quote the phrase.
      </p>

      <div>
        <div className="lo-sheet rounded-sm px-6 py-4" data-testid="lo-reverse-caller">
          {/* Unmarked. Bracketing it here would be handing over the answer. */}
          <p className="text-base leading-relaxed">{call.caller}</p>
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">The phrase</span>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          className="lo-input rounded-md px-3 py-2 text-sm"
          placeholder="quote it"
          data-testid="lo-reverse-input"
        />
      </label>

      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          disabled={!answer.trim()}
          className="lo-button loom-mono w-fit rounded-md px-4 py-2 text-xs"
          data-testid="lo-reverse-submit"
        >
          Trace it
        </button>
      ) : (
        <div className="flex flex-col gap-3" data-testid="lo-reverse-verdict">
          <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">
            {found ? "Traced" : "Not that one"}
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--lo-paper)/0.75)]">
            The passage picks it up at "{call.phrase}".
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="lo-button loom-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="lo-reverse-next"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
