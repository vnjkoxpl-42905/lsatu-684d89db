import { useState } from "react";
import { termsReached, type DecodeCard } from "./rounds";
import "../loom.css";
import "./wings.css";

/**
 * The Decode Bench.
 *
 * The dense phrase with no passage behind it. Take it apart: what do its words
 * actually mean? That is step one of the five-step breakdown, drilled alone.
 *
 * Nothing here is scored against the student's wording. The bench reports which
 * of the phrase's own hard terms they engaged with and then shows the authored
 * decode; judging a vocabulary paraphrase as right or wrong is the Coach's job
 * and this bench cannot do it.
 */

export function DecodeBench({
  cards,
  onComplete,
}: {
  cards: DecodeCard[];
  onComplete?: (written: { order: number; attempt: string }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [written, setWritten] = useState<{ order: number; attempt: string }[]>([]);

  const card = cards[index];

  if (!cards.length) {
    return (
      <div
        className="loom lo-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="decode-bench-empty"
      >
        <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">The decode bench</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--lo-paper)/0.7)]">
          This bench runs on phrases the bank decodes itself. None in this set carry one, so there
          is nothing here to take apart yet.
        </p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="loom lo-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">Bench complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--lo-paper))]">
          {written.length} {written.length === 1 ? "phrase" : "phrases"} taken apart
        </p>
      </div>
    );
  }

  const reached = revealed ? termsReached(card, attempt) : [];

  function reveal() {
    if (!attempt.trim() || revealed) return;
    setRevealed(true);
    setWritten((w) => [...w, { order: card.order, attempt: attempt.trim() }]);
  }

  function next() {
    setRevealed(false);
    setAttempt("");
    const at = index + 1;
    setIndex(at);
    if (at >= cards.length) onComplete?.(written);
  }

  return (
    <div
      className="loom lo-wing flex min-h-[560px] flex-col justify-center gap-6 px-5 py-8 md:px-12"
      data-testid="decode-bench"
    >
      <div className="flex items-center justify-between">
        <span className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">The decode bench</span>
        <span className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">
          {index + 1} of {cards.length}
        </span>
      </div>

      {/* The phrase alone. No passage: that is the whole point of the bench. */}
      <p
        className="lo-phrase-alone text-center text-3xl md:text-4xl"
        data-testid="lo-decode-phrase"
      >
        {card.phrase}
      </p>

      <label className="mx-auto flex w-full max-w-xl flex-col gap-2">
        <span className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">
          What do its words mean?
        </span>
        <textarea
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          disabled={revealed}
          rows={2}
          className="lo-input w-full rounded-md px-3 py-2 text-sm"
          placeholder="take it apart"
          data-testid="lo-decode-input"
        />
      </label>

      {!revealed ? (
        <button
          type="button"
          onClick={reveal}
          disabled={!attempt.trim()}
          className="lo-button loom-mono mx-auto w-fit rounded-md px-4 py-2 text-xs"
          data-testid="lo-decode-reveal"
        >
          Take it apart
        </button>
      ) : (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3" data-testid="lo-decode-verdict">
          <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">
            {reached.length
              ? `You worked on ${reached.join(", ")}`
              : "The bench did not see either term in what you wrote"}
          </p>
          <p className="lo-decode pl-3 text-sm leading-relaxed">{card.decode}</p>
          <p className="max-w-prose text-xs leading-relaxed text-[hsl(var(--lo-paper)/0.5)]">
            Whether your wording is right is not something the bench can judge. Compare it yourself.
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="lo-button loom-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="lo-decode-next"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
