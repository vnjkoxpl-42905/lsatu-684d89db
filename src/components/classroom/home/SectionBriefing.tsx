import * as React from "react";
import type { SectionBriefing as SectionBriefingData } from "@/lib/sectionBriefing";

/**
 * The last screen before the clock.
 *
 * It covers the stage rather than replacing the page: the student stays on
 * Home, the rail and the bento go quiet underneath, and nothing about the
 * session is committed until Enter. Pressing Escape or "Not now" puts Home
 * back exactly as it was, which is the point of not navigating.
 *
 * The copy is deliberately short. This is read in the thirty seconds before a
 * timed section, standing up, and every line that is not a condition of
 * sitting it well is a line that costs attention it needs.
 */
export function SectionBriefing({
  briefing,
  onStart,
  onDismiss,
}: {
  briefing: SectionBriefingData;
  onStart: () => void;
  onDismiss: () => void;
}) {
  const startRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    startRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  // The page behind must not scroll while the briefing is up.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="section-briefing"
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-briefing-title"
    >
      <div className="section-briefing-inner">
        <header className="section-briefing-head">
          <span className="section-briefing-eyebrow">Timed section</span>
          <h1 id="section-briefing-title">{briefing.sectionName}</h1>
          <p className="section-briefing-lede">
            {briefing.minutes} minutes, one sitting. The clock starts when you press Enter
            and it does not pause.
          </p>
        </header>

        <div className="section-briefing-cols">
          <section>
            <h2>Before you start</h2>
            <ul>
              <li>{briefing.minutes} minutes uninterrupted, not split across the evening.</li>
              <li>Your phone somewhere you cannot reach it.</li>
              <li>Scratch paper and a pen.</li>
            </ul>
          </section>
          <section>
            <h2>While you work</h2>
            <ul>
              <li>Answer every question. A blank is a guaranteed zero, a guess is not.</li>
              <li>Stuck means move. Mark it, go, come back if there is time.</li>
              <li>When the clock stops, stop.</li>
            </ul>
          </section>
        </div>

        <footer className="section-briefing-actions">
          <button type="button" ref={startRef} className="section-briefing-start" onClick={onStart}>
            Enter
          </button>
          <button type="button" className="section-briefing-later" onClick={onDismiss}>
            Not now
          </button>
        </footer>
      </div>
    </div>
  );
}
