import { useState } from "react";
import type { JudgeCall } from "./rounds";
import "../press.css";
import "./wings.css";

/**
 * The Slug Judge.
 *
 * Three one-sentence summaries of the same paragraph, one credited and two the
 * named traps. Pick the one that does the job.
 *
 * The Main Hall stages the traps physically: too-narrow prints thin, topic-only
 * prints hollow. That staging is held back here until after the pick. A hollow
 * letterform is a giveaway, and this wing exists so the student learns to see
 * the fault in the sentence itself; the shape then confirms what they read.
 */

const KIND_CAPTION = {
  credited: "This is the one. Every big idea survives it.",
  narrow: "True, but too small. It carries a detail, not the point.",
  topic: "The topic, not the point. It names the subject and stops.",
} as const;

export function SlugJudge({
  calls,
  onComplete,
}: {
  calls: JudgeCall[];
  onComplete?: (results: { order: number; correct: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [because, setBecause] = useState("");
  const [results, setResults] = useState<{ order: number; correct: boolean }[]>([]);

  const call = calls[index];

  if (!calls.length) {
    return (
      <div
        className="press pr-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="slug-judge-empty"
      >
        <p className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Slug judge</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--pr-ink-dim))]">
          This round runs on paragraphs that carry both named near misses. None in this set do, so
          there is nothing here to judge yet.
        </p>
      </div>
    );
  }

  if (!call) {
    const right = results.filter((r) => r.correct).length;
    return (
      <div className="press pr-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--pr-ink))]">
          {right} of {results.length} judged right
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
    setBecause("");
    const at = index + 1;
    setIndex(at);
    if (at >= calls.length) onComplete?.(results);
  }

  return (
    <div
      className="press pr-wing flex min-h-[560px] flex-col gap-5 px-5 py-8 md:px-12"
      data-testid="slug-judge"
    >
      <div className="flex items-center justify-between">
        <span className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Slug judge</span>
        <span className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">
          {index + 1} of {calls.length}
        </span>
      </div>

      <div className="pr-census-text rounded-sm px-5 py-4">
        <p className="press-type text-sm leading-relaxed">{call.monolith}</p>
      </div>

      <p className="text-lg text-[hsl(var(--pr-ink))]">Which sentence does the job?</p>

      <div className="flex flex-col gap-3">
        {call.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => choose(choice.id)}
            disabled={answered}
            className="pr-choice rounded-sm px-5 py-4 text-left"
            data-picked={picked === choice.id ? "true" : undefined}
            data-truth={answered && choice.id === "credited" ? "true" : undefined}
            // The thin and hollow staging only after the call, never before it.
            data-tone={answered ? choice.kind : undefined}
            data-testid={`pr-judge-${choice.kind}`}
          >
            <p className="press-type text-base leading-snug">{choice.text}</p>
            {answered ? (
              <p className="press-mono mt-2 text-xs text-[hsl(var(--pr-ink-dim))]">
                {KIND_CAPTION[choice.kind]}
              </p>
            ) : null}
          </button>
        ))}
      </div>

      {/* Captured and shown back, never scored. The call is the exercise; the
          reason is what the student takes into their own writing. */}
      <label className="flex flex-col gap-2">
        <span className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">
          In a phrase, what is wrong with the other two?
        </span>
        <input
          value={because}
          onChange={(e) => setBecause(e.target.value)}
          className="pr-input rounded-md px-3 py-2 text-sm"
          placeholder="what they leave out"
          data-testid="pr-judge-because"
        />
      </label>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="pr-judge-verdict">
          <p className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">
            {correct ? "Judged right" : "Not that one"}
          </p>
          <div>
            <p className="press-mono mb-2 text-xs text-[hsl(var(--pr-ink-dim))]">
              What had to survive
            </p>
            <ul className="flex flex-col gap-1.5">
              {call.ideas.map((idea) => (
                <li
                  key={idea.n}
                  className="press-idea flex items-start gap-3 text-sm"
                  data-state="unjudged"
                >
                  <span className="press-idea-mark" aria-hidden="true" />
                  <span className="text-[hsl(var(--pr-ink))]">{idea.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="pr-button press-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="pr-judge-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
