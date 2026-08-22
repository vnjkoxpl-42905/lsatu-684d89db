import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./chamber.css";

/**
 * The chamber's threshold. Their plinth lights first and carries something; the
 * author's light comes up second and reveals emptiness.
 *
 * 2.5s, per the spec, and here the length is the point rather than padding: the
 * pause between the two lights is what makes the second one land as an absence.
 * Shortening it would give away both plinths at once.
 */

const DURATION = 2500;

export function ChamberEntrance({
  onDone,
  title = "The Debate Chamber",
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
      className="chamber flex h-full min-h-[560px] w-full flex-col justify-center gap-10 px-5 py-8 md:px-12"
      data-testid="chamber-entrance"
    >
      {/* The rotunda's torches catch, one plinth at a time. */}
      <div className="ch-room" aria-hidden="true">
        <div className="ch-columns" />
        <div className="ch-floorveins" />
        <div className="ch-torchlight" />
        <div className="ch-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="ch-button chamber-mono rounded-md px-3 py-1.5 text-xs"
          data-testid="chamber-entrance-skip"
        >
          Skip
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2" aria-hidden="true">
        <div className="ch-entrance-theirs">
          <div className="ch-plinth rounded-sm px-5 py-6" data-testid="ch-entrance-theirs">
            <div className="flex flex-col gap-2.5">
              {[94, 82, 60].map((w, i) => (
                <span
                  key={i}
                  className="block h-2.5 rounded-[1px] bg-gradient-to-r from-[hsl(var(--ch-light)/0.3)] to-[hsl(var(--ch-light)/0.1)]"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* The empty one. Nothing on it, which is the whole staging. */}
        <div className="ch-entrance-authors">
          <div
            className="ch-plinth rounded-sm px-5 py-6"
            data-state="empty"
            data-testid="ch-entrance-authors"
          >
            <span className="ch-ghost-ref chamber-mono text-xs">…</span>
          </div>
        </div>
      </div>

      <p className="chamber-display text-center text-xl text-[hsl(var(--ch-ink))] md:text-2xl">
        {title}
      </p>
    </div>
  );
}
