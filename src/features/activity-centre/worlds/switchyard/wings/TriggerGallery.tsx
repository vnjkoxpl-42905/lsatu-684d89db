import { useState } from "react";
import type { Lever, LeverWord, RoundItem } from "./rounds";
import "../switchyard.css";
import "./wings.css";

/**
 * The Trigger Gallery.
 *
 * The hard indicator lexicon as a wall of engraved switch levers. Pull one and
 * it demands a single call on a real bank statement that turns on that word:
 * which of these two clauses is the necessary condition?
 *
 * The call is between the item's two actual clauses rather than between the
 * labels "sufficient" and "necessary". Most of this lexicon marks necessity, so
 * a label question would have a lopsided prior a student could ride without
 * reading. Choosing between two clauses is an even call every time, and it is
 * the same call the yard asks for.
 */

export interface TriggerGalleryProps {
  levers: Lever[];
  /**
   * The student's real miss count per lever, when their history is loaded.
   * Omitted and the gallery shows no counts rather than inventing a weighting.
   */
  misses?: Partial<Record<LeverWord, number>>;
}

export function TriggerGallery({ levers, misses }: TriggerGalleryProps) {
  const [pulled, setPulled] = useState<Lever | null>(null);

  if (pulled) {
    return <LeverDrill lever={pulled} onExit={() => setPulled(null)} />;
  }

  return (
    <div
      className="switchyard sy-wing min-h-[560px] px-5 py-8 md:px-12"
      data-testid="trigger-gallery"
    >
      <p className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">Trigger gallery</p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-[hsl(var(--sy-ink-dim))]">
        Every lever here is a word that decides which way the logic runs. Pull one and call the
        necessary condition. Only if and the only sit side by side because that is the pair that
        gets confused.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {levers.map((lever) => {
          const missed = misses?.[lever.word];
          return (
            <button
              key={lever.word}
              type="button"
              onClick={() => setPulled(lever)}
              className="sy-lever rounded-xl px-4 py-4 text-left"
              data-testid={`sy-lever-${lever.word.replace(/\s+/g, "-")}`}
            >
              <span className="sy-lever-arm" aria-hidden="true" />
              <span className="switchyard-mono block text-sm text-[hsl(var(--sy-ink))]">
                {lever.word}
              </span>
              <span className="mt-1 block text-xs text-[hsl(var(--sy-ink-dim))]">
                {lever.prompts.length} {lever.prompts.length === 1 ? "statement" : "statements"}
                {missed ? ` · ${missed} missed` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LeverDrill({ lever, onExit }: { lever: Lever; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [hits, setHits] = useState(0);

  const prompt: RoundItem | undefined = lever.prompts[index];

  if (!prompt) {
    return (
      <div className="switchyard sy-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">{lever.word}</p>
        <p className="ac-display text-2xl text-[hsl(var(--sy-ink))]">
          {hits} of {lever.prompts.length} called right
        </p>
        <button
          type="button"
          onClick={onExit}
          autoFocus
          className="sy-ack switchyard-mono mt-2 w-fit rounded-md px-4 py-2 text-xs"
          data-testid="sy-lever-back"
        >
          Back to the gallery
        </button>
      </div>
    );
  }

  const options = prompt.swapped
    ? [prompt.ifText, prompt.thenText]
    : [prompt.thenText, prompt.ifText];
  const correct = picked === prompt.thenText;

  function choose(text: string) {
    if (picked) return;
    setPicked(text);
    if (text === prompt.thenText) setHits((h) => h + 1);
  }

  return (
    <div
      className="switchyard sy-wing flex min-h-[560px] flex-col gap-6 px-5 py-8 md:px-12"
      data-testid="sy-lever-drill"
    >
      <div className="flex items-center justify-between">
        <span className="switchyard-mono text-xs text-[hsl(var(--sy-signal))]">{lever.word}</span>
        <span className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">
          {index + 1} of {lever.prompts.length}
        </span>
      </div>

      <div className="sy-board rounded-2xl px-6 py-5">
        <p className="ac-display text-lg leading-snug text-[hsl(var(--sy-ink))]">
          {prompt.statement}
        </p>
      </div>

      <p className="text-sm text-[hsl(var(--sy-ink-dim))]">Which one is the necessary condition?</p>

      <div className="grid gap-3">
        {options.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => choose(text)}
            disabled={Boolean(picked)}
            className="sy-choice rounded-[10px] px-4 py-3 text-left text-base leading-snug"
            data-picked={picked === text ? "true" : undefined}
            data-truth={picked ? (text === prompt.thenText ? "necessary" : "sufficient") : undefined}
            data-testid="sy-choice"
          >
            {text}
          </button>
        ))}
      </div>

      {picked ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="switchyard-mono text-xs text-[hsl(var(--sy-signal))]">
            {correct ? "Called right" : "Wrong side"}
          </span>
          <span className="min-w-0 flex-1 text-sm text-[hsl(var(--sy-ink-dim))]">
            {prompt.indicator ? `"${prompt.indicator}" marks it: ` : ""}
            {prompt.thenText} is required, and {prompt.ifText} is what triggers the requirement.
          </span>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setIndex((i) => i + 1);
            }}
            autoFocus
            className="sy-ack switchyard-mono rounded-md px-3 py-1.5 text-xs"
            data-testid="sy-lever-next"
          >
            Next
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onExit}
          className="switchyard-mono w-fit text-xs text-[hsl(var(--sy-ink-dim))] underline"
        >
          Back to the gallery
        </button>
      )}
    </div>
  );
}
