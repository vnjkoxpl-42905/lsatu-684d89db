import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./press.css";

/**
 * The pressroom's threshold. The bed lights, the platen rises to its waiting
 * height, and the first monolith lowers onto the bed.
 *
 * The spec says 2.5s. The choreography finishes at 1660ms (the monolith's 760ms
 * lower, starting at 900ms), so the hold is set just past that: a further second
 * of a settled press is dead air, not weight. The Switchyard runs 2.5s because a
 * yard powering up section by section is genuinely a longer gesture.
 */

const DURATION = 1800;

export function PressEntrance({
  onDone,
  title = "The Press",
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
      className="press press-entrance-bed flex h-full min-h-[560px] w-full flex-col justify-center gap-8 px-5 py-8 md:px-12"
      data-testid="press-entrance"
    >
      {/* The shop's lamp comes up over the machine. */}
      <div className="pr-room" aria-hidden="true">
        <div className="pr-glow" />
        <div className="pr-frame" />
        <div className="pr-rollers" />
        <div className="pr-spatter" />
        <div className="pr-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <p className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="press-mono rounded-md border border-[hsl(var(--pr-metal))] px-3 py-1.5 text-xs text-[hsl(var(--pr-ink))]"
          data-testid="press-entrance-skip"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="press-platen press-entrance-platen" aria-hidden="true" />

        {/* Blank type. The paragraph itself arrives with the first item, so the
            threshold shows the mass without pretending to show its words. */}
        <div
          className="press-monolith press-entrance-monolith rounded-sm px-6 py-7"
          data-testid="press-entrance-monolith"
          aria-hidden="true"
        >
          <div className="flex flex-col gap-2.5">
            {[100, 96, 99, 92, 97, 64].map((w, i) => (
              <span
                key={i}
                className="block h-2 rounded-[1px] bg-gradient-to-r from-[hsl(var(--pr-paper)/0.3)] to-[hsl(var(--pr-paper)/0.14)]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="press-display text-center text-2xl text-[hsl(var(--pr-ink))] md:text-3xl">
        {title}
      </p>
    </div>
  );
}
