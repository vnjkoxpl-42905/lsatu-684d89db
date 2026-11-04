import { useEffect, useRef, type HTMLAttributes } from "react";
import type { SectionPhase, SectionStimulus } from "./section";
import type { CoachNote } from "./coach";
import { VoiceLevel } from "./VoiceLevel";
import { useNoKeyboard } from "./noKeyboard";

/**
 * Is this page running inside another page's frame?
 *
 * A preview frame is never handed the microphone: the embed carries no
 * microphone permission, so `getUserMedia` is refused before the student is
 * ever asked. That looks identical to a student saying no, and "allow the
 * microphone for this site" is advice she cannot act on. So when the drill is
 * framed, the refusal names the real cause and offers the one thing that
 * works: the same address in a tab of its own.
 *
 * A cross-origin frame throws on the read, and a throw means framed.
 */
function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}


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
 * The clock counts up rather than down, and the microphone has one quiet
 * indicator beside the instruction. Both are late additions and both are
 * concessions to the same finding: a student cannot pace a 25-minute section
 * she cannot see the time on, and she cannot tell a dead microphone from her
 * own silence. Neither may ever read as a score.
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
  /** Seconds since the section started. Omit to draw no clock at all. */
  elapsedSeconds?: number;
  /**
   * True while the microphone is open and the file is being written. Drawn as
   * a plain "Recording" mark in the rail so she never has to wonder, mid-run,
   * whether the thing is on. The voice bar in the footer answers "is anything
   * reaching it"; this answers the prior question.
   */
  recording?: boolean;
  /**
   * The live input, for the presence indicator. Omit and no indicator is drawn,
   * which is what a run against a handheld recorder looks like.
   */
  getStream?: () => MediaStream | null;
  /**
   * Whether nothing is reaching the microphone. Raised at a boundary once the
   * silence has run past one window, and withdrawn as soon as anything is heard.
   */
  onDeadInput?: (dead: boolean) => void;
  /** The first sound to reach the microphone. The ready beat holds for it. */
  onHeard?: () => void;
  /**
   * Whether the beat has heard her yet. It says "Say something to check your
   * microphone" until it has, and counts down once it has or once its own
   * check has run out.
   */
  micHeard?: boolean;
  /**
   * Whether the beat has stopped waiting, either because it heard her or
   * because its check ran out. The count is shown only once this is true.
   */
  micChecked?: boolean;
  /**
   * The microphone was refused or is missing. The ready beat holds here rather
   * than counting down into a spoken run that has nothing to mark at the end.
   */
  micRefused?: boolean;
  /** Ask for the microphone again, from the beat, before anything has started. */
  onRetryMic?: () => void;
  /**
   * Leaving is confirmed rather than done, because a half-finished section
   * writes nothing by design and the button is on screen for the whole run.
   */
  /**
   * The section this run is of, for the heading. "PT105.S2".
   *
   * The runner had no headings at all: "Stimulus 1 of 23" is a span, and a
   * screen reader's heading list was empty on the drill's only screen.
   */
  sectionName?: string;
  /** The goal, in seconds, drawn after the clock in lighter type. */
  goalSeconds?: number;
  confirmingExit?: boolean;
  onConfirmExit?: () => void;
  onCancelExit?: () => void;
  /**
   * Seconds left in the ready beat, or null once the section is running.
   *
   * The recorder is already open during it, on purpose: the beat exists so the
   * first thing an unrepeatable take captures is not a student still settling,
   * and so she can watch the level move before any of it counts.
   */
  countdown?: number | null;
  /**
   * Advance, for a device with no Space key to press.
   *
   * The same `press()` the keyboard calls, threaded through because this
   * component is presentational. It is rendered only where there is no
   * keyboard (`noKeyboard.ts`), so the desktop loop stays one key with no mouse
   * in it, and Space stays authoritative on every device including this one.
   *
   * Without it, "warn the phone and let her through" is a trap: she can read
   * stimulus 1 and never reach stimulus 2.
   */
  onAdvance?: () => void;
  /**
   * The first-run walkthrough note, for the first few stimuli only.
   *
   * Text beside the paper, never a step in the loop: it takes no key, gates
   * nothing and is gone after the third stimulus whether or not she dismissed
   * it. Omit and no card is drawn at all, which is every run after the first.
   */
  coach?: CoachNote | null;
  onDismissCoach?: () => void;
  /**
   * She has stepped away. The clock is stopped and nothing is being recorded.
   *
   * The stimulus comes OFF the screen for the whole of it, and that is the
   * feature rather than a side effect of it: a paused stimulus she can still
   * read is not a break, it is untimed reading time on a timed drill, and it
   * would hollow the section out without anybody deciding to.
   */
  paused?: boolean;
  /** Step away. Omitted before the section starts, where there is nothing to pause. */
  onPause?: () => void;
  onResume?: () => void;
  /**
   * A pause the browser would not give her, or a recording that did not come
   * back. Said on the paused card, because that is where she is standing.
   */
  pauseError?: string | null;
}

