import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import "./switchyard.css";

/**
 * The yard's entrance. The card has expanded into the dark yard; the rails light
 * section by section down the line, the junction turns once, idle, and the
 * departures board flips to the first item.
 *
 * It is skippable and it is short. An entrance that cannot be skipped is a tax
 * on every repeat visit, and this world is built to be entered dozens of times.
 */

const SECTIONS = 6;
/** Total run, in ms. The spec's 2.5s, spent: rails, then the idle turn, then the board. */
const DURATION = 2500;
const SECTION_STAGGER = 110;

export function SwitchyardEntrance({
  onDone,
  title = "The Switchyard",
}: {
  onDone: () => void;
  title?: string;
}) {
  const still = useReducedMotion() ?? false;
  const [boardIn, setBoardIn] = useState(false);
  // Held in a ref so the timer effect never re-runs when the parent re-renders
  // with a new closure, which would restart the entrance mid-play.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (still) {
      done.current();
      return;
    }
    const timers = [
      setTimeout(() => setBoardIn(true), 1900),
      setTimeout(() => done.current(), DURATION),
    ];
    return () => timers.forEach(clearTimeout);
  }, [still]);

  // Reduced motion has already handed the yard over; rendering the sequence
  // underneath it would flash.
  if (still) return null;

  return (
    <div
      className="switchyard flex h-full min-h-[560px] w-full flex-col justify-center gap-10 px-5 py-8 md:px-12"
      data-testid="sy-entrance"
    >
      {/* The yard powering up: floods strike on over the track fan. */}
      <div className="sy-room" aria-hidden="true">
        <div className="sy-tracks" />
        <div className="sy-floods" />
        <div className="sy-lamphead" data-side="left" />
        <div className="sy-lamphead" data-side="right" />
        <div className="sy-fog" />
        <div className="sy-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <p className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="sy-ack switchyard-mono rounded-md px-3 py-1.5 text-xs"
          data-testid="sy-entrance-skip"
        >
          Skip
        </button>
      </div>

      <div
        className={`sy-board rounded-2xl px-6 py-5 transition-opacity duration-500 ${
          boardIn ? "opacity-100" : "opacity-0"
        }`}
        data-testid="sy-entrance-board"
      >
        <p className="switchyard-display text-2xl text-[hsl(var(--sy-ink))]">{title}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          {["IF", "THEN"].map((label, row) => (
            <div key={label} className="flex items-center gap-3">
              <span className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">{label}</span>
              <div className="flex flex-1 gap-1">
                {Array.from({ length: SECTIONS }, (_, i) => (
                  <div
                    key={i}
                    className="sy-entrance-rail flex-1"
                    style={{ animationDelay: `${(row * SECTIONS + i) * SECTION_STAGGER}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sy-junction-scene relative h-[92px] w-[92px]">
          <div className="sy-junction sy-entrance-junction absolute inset-0">
            <div className="sy-junction-back" />
            <div className="sy-diamond" />
            <div className="sy-crossing" aria-hidden="true">
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
