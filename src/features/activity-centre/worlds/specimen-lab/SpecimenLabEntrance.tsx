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
      {/* The study lights up around the bench. */}
      <div className="sl-room" aria-hidden="true">
        <div className="sl-wall" />
        <div className="sl-fern" />
        <div className="sl-grain" />
        <div className="sl-lamplight" />
      </div>

      <div className="flex items-center justify-between">
        <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="specimen-mono rounded-md border border-[hsl(var(--sl-brass))] bg-[hsl(var(--sl-paper))] px-3 py-1.5 text-xs text-[hsl(var(--sl-ink))]"
          data-testid="sl-entrance-skip"
        >
          Skip
        </button>
      </div>

      {/* The bench lamps, coming up along the brass rail. */}
      <div className="flex items-end justify-center gap-2">
        {Array.from({ length: LAMPS }, (_, i) => (
          <span
            key={i}
            className="sl-lamp h-1.5 w-16 rounded-sm bg-[hsl(var(--sl-brass))] shadow-[0_0_12px_hsl(var(--sl-brass)/0.6)]"
            style={{ animationDelay: `${i * LAMP_STAGGER}ms` }}
            data-testid="sl-lamp"
          />
        ))}
      </div>

      <div className="sl-vitrine-scene">
        <div className="sl-vitrine sl-entrance-vitrine">
          <span className="specimen-label text-sm text-[hsl(var(--sl-ink-dim))]">
            Specimen, unidentified
          </span>
        </div>
        <div className="sl-plinth" aria-hidden="true" />
      </div>

      <p className="specimen-serif text-center text-2xl font-medium text-[hsl(var(--sl-ink))] md:text-3xl">
        {title}
      </p>
    </div>
  );
}
