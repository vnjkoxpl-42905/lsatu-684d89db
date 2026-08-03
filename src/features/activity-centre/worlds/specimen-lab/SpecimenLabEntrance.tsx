import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./specimen-lab.css";

/**
 * The lab's threshold. The bench lights come up one lamp at a time, then the
 * first vitrine descends onto the bench, turning, its label still blank.
 *
 * Two seconds and skippable. The Switchyard's entrance runs 2.5s because a rail
 * yard powering up section by section is a longer gesture; a bench lighting is
 * shorter, and matching them would pad this one to no purpose.
 */

const LAMPS = 5;
const DURATION = 2000;
const LAMP_STAGGER = 90;

export function SpecimenLabEntrance({
  onDone,
  title = "The Specimen Lab",
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
      className="specimen-lab flex h-full min-h-[560px] w-full flex-col justify-center gap-10 px-5 py-8 md:px-12"
      data-testid="sl-entrance"
    >
      <div className="flex items-center justify-between">
        <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="specimen-mono rounded-md border border-[hsl(var(--sl-edge))] px-3 py-1.5 text-xs text-[hsl(var(--sl-ink))]"
          data-testid="sl-entrance-skip"
        >
          Skip
        </button>
      </div>

      {/* The bench lights, coming up along the rail. */}
      <div className="flex items-end justify-center gap-2">
        {Array.from({ length: LAMPS }, (_, i) => (
          <span
            key={i}
            className="sl-lamp h-1 w-16 rounded-sm bg-[hsl(var(--sl-ink)/0.25)]"
            style={{ animationDelay: `${i * LAMP_STAGGER}ms` }}
            data-testid="sl-lamp"
          />
        ))}
      </div>

      <div className="sl-vitrine-scene">
        <div className="sl-vitrine sl-entrance-vitrine rounded-md">
          <span className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">
            Specimen, unidentified
          </span>
        </div>
      </div>

      <p className="ac-display text-center text-xl text-[hsl(var(--sl-ink))]">{title}</p>
    </div>
  );
}
