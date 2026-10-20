import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./atelier.css";

/**
 * The atelier's threshold. The drafting lamp snaps on over an empty table and
 * the first item's panes deal in, staggered in reading order.
 *
 * 2s, per the spec. The deal is 5 panes at 50ms stagger plus a 420ms settle,
 * which lands at ~1.1s, and the lamp needs a beat of empty table before it to
 * read as a room rather than a list appearing.
 */

const DURATION = 2000;
const PANES = 4;
const STAGGER = 50;
const LAMP_HOLD = 620;

export function AtelierEntrance({
  onDone,
  title = "The Argument Atelier",
}: {
  onDone: () => void;
  title?: string;
}) {
  const still = useReducedMotion() ?? false;
  // Held in a ref so a re-render with a new closure cannot restart the entrance.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (still) {
      done.current();
      return;
    }
    const timer = setTimeout(() => done.current(), DURATION);
    return () => clearTimeout(timer);
  }, [still]);

  if (still) return null;

  return (
    <div
      className="atelier atelier-table flex h-full min-h-[560px] w-full flex-col justify-center gap-8 px-5 py-8 md:px-12"
      data-testid="atelier-entrance"
    >
      {/* The workshop, lamp swinging on over the empty bench. */}
      <div className="at-room" aria-hidden="true">
        <div className="at-sheets" />
        <div className="at-bench" />
        <div className="at-gridlines" />
        <div className="at-cone" />
        <div className="at-dust" />
      </div>

      <div className="flex items-center justify-between">
        <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="at-button atelier-mono rounded-md px-3 py-1.5 text-xs"
          data-testid="atelier-entrance-skip"
        >
          Skip
        </button>
      </div>

      {/* The lamp coming on over the table. */}
      <div className="at-entrance-lamp flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: PANES }, (_, i) => (
          <div
            key={i}
            className="at-pane at-entrance-pane rounded-sm px-5 py-4"
            style={{ animationDelay: `${LAMP_HOLD + i * STAGGER}ms` }}
            data-testid="at-entrance-pane"
          >
            {/* Blank glass. The claims arrive with the item, so the threshold
                shows the table without pretending to show an argument. */}
            <span
              className="block h-2.5 rounded-[1px] bg-gradient-to-r from-[hsl(var(--at-lamp)/0.34)] to-[hsl(var(--at-lamp)/0.1)]"
              style={{ width: `${[92, 78, 96, 64][i]}%` }}
            />
          </div>
        ))}
      </div>

      <p className="atelier-display text-center text-2xl text-[hsl(var(--at-ink))] md:text-3xl">
        {title}
      </p>
    </div>
  );
}
