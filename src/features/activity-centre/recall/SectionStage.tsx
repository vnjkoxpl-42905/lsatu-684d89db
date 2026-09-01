import type { SectionPhase, SectionStimulus } from "./section";

/**
 * One screen of a Read, Recall, Colour SECTION run.
 *
 * Presentational, like `RecallStage`, and separate from it because the rule it
 * keeps is different. v1 hides one chunk during its recall; a section has two
 * looks and nothing between them: the whole stimulus while she works it, and
 * no stimulus at all during The Recall
 * (`docs/adr/0013-she-chunks-freely-and-the-app-does-not-track-it.md`).
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
 * The hard requirements, all of them negative:
 *
 * - **No place marker.** The app does not track which chunk she is on, so no
 *   chunk is styled as current, done, or upcoming. She reads, recalls and
 *   colours in whatever units she likes.
 * - **The text truly vanishes for The Recall.** Not blurred, not transparent,
 *   not aria-hidden: removed. A stimulus left in the DOM would be read back to
 *   a student using a screen reader, which defeats the drill for her exactly.
 * - **One key.** No mouse in the loop. The only control here is Space, wired
 *   by the runner; the exit is outside the loop.
 * - **No answer choices, and nothing judged.** Nothing is scored, shown or
 *   corrected until the section ends, because a live verdict trains her to vet
 *   before speaking, which is the habit colouring exists to break.
 *
 * There is deliberately no clock on screen. Time is measured and reported at
 * the end for the same reason v1 does it that way: a running clock in view is
 * what produces the rushed reading this drill exists to treat.
 */

export interface SectionStageProps {
  stimulus: SectionStimulus;
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
 * The working instruction covers steps 1 to 3 at once, because the screen no
 * longer walks her through them: she reads, says back and colours in whatever
 * units she likes, and the app is not told where she is. The Recall's
 * instruction is the method's own: the text is gone, the whole argument comes
 * back from memory.
 */
const INSTRUCTION: Record<SectionPhase, string> = {
  working: "Read it. Say it back and colour it in as you go.",
  recalling: "Say the whole argument back from memory.",
};

/** What the one key does next, which is the whole of the controls. */
const KEY_DOES: Record<SectionPhase, string> = {
  working: "recall full stimulus",
  recalling: "next stimulus",
};

export function SectionStage({
  stimulus,
  phase,
  stimulusNumber,
  totalStimuli,
  error,
  onExit,
}: SectionStageProps) {
  // Position across the section, drawn as the rail's fill. Progress inside the
  // current stimulus is deliberately not shown: the app does not know it.
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
              While she works, every chunk is rendered in order with nothing
              marking one out from another: the cuts guide her eye and hold the
              grader's Details, and that is all they do. During The Recall the
              stimulus is not rendered at all -- the paper stays, the text goes,
              and it does not come back until the Report Card.
            */}
            {phase === "working" ? (
              <div className="ac-section-stimulus">
                {stimulus.chunks.map((chunk) => (
                  <span key={chunk.n} className="ac-section-chunk">
                    {chunk.text}{" "}
                  </span>
                ))}
              </div>
            ) : null}
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
                <kbd>space</kbd> {KEY_DOES[phase]}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
