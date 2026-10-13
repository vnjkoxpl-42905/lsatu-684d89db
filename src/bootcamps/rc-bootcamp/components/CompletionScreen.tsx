/**
 * Completion.
 *
 * Plays back the student's own first from-memory attempt against the author's
 * main point. Their writing is rendered as text, never markup. If they skipped
 * that write there is nothing to quote and the screen says only what is true.
 */

import { THESIS } from '../content';
import { FIRST_ATTEMPT_KEY } from '../lessonMeta';
import { useLesson } from '../useLesson';

export function CompletionScreen() {
  const { state } = useLesson();
  const firstAttempt = String(state.data[FIRST_ATTEMPT_KEY] ?? '').trim();

  return (
    <div className="rc-screen">
      <div className="rc-eyebrow">Lesson complete</div>
      <h1 className="rc-title">That's active reading.</h1>
      <div className="rc-prose">
        {firstAttempt ? (
          <>
            <p>Here is your first attempt at the passage, written from memory after one timed read:</p>
            <div className="rc-quote rc-recap-quote">
              <span className="rc-quote-tag">Your first attempt</span>
              <p>{firstAttempt}</p>
            </div>
          </>
        ) : null}
        <p>And here is the author's main point:</p>
      </div>
      <div className="rc-thesis">
        <div className="rc-thesis-label">Main point of the passage</div>
        <div className="rc-thesis-body">{THESIS}</div>
      </div>
      <div className="rc-prose rc-recap-close">
        <p>
          That gap is the whole lesson. You read under time pressure, wrote from memory, committed
          to answers before seeing mine, and re-read with the author's purpose in hand. That is the
          habit. Bring it to every passage you read from now on.
        </p>
      </div>
    </div>
  );
}
