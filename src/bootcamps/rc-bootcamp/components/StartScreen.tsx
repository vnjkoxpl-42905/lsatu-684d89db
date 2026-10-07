/**
 * The lesson's cover.
 *
 * A student lands here every time they open the bootcamp, before any content.
 * It is deliberately almost empty: the label, the title, one way in. The only
 * other element is a progress bar, and it appears solely when there is real
 * stored progress to show — a first-timer sees no zero and no empty track.
 *
 * The cover is dark and the lesson is warm cream paper, so pressing Enter
 * visibly crosses from one world into the other. That crossing is the point,
 * which is why the exit transition is staged rather than a cut. Everything
 * animated here collapses to an instant state change under
 * `prefers-reduced-motion`.
 *
 * Nothing on this screen is invented. The percentage is derived from the
 * furthest screen the student actually reached.
 */

import { useEffect, useRef, useState } from 'react';
import { TOTAL_SCREENS } from '../content';
import { useLesson } from '../useLesson';

/** Length of the cover's exit transition. Kept in sync with `.rc-cover.is-leaving` in scoped.css. */
const LEAVE_MS = 520;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function StartScreen({ onEnter, onExit }: { onEnter: () => void; onExit: () => void }) {
  const { state } = useLesson();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Furthest reached, not current position, so paging backward never shrinks it.
  const seen = Math.max(state.furthest, state.index) + 1;
  const started = state.furthest > 0 || state.index > 0;
  const percent = Math.min(100, Math.round((seen / TOTAL_SCREENS) * 100));

  function handleEnter() {
    if (leaving) return;
    if (prefersReducedMotion()) {
      onEnter();
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(onEnter, LEAVE_MS);
  }

  return (
    <div className={`rc-cover${leaving ? ' is-leaving' : ''}`}>
      <div className="rc-cover-wash" aria-hidden="true" />

      <button type="button" className="rc-cover-exit" onClick={onExit} disabled={leaving}>
        Exit
      </button>

      <main className="rc-cover-center">
        <p className="rc-cover-label">RC Bootcamp</p>

        <h1 className="rc-cover-title">Engaging With The Passage</h1>

        <div className="rc-cover-rule" aria-hidden="true" />

        <button type="button" className="rc-cover-enter" onClick={handleEnter} disabled={leaving}>
          <span>{started ? 'Resume' : 'Enter'}</span>
        </button>

        {started ? (
          <div className="rc-cover-progress">
            <div
              className="rc-cover-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Lesson progress"
            >
              <div className="rc-cover-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="rc-cover-percent">{percent}% complete</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
