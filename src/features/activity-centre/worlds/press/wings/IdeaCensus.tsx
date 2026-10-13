import { useState } from "react";
import type { CensusPage } from "./rounds";
import "../press.css";
import "./wings.css";

/**
 * The Idea Census.
 *
 * The Main Hall asks for a summary and has to be told which ideas survived.
 * This wing asks the question underneath it, which nobody has to judge: given
 * this paragraph and this candidate, does the candidate have to survive?
 *
 * The paragraph stays on screen for every call. The whole skill is reading a
 * candidate against the text in front of you, so taking the text away would
 * turn it into a memory exercise.
 */

export function IdeaCensus({
  pages,
  onComplete,
}: {
  pages: CensusPage[];
  onComplete?: (results: { order: number; right: number; of: number }[]) => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [pageRight, setPageRight] = useState(0);
  const [results, setResults] = useState<{ order: number; right: number; of: number }[]>([]);

  const page = pages[pageIndex];

  if (!pages.length) {
    return (
      <div
        className="press pr-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="idea-census-empty"
      >
        <p className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Idea census</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--pr-ink-dim))]">
          This census runs on paragraphs whose big ideas are written down. None in this set are, so
          there is nothing here to count yet.
        </p>
      </div>
    );
  }

  if (!page) {
    const right = results.reduce((n, r) => n + r.right, 0);
    const of = results.reduce((n, r) => n + r.of, 0);
    return (
      <div className="press pr-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Census complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--pr-ink))]">
          {right} of {of} called right
        </p>
      </div>
    );
  }

  const candidate = page.candidates[at];
  const answered = picked !== null;
  const correct = answered && picked === candidate.survives;

  function choose(choice: boolean) {
    if (answered) return;
    setPicked(choice);
    if (choice === candidate.survives) setPageRight((n) => n + 1);
  }

  function next() {
    setPicked(null);
    const nextAt = at + 1;
    if (nextAt < page.candidates.length) {
      setAt(nextAt);
      return;
    }
    // The page is done. Bank it and move to the next paragraph.
    const banked = [...results, { order: page.order, right: pageRight, of: page.candidates.length }];
    setResults(banked);
    setPageRight(0);
    setAt(0);
    const nextPage = pageIndex + 1;
    setPageIndex(nextPage);
    if (nextPage >= pages.length) onComplete?.(banked);
  }

  return (
    <div
      className="press pr-wing flex min-h-[560px] flex-col gap-5 px-5 py-8 md:px-12"
      data-testid="idea-census"
    >
      <div className="flex items-center justify-between">
        <span className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Idea census</span>
        <span className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">
          Paragraph {pageIndex + 1} of {pages.length} · {at + 1}/{page.candidates.length}
        </span>
      </div>

      {/* The paragraph, at reading weight rather than as a monolith: this wing
          is not about its mass, it is about what is in it. */}
      <div className="pr-census-text rounded-sm px-5 py-4">
        <p className="press-type text-sm leading-relaxed">{page.monolith}</p>
      </div>

      <p className="text-lg text-[hsl(var(--pr-ink))]">Does this have to survive?</p>

      <div className="pr-candidate rounded-sm px-5 py-4" data-testid="pr-candidate">
        <p className="press-type text-base leading-snug">{candidate.text}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => choose(true)}
          disabled={answered}
          className="pr-button press-mono rounded-md px-5 py-2.5 text-xs"
          data-picked={picked === true ? "true" : undefined}
          data-truth={answered ? (candidate.survives ? "true" : undefined) : undefined}
          data-testid="pr-census-yes"
        >
          Must survive
        </button>
        <button
          type="button"
          onClick={() => choose(false)}
          disabled={answered}
          className="pr-button press-mono rounded-md px-5 py-2.5 text-xs"
          data-picked={picked === false ? "true" : undefined}
          data-truth={answered ? (!candidate.survives ? "true" : undefined) : undefined}
          data-testid="pr-census-no"
        >
          Does not
        </button>
      </div>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="pr-census-verdict">
          <p className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">
            {correct ? "Called right" : candidate.survives ? "It does" : "It does not"}
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--pr-ink-dim))]">
            {candidate.why}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="pr-button press-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="pr-census-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
