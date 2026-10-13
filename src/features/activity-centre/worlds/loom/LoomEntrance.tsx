import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./loom.css";

/**
 * The archive's threshold. The two sheets unroll top to bottom, then the first
 * bracket of light finds its phrase.
 *
 * 2s, per the spec. Two unrolls at 620ms with the second following the first,
 * then the bracket: the sequence lands near 1.7s and the rest is the archive
 * holding still before the first call.
 */

const DURATION = 2000;
const SHEET_STAGGER = 380;

export function LoomEntrance({
  onDone,
  title = "The Loom",
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
      className="loom flex h-full min-h-[560px] w-full flex-col justify-center gap-8 px-5 py-8 md:px-12"
      data-testid="loom-entrance"
    >
      {/* The dye-house wakes: the warp rises, then the linen unrolls. */}
      <div className="lo-room" aria-hidden="true">
        <div className="lo-warp" />
        <div className="lo-vat" />
        <div className="lo-skeins" />
        <div className="lo-lamplight" />
        <div className="lo-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">Entering</p>
        <button
          type="button"
          onClick={() => done.current()}
          className="lo-button loom-mono rounded-md px-3 py-1.5 text-xs"
          data-testid="loom-entrance-skip"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-col gap-6" aria-hidden="true">
        {[0, 1].map((n) => (
          <div
            key={n}
            className="lo-sheet lo-entrance-sheet rounded-sm px-6 py-6"
            style={{ animationDelay: `${n * SHEET_STAGGER}ms` }}
            data-testid="lo-entrance-sheet"
          >
            {/* Blank paper. The passage arrives with the item, so the threshold
                shows an archive without pretending to show a passage. */}
            <div className="flex flex-col gap-2.5">
              {[96, 88, 92, 54].map((w, i) => (
                <span
                  key={i}
                  className="block h-2 rounded-[1px] bg-gradient-to-r from-[hsl(224_45%_40%/0.3)] via-[hsl(var(--lo-thread)/0.35)] to-[hsl(224_45%_40%/0.22)]"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="loom-display text-center text-2xl text-[hsl(var(--lo-paper))] md:text-3xl">
        {title}
      </p>
    </div>
  );
}
