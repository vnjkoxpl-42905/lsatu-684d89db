import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./polarity.css";

/**
 * The chamber's threshold. The key light finds the first plate mid-descent, and
 * the nameplate etches itself and burns off.
 *
 * 2s, per the spec. The descent runs 720ms from 260ms and the nameplate burns
 * off at 1.9s, so the room is dark and empty again exactly as the first item
 * arrives, which is the whole staging.
 */

const DURATION = 2000;

export function PolarityEntrance({
  onDone,
  title = "Negation Station",
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
      className="polarity flex h-full min-h-[560px] w-full flex-col justify-center gap-10 px-5 py-8 md:px-12"
      data-testid="polarity-entrance"
    >
      {/* The room ignites: aurora first, then the plate descends through it. */}
      <div className="po-room" aria-hidden="true">
        <div className="po-aurora" />
        <div className="po-aurora-rays" />
        <div className="po-floor" />
        <div className="po-horizon" />
        <div className="po-motes" />
        <div className="po-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <p className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="po-button polarity-mono rounded-md px-3 py-1.5 text-xs"
          data-testid="polarity-entrance-skip"
        >
          Skip
        </button>
      </div>

      <div className="po-stage" aria-hidden="true">
        <div
          className="po-face po-entrance-plate rounded-sm px-7 py-9"
          data-testid="po-entrance-plate"
        >
          {/* Blank glass. The statement arrives with the item, so the threshold
              shows the plate without pretending to show a claim. */}
          <div className="flex flex-col gap-3">
            {[86, 62].map((w, i) => (
              <span
                key={i}
                className="block h-3 rounded-[1px] bg-gradient-to-r from-[hsl(var(--po-aurora-a)/0.4)] to-[hsl(var(--po-aurora-b)/0.25)] shadow-[0_0_10px_hsl(var(--po-aurora-a)/0.25)]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
        <div className="po-reflection" />
      </div>

      <p
        className="po-entrance-name polarity-display text-center text-2xl text-[hsl(var(--po-ink))] md:text-3xl"
        data-testid="po-entrance-name"
      >
        {title}
      </p>
    </div>
  );
}
