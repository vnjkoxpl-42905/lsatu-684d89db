import { useState } from "react";
import type { LightPage } from "./rounds";
import "../atelier.css";
import "./wings.css";

/**
 * The Light Table.
 *
 * The argument lies flat as chunked strips and the student taps the one that is
 * the conclusion. No typing, no explanation, one tap.
 *
 * A wrong tap raises the Logic HUD: this argument's own indicator words lift
 * out of the strips and hold in the air before the second tap. That behaviour
 * is Joshua's, from `conclusiondrill.html`; what changed is the item source,
 * which is this Centre's own vetted bank.
 */

export function LightTable({
  pages,
  onComplete,
}: {
  pages: LightPage[];
  onComplete?: (results: { order: number; firstTry: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [results, setResults] = useState<{ order: number; firstTry: boolean }[]>([]);

  const page = pages[index];

  if (!pages.length) {
    return (
      <div
        className="atelier at-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="light-table-empty"
      >
        <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">The light table</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--at-ink-dim))]">
          This table runs on arguments whose conclusion can be pointed at in the text. None in this
          set can, so there is nothing here to tap yet.
        </p>
      </div>
    );
  }

  if (!page) {
    const clean = results.filter((r) => r.firstTry).length;
    return (
      <div className="atelier at-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">Table complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--at-ink))]">
          {clean} of {results.length} on the first tap
        </p>
      </div>
    );
  }

  // The HUD comes up only after a miss, and only if this argument has words to
  // lift. Raising an empty HUD would promise help that is not there.
  const hudUp = wrong.length > 0 && page.hud.length > 0;

  function tap(n: number) {
    if (solved) return;
    if (n === page.answer) {
      setSolved(true);
      setResults((r) => [...r, { order: page.order, firstTry: wrong.length === 0 }]);
      return;
    }
    if (!wrong.includes(n)) setWrong((w) => [...w, n]);
  }

  function next() {
    setWrong([]);
    setSolved(false);
    const at = index + 1;
    setIndex(at);
    if (at >= pages.length) onComplete?.(results);
  }

  return (
    <div
      className="atelier at-wing flex min-h-[560px] flex-col gap-5 px-5 py-8 md:px-12"
      data-testid="light-table"
    >
      <div className="flex items-center justify-between">
        <span className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">The light table</span>
        <span className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">
          {index + 1} of {pages.length} · Level {page.level}
        </span>
      </div>

      <p className="text-base text-[hsl(var(--at-ink-dim))]">Tap the conclusion.</p>

      {/* The Logic HUD, held in the air above the strips. */}
      {hudUp ? (
        <div className="at-hud flex flex-wrap gap-2 rounded-sm px-4 py-3" data-testid="at-hud">
          <span className="atelier-mono w-full text-xs text-[hsl(var(--at-ink-dim))]">
            Words doing work in this argument
          </span>
          {page.hud.map((w) => (
            <span
              key={w}
              className="at-hud-word atelier-mono rounded-sm px-2 py-1 text-xs"
              data-testid="at-hud-word"
            >
              {w}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {page.strips.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => tap(s.n)}
            disabled={solved}
            className="at-strip rounded-sm px-5 py-3.5 text-left"
            data-wrong={wrong.includes(s.n) ? "true" : undefined}
            data-truth={solved && s.n === page.answer ? "true" : undefined}
            data-testid={`at-strip-${s.n}`}
          >
            <p className="atelier-type text-base leading-snug">{s.text}</p>
          </button>
        ))}
      </div>

      {solved ? (
        <div className="flex flex-col gap-3" data-testid="at-light-verdict">
          <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">
            {wrong.length === 0 ? "First tap" : `Found it after ${wrong.length}`}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="at-button atelier-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="at-light-next"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
