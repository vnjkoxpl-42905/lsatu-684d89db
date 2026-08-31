import type { ChunkState, SectionPhase, SectionStimulus } from "./section";

/**
 * One screen of a Read, Recall, Colour SECTION run.
 *
 * Presentational, like `RecallStage`, and separate from it because the rule it
 * keeps is the opposite one. v1 hides everything during recall. A section keeps
 * the whole stimulus on screen the entire time and changes only how each chunk
 * is treated, so she can see how much is left without being able to read ahead.
 *
 * **It wears the real section's clothes.** The drill she is training for is sat
 * on LawHub, and `OfficialDrillFrame` already mirrors that surface: indigo
 * field, white header rail, one centred white paper card, the stimulus in
 * Fraunces at 19px. This screen replicates that contract exactly and removes
 * the answering half -- no question column, no choices, no verdict, no
 * notepad -- so the drill feels like the thing it is preparing her for rather
 * than like a separate app. The frame itself is not imported because it carries
 * auth, the notepad and the tutor toggle, none of which may exist inside this
 * loop, and because this component has to stay presentational.
 *
 * Four hard requirements, all of them negative, all from
 * `docs/specs/2026-08-31-rrc-section-mode.md` section 3:
 *
 * - **The layout never reflows.** Nothing is added, removed or resized as she
 *   advances; only the class on a chunk changes, and no state alters the type
 *   itself. Text jumping is the failure that loses her place mid-section.
 * - **Nothing is concealed.** The whole stimulus stays readable the whole time.
 *   The screen used to blur what she had not reached and blank what she was
 *   recalling; both are gone, because the method's own answer to rereading is
 *   that she looks away from the text, and that habit has to work on paper too.
 *   The states are a place marker now, nothing more.
 * - **One key.** No mouse in the loop. The only control here is Space, wired by
 *   the runner; the exit is outside the loop.
 * - **No answer choices, and nothing judged.** The stimulus alone. Nothing is
 *   scored, shown or corrected until the section ends, because a live verdict
 *   trains her to vet before speaking, which is the habit colouring exists to
 *   break.
 *
 * There is deliberately no clock on screen. Time is measured and reported at
 * the end for the same reason v1 does it that way: a running clock in view is
 * what produces the rushed reading this drill exists to treat. The rail shows
 * position, which is what "how much is left" actually asks.
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

/*
 * She never reads aloud. Only the recall, the colour and The Read are spoken.
 *
 * "Look away" is the instruction and not a decoration. Nothing on this screen
 * hides any more, so looking away is the entire mechanism keeping her from
 * rereading the line while she says it back, and it is what the method itself
 * asks for. An instruction that just said "say it back" would leave the text
 * sitting there in front of her with nothing telling her not to use it.
 */
const INSTRUCTION: Record<SectionPhase, string> = {
  read: "Read it silently",
  speak: "Look away. Say it back, then colour it",
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
  // Position across the section, drawn as the rail's fill. Chunk-level progress
  // inside the current stimulus is deliberately not shown: it would move on
  // every keypress, which is a metronome, and this drill is not paced by one.
  const through = Math.min(stimulusNumber - 1, totalStimuli) / Math.max(totalStimuli, 1);

  return (
    <div className="ac-section">
      {/* The white rail, as on the real section: chrome above the paper, never
          on it. It carries where she is and the way out, and nothing else. */}
      <header className="ac-section-head">
        <span className="ac-section-where">
          Stimulus <b>{stimulusNumber}</b> of {totalStimuli}
        </span>
        <div className="ac-section-rail" aria-hidden>
          <span className="ac-section-rail-fill" style={{ transform: `scaleX(${through})` }} />
        </div>
        {onExit ? (
          <button type="button" className="ac-section-exit" onClick={onExit}>
            Leave
          </button>
        ) : (
          <span />
        )}
      </header>

      <main className="ac-section-field">
        <div className="ac-section-paper">
          <div className="ac-section-body">
            {/*
              Every chunk is rendered every frame, in order, whatever its state.
              Nothing is added or removed as she advances -- only the class
              changes -- which is what makes the no-reflow requirement
              structural rather than something to remember.
            */}
            <div className="ac-section-stimulus">
              {stimulus.chunks.map((chunk, i) => (
                <span key={chunk.n} className={`ac-section-chunk is-${states[i] ?? "upcoming"}`}>
                  {chunk.text}{" "}
                </span>
              ))}
            </div>
          </div>

          {/* The card's own footer, where the real section keeps its controls.
              What she is doing sits left, the one key that does it sits right. */}
          <div className="ac-section-foot">
            <p className="ac-section-instruction" role="status">
              {INSTRUCTION[phase]}
            </p>
            {error ? (
              <p className="ac-section-error" role="status">
                {error}
              </p>
            ) : (
              <p className="ac-section-hint">
                <kbd>space</kbd>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