/*
 * The working instruction covers steps 1 to 3 at once, because the screen no
 * longer walks her through them: she reads, says back and colours in whatever
 * units she likes, and the app is not told where she is. The Recall's
 * instruction is the method's own: the text is gone, the whole argument comes
 * back from memory.
 */
const INSTRUCTION: Record<SectionPhase, string> = {
  working: "Read it. Tell it back and colour it in as you go.",
  recalling: "Say the whole argument back from memory.",
};

/** What the one key does next, which is the whole of the controls. */
const KEY_DOES: Record<SectionPhase, string> = {
  working: "recall full stimulus",
  recalling: "next stimulus",
};

/** mm:ss, and hh:mm:ss only if a section ever ran past an hour. */
function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function SectionStage({
  stimulus,
  phase,
  stimulusNumber,
  totalStimuli,
  error,
  onExit,
  elapsedSeconds,
  recording = false,
  getStream,
  onDeadInput,
  onHeard,
  micHeard = false,
  micChecked = false,
  micRefused,
  onRetryMic,
  sectionName,
  goalSeconds,
  confirmingExit,
  onConfirmExit,
  onCancelExit,
  countdown = null,
  onAdvance,
  coach = null,
  onDismissCoach,
  paused = false,
  onPause,
  onResume,
  pauseError = null,
}: SectionStageProps) {
  const noKeyboard = useNoKeyboard();
  const confirmRef = useRef<HTMLDivElement | null>(null);

  /*
   * Escape, and a Tab that cannot leave.
   *
   * The confirm carried `aria-modal` and none of what the attribute promises:
   * Escape did nothing, and three Tabs put focus on the Pause button behind it,
   * where Space still advanced the drill under a dialog asking whether to throw
   * the run away. `aria-modal` is a claim; this is the behaviour.
   */
  useEffect(() => {
    if (!confirmingExit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        // Escape is "keep going". Leaving throws the section away, and that is
        // never what a reflex keypress should do.
        onCancelExit?.();
        return;
      }
      if (e.key !== "Tab") return;
      const node = confirmRef.current;
      if (!node) return;
      const stops = [...node.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active !== null && node.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [confirmingExit, onCancelExit]);

  /*
   * The rest of the screen, taken out of the tree while the confirm is up.
   *
   * Defence behind the trap rather than instead of it: `inert` is not in every
   * browser she might use, and the trap is what actually holds.
   */
  const inertWhileConfirming = (
    confirmingExit ? { inert: "" } : {}
  ) as HTMLAttributes<HTMLElement>;
  // Position across the section, drawn as the rail's fill. Progress inside the
  // current stimulus is deliberately not shown: the app does not know it.
  const through = Math.min(stimulusNumber - 1, totalStimuli) / Math.max(totalStimuli, 1);

  return (
    <div className="ac-section">
      {/* The white rail, as on the real section: chrome above the paper, never
          on it. It carries where she is and the way out, and nothing else. */}
      <header className="ac-section-head" {...inertWhileConfirming}>
        {/* The drill's only screen had no heading at all, so a screen reader's
            heading list was empty and there was nothing to jump to. Visually
            hidden because the rail is chrome and has no room for a title. */}
        <h1 className="sr-only">
          Read, Recall, Colour{sectionName ? `, ${sectionName}` : ""}
        </h1>
        <span className="ac-section-where">
          Stimulus <b>{stimulusNumber}</b> of {totalStimuli}
        </span>
        <div className="ac-section-rail" aria-hidden>
          <span className="ac-section-rail-fill" style={{ transform: `scaleX(${through})` }} />
        </div>
        {/*
          * Elapsed, counting UP, against the goal.
          *
          * This screen carried no clock at all, on the reasoning that a running
          * clock produces the rushed reading the drill exists to treat. The
          * drill is against the clock, though, and a student with no way to see
          * the time cannot pace a 25-minute section. Counting up rather than
          * down is the compromise: she can see where she is without a number
          * falling towards zero in the corner of her eye.
          */}
        {elapsedSeconds !== undefined && (
          <span className="ac-section-clock" aria-live="off">
            {clock(elapsedSeconds)}
            {/* The goal she is pacing against. `.ac-section-clock i` was styled
                for exactly this when the clock shipped and nothing ever
                rendered it, so the screen showed her elapsed time and never the
                target it was elapsed against. */}
            {goalSeconds !== undefined && <i> of {clock(goalSeconds)}</i>}
          </span>
        )}
        {/* Said in words as well as drawn, so it survives grayscale and a
            screen reader alike. Announced once when it turns on; never
            re-announced. */}
        {recording ? (
          <span className="ac-section-rec" role="status">
            <i aria-hidden="true" />
            Recording
          </span>
        ) : paused ? (
          <span className="ac-section-rec ac-section-rec--paused" role="status">
            <i aria-hidden="true" />
            Paused
          </span>
        ) : (
          <span className="ac-section-rec ac-section-rec--off" aria-hidden="true" />
        )}
        {/* Beside the way out rather than near the paper: it is chrome, it is
            not a step in the drill, and it must never sit where a hand aiming
            for Space could find it. Gone once she is paused -- the card behind
            it is the only thing that speaks then. */}
        {onPause && !paused ? (
          <button type="button" className="ac-section-pause" onClick={onPause}>
            Pause
          </button>
        ) : (
          <span />
        )}
        {onExit ? (
          <button type="button" className="ac-section-exit" onClick={onExit}>
            Leave
          </button>
        ) : (
          <span />
        )}
      </header>

      {/*
        * Leaving throws the run away, so it says so first.
        *
        * A half-finished section is deliberately not a partial score and never
        * becomes one, which is the right rule and is what makes one unguarded
        * click on a permanently visible button cost up to twenty-five minutes.
        * The confirmation is the whole guard: the wording names what goes, and
        * staying is the default the keyboard lands on.
        */}
      {confirmingExit ? (
        <div
          className="ac-section-confirm"
          role="dialog"
          aria-modal="true"
          aria-label="Leave this section"
          ref={confirmRef}
        >
          <div className="ac-section-confirm-card">
            <p className="ac-section-confirm-title">Leave this section?</p>
            <p className="ac-section-confirm-body">
              A section is scored whole. Stopping now throws away{" "}
              {elapsedSeconds !== undefined ? clock(elapsedSeconds) : "everything"} of work and the
              recording with it. Nothing is kept and there is no partial score.
            </p>
            <div className="ac-section-confirm-row">
              <button
                type="button"
                className="ac-section-confirm-stay"
                onClick={onCancelExit}
                autoFocus
              >
                Keep going
              </button>
              <button type="button" className="ac-section-confirm-go" onClick={onConfirmExit}>
                Leave and lose it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="ac-section-field" {...inertWhileConfirming}>
        <div className="ac-section-paper">
          {paused ? (
            /*
             * The break, and the whole of what she can see during it.
             *
             * The stimulus is not behind this, blurred or dimmed or scrolled
             * off -- it is not rendered, for the same reason it is not rendered
             * during The Recall: a text left in the DOM is read aloud to a
             * student on a screen reader, and a text she can reach at all turns
             * a stopped clock into free reading time. The one thing on the card
             * is the way back.
             */
            <div className="ac-section-ready ac-section-ready--paused">
              <p className="ac-section-ready-title">Paused</p>
              <p className="ac-section-ready-body">
                The clock is stopped and nothing is being recorded. Your work so far is safe and
                your time is not running. The stimulus comes back when you do.
              </p>
              {pauseError ? (
                <p className="ac-section-error" role="status">
                  {pauseError}
                </p>
              ) : null}
              <div className="ac-section-ready-actions">
                {/* The keyboard lands here, so the key already under her thumb
                    is the one that starts the section again -- and because it
                    is a button, the runner's own Space handler stands down and
                    cannot advance the drill from behind this card. */}
                <button
                  type="button"
                  className="ac-section-ready-retry"
                  onClick={onResume}
                  autoFocus
                >
                  Back to it
                </button>
                {onExit && (
                  <button type="button" className="ac-section-ready-leave" onClick={onExit}>
                    Leave this section
                  </button>
                )}
              </div>
            </div>
          ) : countdown !== null ? (
            /*
             * The beat before the first stimulus.
             *
             * The stimulus is deliberately not behind this: it has not started
             * yet, and a section that opened with its first argument already
             * readable would be a section she had begun reading before the
             * recording was worth anything.
             */
            <div className="ac-section-ready" data-mic={micRefused ? "refused" : "live"}>
              {micRefused ? (
                /*
                 * The heading is the fault, not a claim the screen cannot back.
                 *
                 * It said "Recording now" while the footer said nothing was
                 * being recorded, and then counted down into twenty-five
                 * minutes of spoken work that the grader refuses for having no
                 * recording. The consequence is the thing she needs, so the
                 * consequence is what it says, and the two ways forward are
                 * both here rather than neither.
                 */
                <>
                  <p className="ac-section-ready-title">No microphone.</p>
                  <p className="ac-section-ready-body">
                    This drill is spoken all the way through, so without one there is nothing to
                    mark at the end. Allow the microphone for this site in your browser, then ask
                    again. Nothing has started, and your time has not begun.
                  </p>
                  {isEmbedded() && (
                    <p className="ac-section-ready-body">
                      This page is inside a preview window, and a preview window is never given the
                      microphone. Open the drill in its own tab and start it there.
                    </p>
                  )}
                  <div className="ac-section-ready-actions">
                    <button type="button" className="ac-section-ready-retry" onClick={onRetryMic}>
                      Ask again
                    </button>
                    {isEmbedded() && (
                      <button
                        type="button"
                        className="ac-section-ready-retry"
                        onClick={() =>
                          window.open(window.location.href, "_blank", "noopener,noreferrer")
                        }
                      >
                        Open in its own tab
                      </button>
                    )}
                    {onExit && (
                      <button type="button" className="ac-section-ready-leave" onClick={onExit}>
                        Leave this section
                      </button>
                    )}
                  </div>
                </>

              ) : (
                /*
                 * "Microphone on. Starting in 3." and the bar, and nothing else.
                 *
                 * It used to be thirty words of instruction under a heading that
                 * said "Recording now" beside a clock at 0:00, read in three
                 * seconds. The instruction now sits at the foot of the briefing,
                 * where she has as long as she likes, and the beat is left with
                 * the one thing only the beat can do: show her the microphone
                 * is live before any of it counts. The bar is in the panel
                 * rather than the footer because it is what she is here to look
                 * at, and the count does not begin until it has moved.
                 */
                <>
                  <p className="ac-section-ready-title">Microphone on.</p>
                  {getStream ? (
                    <span className="ac-section-ready-level">
                      <VoiceLevel getStream={getStream} phase={phase} onHeard={onHeard} />
                    </span>
                  ) : null}
                  <p className="ac-section-ready-body">
                    {micHeard
                      ? "Heard you."
                      : micChecked
                        ? "Nothing heard yet. Check it is not muted."
                        : "Say something to check your microphone."}
                  </p>
                  {/* No count while it is still listening for her: a number
                      ticking beside "say something" would say the opposite. */}
                  {micChecked ? (
                    <span className="ac-section-ready-count">
                      {countdown > 0 ? `Starting in ${countdown}` : "Starting"}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          ) : (
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
          )}

          {/* The card's own footer, where the real section keeps its controls.
              What she is doing sits left, the one key that does it sits right. */}
          <div className="ac-section-foot">
            <p className="ac-section-instruction" role="status">
              {paused
                ? "Paused. Nothing is being recorded."
                : countdown !== null
                  ? micRefused
                    ? "The section has not started."
                    : micHeard
                      ? "Heard you. The section starts after the count."
                      : "The section has not started."
                  : INSTRUCTION[phase]}
              {/* No presence bar while she is away. The microphone is still
                  open -- pausing a recorder does not close the input -- so a
                  bar left running would move to an empty room and say the one
                  thing it exists to say when it moves: that this is being
                  heard. */}
              {/* During the beat the bar is in the panel, where she is looking,
                  not down here beside a status line. One bar at a time. */}
              {getStream && !paused && countdown === null ? (
                <VoiceLevel getStream={getStream} phase={phase} onDeadInput={onDeadInput} />
              ) : null}
            </p>
            {/* The fault and the instruction, not the fault INSTEAD of it.
                These were a ternary, so a microphone warning took away the only
                thing on the screen telling her which key advances the drill --
                on precisely the run where something has already gone wrong. The
                warning leads, because it is the new information. */}
            <div className="ac-section-foot-right">
              {/* A pause she asked for and did not get.
                  It belongs in the footer rather than on the paused card
                  precisely BECAUSE she is not paused: the card she would have
                  read it on is the one that never appeared, and a refusal with
                  nowhere to be said is a button that does nothing. */}
              {!paused && pauseError ? (
                <p className="ac-section-error" role="status">
                  {pauseError}
                </p>
              ) : null}
              {error ? (
                <p className="ac-section-error" role="status">
                  {error}
                </p>
              ) : null}
              {/* Not on a device with no Space key: the on-screen button below
                  is the whole loop there, and "space" beside it is an
                  instruction she cannot follow. */}
              <p className="ac-section-hint">
                {noKeyboard ? null : <kbd>space</kbd>}{" "}
                {paused
                  ? "back to it"
                  : countdown !== null
                    ? micRefused
                      ? "once the microphone is on"
                      : "in a moment"
                    : KEY_DOES[phase]}
              </p>
              {/* The same act as Space, for a device that has no Space.
                  Rendered only where there is no keyboard, so the desktop loop
                  is untouched and no mouse enters it. Disabled through the beat
                  for the same reason the hint reads "in a moment": nothing may
                  advance before the section has started. */}
              {noKeyboard && onAdvance ? (
                <button
                  type="button"
                  className="ac-section-advance"
                  onClick={onAdvance}
                  disabled={countdown !== null || paused}
                >
                  {countdown !== null
                    ? micRefused
                      ? "Waiting for the microphone"
                      : "Starting"
                    : KEY_DOES[phase] === "recall full stimulus"
                      ? "Recall full stimulus"
                      : "Next stimulus"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* The first-run walkthrough. Beside the paper, never on it, and it
            holds nothing up: no key of its own, nothing to acknowledge, gone
            of its own accord after the third stimulus. */}
        {coach && countdown === null && !paused ? (
          <aside className="ac-section-coach" aria-label="Walkthrough">
            <p className="ac-section-coach-step">
              Walkthrough · {coach.step} of {coach.of}
            </p>
            <p className="ac-section-coach-title">{coach.title}</p>
            <p className="ac-section-coach-body">{coach.body}</p>
            {coach.steps ? (
              <ol className="ac-section-coach-steps">
                {coach.steps.map((s) => (
                  <li key={s.label}>
                    <strong>{s.label}</strong> {s.short}
                  </li>
                ))}
              </ol>
            ) : null}
            <p className="ac-section-coach-next">
              <span>Next</span> {coach.next}
            </p>
            {onDismissCoach ? (
              <button type="button" className="ac-section-coach-hide" onClick={onDismissCoach}>
                Hide this
              </button>
            ) : null}
          </aside>
        ) : null}
      </main>
    </div>
  );
}
