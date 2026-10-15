import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./observatory.css";

/**
 * The observatory's threshold. Stars resolve out of noise, then the three
 * instrument dials power on in sequence.
 *
 * 2.5s, per the spec. The resolve runs 900ms and the three dials follow at
 * 260ms apart, which lands the last one near 1.9s; the remaining beat is the
 * field sitting quiet before the first statement, which is what a night sky is.
 */

const DURATION = 2500;
const SEALS = ["Conditional", "Causal", "Comparison"];
const SEAL_STAGGER = 260;
const SEAL_DELAY = 1100;

export function ObservatoryEntrance({
  onDone,
  title = "The Signal Observatory",
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
      className="observatory flex h-full min-h-[560px] w-full flex-col justify-center gap-10 px-5 py-8 md:px-12"
      data-testid="observatory-entrance"
    >
      {/* The dome opens: nebulae and stars first, then one meteor crosses. */}
      <div className="ob-room" aria-hidden="true">
        <div className="ob-nebula" />
        <div className="ob-stars" />
        <div className="ob-dome" />
        <div className="ob-meridian" />
        <div className="ob-horizonline" />
        <div className="ob-meteor" />
      </div>

      <div className="flex items-center justify-between">
        <p className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="ob-button observatory-mono rounded-md px-3 py-1.5 text-xs"
          data-testid="observatory-entrance-skip"
        >
          Skip
        </button>
      </div>

      {/* Stars resolving. No words: the statement arrives with the item, so the
          threshold shows a sky rather than pretending to show a sentence. */}
      <div className="ob-entrance-stars flex flex-wrap justify-center gap-x-5 gap-y-4" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="ob-word inline-block"
            style={{ width: `${28 + ((i * 37) % 46)}px` }}
            data-testid="ob-entrance-star"
          >
            <span className="block h-2 rounded-[1px] bg-gradient-to-r from-[hsl(var(--ob-star)/0.4)] to-[hsl(var(--ob-star)/0.12)] shadow-[0_0_8px_hsl(var(--ob-star)/0.3)]" />
          </span>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2" aria-hidden="true">
        {SEALS.map((s, i) => (
          <span
            key={s}
            className="ob-seal ob-entrance-seal observatory-mono rounded-sm px-3 py-1.5 text-xs"
            style={{ animationDelay: `${SEAL_DELAY + i * SEAL_STAGGER}ms` }}
            data-testid="ob-entrance-seal"
          >
            {s}
          </span>
        ))}
      </div>

      <p className="observatory-display text-center text-xl text-[hsl(var(--ob-ink))] md:text-2xl">
        {title}
      </p>
    </div>
  );
}
