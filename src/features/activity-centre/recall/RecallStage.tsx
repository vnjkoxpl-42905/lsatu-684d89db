import { RecallOrb } from "./RecallOrb";
import { PROMPTS } from "./speech";
import type { OrbMood } from "./orb";
import type { Phase, RecallScore, RecallStep } from "./session";
import { missesByChunk } from "./session";

/**
 * One screen of a Read, Recall, Colour run.
 *
 * Presentational on purpose: it is handed a step, a phase and a score and draws
 * them. What the student is asked, when, and what her answer is worth are all
 * decided in `session.ts`, which is where they can be tested.
 *
 * The rule this component exists to keep is negative. **During `recall` there
 * is nothing readable on screen.** No chunk, no transcript, not even a live
 * one, no timer, no progress bar. Hiding the text is the only thing this
 * activity has that a voice recorder does not, and every readable element on
 * that screen is something to lean on instead of her memory.
 */

export interface RecallStageProps {
  step: RecallStep;
  phase: Phase;
  stepNumber: number;
  totalSteps: number;
  /** What the gate is doing, which is what the orb shows. */
  mood: OrbMood;
  level: number;
  /** Present only in `feedback`. Absent means nobody has judged it. */
  score?: RecallScore;
  /** What she said, shown only alongside the feedback and never during recall. */
  transcript?: string;
  /** Shown when speech is unavailable: an instruction is safe to read, a chunk is not. */
  spoken: boolean;
  /**
   * A microphone fault, when there is one. Silence and a dead input look
   * identical from her side, so saying nothing while she talks into nothing is
   * the worst version of this.
   */
  error?: string | null;
  /** Leaving mid-run. A full-screen activity with no way out is a trap. */
  onExit?: () => void;
  onReadDone: () => void;
  onHold: () => void;
  onRelease: () => void;
  onFeedbackDone: () => void;
}

function promptFor(step: RecallStep, phase: Phase): string {
  if (phase === "colour") return PROMPTS.colour;
  if (step.kind === "cumulative") return PROMPTS.cumulative;
  if (step.kind === "the-read") return PROMPTS.theRead;
  return PROMPTS.recall;
}

export function RecallStage({
  step,
  phase,
  stepNumber,
  totalSteps,
  mood,
  level,
  score,
  transcript,
  spoken,
  error,
  onExit,
  onReadDone,
  onHold,
  onRelease,
  onFeedbackDone,
}: RecallStageProps) {
  const capturing = phase === "recall" || phase === "colour";

  return (
    <section className="ac-recall" data-phase={phase} data-kind={step.kind}>
      <header className="ac-recall-head">
        {onExit && (
          <button type="button" className="ac-recall-exit" onClick={onExit}>
            Leave
          </button>
        )}
        <span className="ac-recall-count">
          {stepNumber} / {totalSteps}
        </span>
      </header>

      {phase === "read" && step.text && (
        <div className="ac-recall-read">
          <p className="ac-recall-chunk">{step.text}</p>
          <button type="button" className="ac-recall-primary" onClick={onReadDone}>
            Got it
          </button>
          <p className="ac-recall-note">It goes away when you tap, and it is not coming back.</p>
        </div>
      )}

      {capturing && (
        <div className="ac-recall-capture">
          <RecallOrb mood={mood} level={level} />
          {/* The prompt is spoken. It is shown too only when speech is
              unavailable, which is safe in a way showing the chunk would not
              be: "Say it back" is an instruction, not something to recite. */}
          {!spoken && <p className="ac-recall-spoken-fallback">{promptFor(step, phase)}</p>}
          {error && <p className="ac-recall-error" role="alert">{error}</p>}
          <button
            type="button"
            className="ac-recall-hold"
            onPointerDown={onHold}
            onPointerUp={onRelease}
            onPointerLeave={onRelease}
            onPointerCancel={onRelease}
          >
            Hold to talk
          </button>
        </div>
      )}

      {phase === "feedback" && (
        <div className="ac-recall-feedback">
          {/* The one moment the text comes back, and it comes back once. */}
          <p className="ac-recall-chunk">{step.text ?? step.source}</p>

          {score?.judged ? (
            <RecallScorecard step={step} score={score} />
          ) : (
            <p className="ac-recall-unjudged">
              This one could not be checked just now. Nothing has been scored against it.
            </p>
          )}

          {transcript && (
            <blockquote className="ac-recall-said">
              <span className="ac-recall-said-label">What you said</span>
              {transcript}
            </blockquote>
          )}

          <button type="button" className="ac-recall-primary" onClick={onFeedbackDone}>
            Keep going
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Which details survived and which did not.
 *
 * Grouped by the sentence they came from, because a cumulative round can miss
 * details out of four chunks at once and "you dropped detail eleven" tells her
 * nothing. There is no percentage and no pass mark: "close enough" is a
 * tolerance, not a threshold, and putting a score on it invites her to work the
 * number instead of the recall.
 */
function RecallScorecard({ step, score }: { step: RecallStep; score: RecallScore }) {
  const missed = missesByChunk(score);
  const lost = new Set(score.missed.map((d) => d.n));

  return (
    <div className="ac-recall-scorecard">
      <ul className="ac-recall-details">
        {step.details.map((detail) => (
          <li key={detail.n} data-state={lost.has(detail.n) ? "lost" : "kept"}>
            {detail.text}
          </li>
        ))}
      </ul>

      {missed.size > 0 && (
        <div className="ac-recall-misses">
          {[...missed.entries()].map(([chunk, details]) => (
            <p key={chunk}>
              {step.kind === "cumulative" ? `From sentence ${chunk}: ` : ""}
              you left out {details.map((d) => d.text.replace(/\.$/, "")).join(", and ")}.
            </p>
          ))}
        </div>
      )}

      {/* Own words is a failure signal here, not a success one, so it is only
          ever mentioned when she has drifted into reciting. Saying "nicely
          reworded" every time would make her watch a number that is supposed to
          be the natural result of not being able to see the text. */}
      {score.longestRun > 6 && (
        <p className="ac-recall-recited">
          That came back close to word for word. Say it the way you would tell a friend.
        </p>
      )}
    </div>
  );
}

export default RecallStage;
