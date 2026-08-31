import type { ChunkState, SectionPhase, SectionStimulus } from "./section";

/**
 * One screen of a Read, Recall, Colour SECTION run.
 *
 * Presentational, like `RecallStage`, and separate from it because the rule it
 * keeps is the opposite one. v1 hides everything during recall. A section keeps
 * the whole stimulus on screen the entire time and changes only how each chunk
 * is treated, so she can see how much is left without being able to read ahead.
 *
 * Four hard requirements, all of them negative, all from
 * `docs/specs/2026-08-31-rrc-section-mode.md` section 3:
 *
 * - **The layout never reflows.** A blanked chunk keeps its exact bounding box.
 *   Text jumping is the failure that loses her place mid-section, and it is why
 *   the blank is `color: transparent` on the real text rather than a
 *   replacement element sized to guess at it.
 * - **Blur is not a blank.** Blurred means present and measurable but not
 *   readable. Blank means read, hidden, and now being said back. They are
 *   different instructions and must never look alike.
 * - **One key.** No mouse in the loop. The only control here is Space, wired by
 *   the runner; the exit is outside the loop.
 * - **No answer choices, and nothing judged.** The stimulus alone. Nothing is
 *   scored, shown or corrected until the section ends, because a live verdict
 *   trains her to vet before speaking, which is the habit colouring exists to
 *   break.
 *
 * There is deliberately no clock on screen. Time is measured and reported at
 * the end for the same reason v1 does it that way: a running clock in view is
 * what produces the rushed reading this drill exists to treat.
 */

export interface SectionStageProps {
  stimulus: SectionStimulus;
  states: ChunkState[];
  phase: SectionPhase;
  /** 1-based, for the quiet position line. */
  stimulusNumber: number;
  totalStimuli: number;
  /**
   * A microphone fault, when there is one. Silence and a dead input look
   * identical from her side, so saying nothing while she talks into nothing is
   * the worst version of this.
   */
  error?: string | null;
  /** Leaving mid-run. A full-screen activity with no way out is a trap. */
  onExit?: () => void;
}

const INSTRUCTION: Record<SectionPhase, string> = {
  // She never reads aloud. Only the recall, the colour and The Read are spoken.
  read: "Read it silently",
  speak: "Say it back, then colour it",
  "the-read": "Give your Read of the whole thing",
};

export function SectionStage({
  stimulus,
  states,
  phase,
  stimulusNumber,
  totalStimuli,
  error,
  onExit,
}: SectionStageProps) {
  return (
    <div className="ac-section">
      <div className="ac-section-head">
        <span className="ac-section-where">
          {stimulusNumber} / {totalStimuli}
        </span>
        {onExit ? (
          <button type="button" className="ac-section-exit" onClick={onExit}>
            Leave
          </button>
        ) : null}
      </div>

      <div className="ac-section-body">
        <p className="ac-section-instruction">{INSTRUCTION[phase]}</p>

        {/*
          Every chunk is rendered every frame, in order, whatever its state.
          Nothing is added or removed as she advances -- only the class changes
          -- which is what makes the no-reflow requirement structural rather
          than something to remember.
        */}
        <div className="ac-section-stimulus">
          {stimulus.chunks.map((chunk, i) => (
            <span key={chunk.n} className={`ac-section-chunk is-${states[i] ?? "blurred"}`}>
              {/*
                aria-hidden while blanked: the text is still in the DOM to hold
                its box, and a screen reader announcing the chunk she is meant
                to be recalling from memory would hand her the answer.
              */}
              <span aria-hidden={states[i] === "blank"}>{chunk.text}</span>{" "}
            </span>
          ))}
        </div>
      </div>

      <div className="ac-section-foot">
        {error ? (
          <p className="ac-section-error" role="status">
            {error}
          </p>
        ) : (
          <p className="ac-section-hint">press space</p>
        )}
      </div>
    </div>
  );
}
