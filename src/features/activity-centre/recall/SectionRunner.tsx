import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { listItemResponses, requestSectionGrading } from "../api/activitiesClient";
import { acknowledgeSectionCompletion, keepSectionCompletion, requireSectionEvidence, requireSectionRecording, type PendingSectionCompletion } from "./sectionCompletion";
import { SectionStage } from "./SectionStage";
import { coachNote, hasSeenWalkthrough, markWalkthroughSeen } from "./coach";
import { useSectionRecorder, type RecordingSegment } from "./useSectionRecorder";
import { sliceTranscript, useSectionTranscript } from "./useSectionTranscript";
import { beginBackup, discard, putChunk, stashRows } from "./recordingBackup";
import { beginLiveRun } from "@/lib/liveRun";
import {
  advanceCursor,
  buildSectionRun,
  startCursor,
  type Accommodation,
  type SectionCursor,
} from "./section";
import "./section.css";

/**
 * The generated insert shape for one attempt row, plus `rrc`.
 *
 * Same intersection, and the same reason, as `RecallRunner`: the column was
 * added by `20260829140000_recall_responses.sql` and `types.ts` is generated
 * from the deployed schema, so it will only learn the column the next time
 * types are pulled against a database that has the migration applied. Delete
 * the intersection once they are.
 */
type ResponseInsert = Database["public"]["Tables"]["activity_item_responses"]["Insert"];

/**
 * Where a section's recording is kept. Private, and readable only by the
 * student it belongs to and the instructor; see the bucket's own migration.
 */
const RECORDING_BUCKET = "drill-recordings";

/**
 * A Read, Recall, Colour SECTION run: 22 to 26 stimuli, end to end, one clock,
 * no going back.
 *
 * Two rules shape everything here, both from
 * `docs/specs/2026-08-31-rrc-section-mode.md` section 4, and both negative:
 *
 * - **No coach in the loop.** Nothing is judged, shown or scored until the
 *   section ends. A live verdict trains her to vet before speaking, which is
 *   the exact habit colouring exists to break.
 * - **Nothing the loop waits on.** A dropped connection must not be able to
 *   stall the student mid-section. This used to be enforced by writing nothing
 *   at all until the last stimulus, which held for twenty minutes of work in
 *   the tab's memory and lost every second of it to a crash, a closed lid or a
 *   flat battery. The rule it was protecting is that the loop must not WAIT,
 *   not that nothing may be written -- so each stimulus is now handed to the
 *   database as it finishes, fired and forgotten, from an effect rather than
 *   from the keypress. Nothing is awaited between one stimulus and the next,
 *   and a write that fails is picked up by the backstop at the end.
 *
 *   A section is still the unit of work: half a section is not a partial score
 *   and never becomes one. That is enforced where it belongs, in the grader,
 *   which grades a run only once it is marked finished. Saving and judging are
 *   different acts, and conflating them is what cost the twenty minutes.
 *
 * It records. One unbroken file for the whole section, started before the loop
 * and stopped after it, exactly as the drill requires, uploaded once at the end
 * to a private bucket only she and the instructor can read. Every phase
 * boundary is stamped as an offset into that file, so each portion of each
 * stimulus is addressable without the recorder ever having been paused. See
 * `useSectionRecorder`.
 *
 * A refused or missing microphone does not stop the drill. It says so and the
 * section continues, because the drill is still a valid drill run against a
 * handheld recorder, and twenty minutes is far too long to spend talking into
 * nothing without being told.
 */

export interface SectionRunnerProps {
  assignmentId: string;
  studentId: string;
  /** The assignment's snapshot: items, the clock, and which section it is. */
  items: unknown;
  sourceSection: string | null | undefined;
  timeGoalMinutes: unknown;
  /**
   * Which goal her time is scored against. Defaults to standard; a student with
   * 53% or 70% extra time is not slow when she takes longer, and grading her
   * against the standard goal would score her accommodation as a failure.
   */
  accommodation?: Accommodation;
  onComplete?: () => void;
  onExit?: () => void;
  /** Injected in tests. Real runs use the wall clock. */
  now?: () => number;
  /**
   * The ready beat, in seconds. Injected in tests so a run can be driven
   * without waiting out three real seconds; every real run takes the default.
   */
  readySeconds?: number;
}

/**
 * What one stimulus's run looked like, written once the section is over.
 *
 * Stimulus-grained, like the cursor: time with the text up, time recalling
 * from memory, and nothing per chunk, because no chunk boundary was observed
 * (`docs/adr/0013-she-chunks-freely-and-the-app-does-not-track-it.md`).
 */
interface StimulusRecord {
  slug: string;
  order: number;
  /** Seconds from the section's start to the end of this stimulus. */
  finishedAtSeconds: number;
  /** Seconds spent on this stimulus alone. */
  elapsedSeconds: number;
  /** Seconds with the text on screen: her reads, recalls and colouring. */
  workingSeconds: number;
  /** Seconds spent giving The Recall, text gone. */
  recallSeconds: number;
}

/** Stable identity so hooks keyed on `now` do not restart every render. */
const defaultNow = () => Date.now();

/**
 * How long the ready beat runs before the first stimulus.
 *
 * Long enough to read one line and see the level move, short enough that it is
 * never in the way of a student on her fourth section of the week.
 */
const READY_SECONDS = 3;

/** A row gets a few quiet chances while she is still working, never an unbounded loop. */
const ROW_RETRY_ATTEMPTS = 3;
const ROW_RETRY_BASE_MS = 500;
const ROW_RETRY_MAX_MS = 4_000;

export function SectionRunner({
  assignmentId,
  studentId,
  items,
  sourceSection,
  timeGoalMinutes,
  accommodation = "standard",
  onComplete,
  onExit,
  now = defaultNow,
  readySeconds = READY_SECONDS,
}: SectionRunnerProps) {
  const run = useMemo(
    () => buildSectionRun(items, sourceSection, timeGoalMinutes),
    [items, sourceSection, timeGoalMinutes],
  );
  if (!run) {
    return (
      <div className="ac-section">
        <div className="ac-section-body">
          <p className="ac-section-instruction">This section could not be read</p>
          {onExit ? (
            <button type="button" className="ac-section-exit" onClick={onExit}>
              Leave
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <RunBody
      run={run}
      assignmentId={assignmentId}
      studentId={studentId}
      accommodation={accommodation}
      onComplete={onComplete}
      onExit={onExit}
      now={now}
      readySeconds={readySeconds}
    />
  );
}

function RunBody({
  run,
  assignmentId,
  studentId,
  accommodation,
  onComplete,
  onExit,
  now,
  readySeconds,
}: {
  run: NonNullable<ReturnType<typeof buildSectionRun>>;
  assignmentId: string;
  studentId: string;
  accommodation: Accommodation;
  onComplete?: () => void;
  onExit?: () => void;
  now: () => number;
  readySeconds: number;
}) {
  const [cursor, setCursor] = useState<SectionCursor>(startCursor);
  const [done, setDone] = useState(false);
  /**
   * The first-run walkthrough, on for a student who has never run a section.
   *
   * Read once, at mount, and marked seen at the same moment: it is a
   * first-section thing, not a first-finished-section thing, so an abandoned
   * first run does not bring it back. She can also hide it early.
   */
  const [coachOn, setCoachOn] = useState(() => !hasSeenWalkthrough(studentId));
  useEffect(() => {
    if (coachOn) markWalkthroughSeen(studentId);
    // Deliberately once, on mount, against the value read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /**
   * Seconds left in the ready beat, counting to zero, and null once she is
   * working.
   *
   * The microphone opens on mount and the clock used to start with it, so the
   * first thing a 25-minute unrepeatable take captured was a student still
   * arranging herself -- and the very first frame she saw was already stimulus
   * one, with no moment in between that said the recording had begun. Three
   * seconds is the whole fix: the recorder is live through it, so the level
   * indicator is moving and a dead microphone is visible BEFORE any of it
   * costs her anything, and the section's own clock does not start until it
   * ends.
   */
  const [countdown, setCountdown] = useState<number | null>(readySeconds);
  /** Confirming the way out. Leaving throws the whole run away. */
  const [confirmingExit, setConfirmingExit] = useState(false);
  /**
   * Nothing reaching the microphone. Shown rather than logged: it is the one
   * fault that otherwise ends in a perfect-looking run and a card of zeros.
   *
   * Two-way, and it was not. `setDeadInput(true)` was the only call in the
   * tree, so the warning could be raised and never lowered: one skipped Recall
   * put "Nothing is reaching the microphone" on the screen at 121s and left it
   * there for the remaining twenty-five stimuli, through four minutes of speech
   * the drill heard perfectly well. `VoiceLevel` now reports the state rather
   * than announcing the fault, and this is the setter for both directions.
   */
  const [deadInput, setDeadInput] = useState(false);
  /** The recording did not reach the server. Said plainly at the end. */
  const [uploadFailed, setUploadFailed] = useState(false);
  /** Response rows still absent after the per-row end-of-run backstop. */
  const [unsavedCount, setUnsavedCount] = useState(0);
  /** True only after a real recording has reached storage. */
  const [recordingStored, setRecordingStored] = useState(false);
  const [completionError, setCompletionError] = useState(false);
  const [completionBusy, setCompletionBusy] = useState(true);
  const completionInFlight = useRef(false);
  const pendingCompletion = useRef<PendingSectionCompletion | null>(null);
  const reportOpened = useRef(false);

  const closeSavedSection = useCallback(async () => {
    if (!pendingCompletion.current || completionInFlight.current || reportOpened.current) return;
    completionInFlight.current = true;
    setCompletionBusy(true);
    setCompletionError(false);
    try {
      keepSectionCompletion(pendingCompletion.current);
      const saved = await listItemResponses(assignmentId, studentId);
      requireSectionEvidence(pendingCompletion.current, saved, run.stimuli.map(item => item.order));
      await requireSectionRecording(pendingCompletion.current);
      await acknowledgeSectionCompletion(assignmentId, studentId);
      reportOpened.current = true;
      void requestSectionGrading(assignmentId);
      onComplete?.();
    } catch (error) {
      console.error("[rrc] could not close the assignment", error);
      setCompletionError(true);
    } finally {
      completionInFlight.current = false;
      setCompletionBusy(false);
    }
  }, [assignmentId, studentId, onComplete, run.stimuli]);
  /**
   * This sitting's own name for its local backup.
   *
   * Made before anything else, because pieces of the recording start arriving
   * long before the Attempt number comes back, and every piece has to be
   * filed under something. The run record that says where the pieces belong is
   * written as soon as the Attempt is known.
   */
  /**
   * She stepped away. The section is still open and its clock is not running.
   *
   * A section is twenty-five unbroken minutes and is scored whole, which used to
   * mean the only way out of one was the way that throws it away. So a student
   * who had to answer the door had two options and both were bad: sit through
   * the interruption on the clock, or lose twenty-five minutes of work. She
   * asked for the third one.
   *
   * A pause is deliberately not a small thing. The stimulus goes off the screen
   * with it, because a paused stimulus she can still read is not a break, it is
   * unlimited untimed reading time and it would quietly make the drill
   * meaningless. The recorder pauses rather than stops, so it is still one file.
   * And how long she was away is stored on the run rather than dissolved into
   * it: a section with four minutes of pauses in it is a fact about the sitting
   * that whoever reads the Report Card is entitled to.
   */
  const [paused, setPaused] = useState(false);
  /**
   * Every clock in this run, with her breaks taken out.
   *
   * One function, and everything that measures anything goes through it: the
   * clock in the rail, the per-stimulus timings, the recording's index and the
   * transcript's. That is not tidiness, it is the correctness argument. The
   * recorder pauses, so the FILE has no break in it; if the timeline kept
   * running through one, every offset after the first pause would name a
   * stretch of audio minutes away from the words it claims. Freezing the one
   * clock they all read is what keeps the file, the index, the transcript and
   * her score describing the same run.
   *
   * `now` -- the real wall clock -- survives underneath for the one thing that
   * genuinely happened in real time: measuring the break itself.
   */
  const pausedTotalMs = useRef(0);
  const pausedSince = useRef<number | null>(null);
  const pauseCount = useRef(0);
  const runNow = useCallback(
    () => (pausedSince.current ?? now()) - pausedTotalMs.current,
    [now],
  );
  /** A pause this browser would not give her, said plainly rather than swallowed. */
  const [pauseError, setPauseError] = useState<string | null>(null);

  const runId = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `run-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  );
  const keepChunk = useCallback((blob: Blob, seq: number) => {
    void putChunk(runId.current, seq, blob);
  }, []);
  const {
    start: startRecording,
    pause: pauseRecording,
    resume: resumeRecording,
    mark,
    stop: stopRecording,
    error: micError,
    recording,
    getStream,
    getMimeType,
    getStartedAt,
  } = useSectionRecorder(runNow, keepChunk);
  /**
   * The microphone said no, and this drill is only spoken.
   *
   * The beat used to count down through it into a full 26-stimulus run that
   * the grader would refuse for having no recording, under a heading that said
   * "Recording now" while the footer said nothing was being recorded. Every
   * one of those minutes was spent for nothing, and there was no way to ask
   * again and no way to stop before the clock started.
   */
  const micRefused = micError !== null;
  // Runs for the whole section, alongside the recording rather than instead of
  // it. The audio file stays the primary record.
  /*
   * Off while she is away, and cut against the recording's own zero.
   *
   * Recognition left running through a break would file whatever is said in the
   * room -- to the person at the door, to nobody -- inside the stimulus she is
   * halfway through, at the one offset the paused clock is frozen at.
   */
  const { transcript } = useSectionTranscript(!done && !paused, runNow, getStartedAt);
  /**
   * Guards the one write, and a ref rather than state on purpose.
   *
   * As state it re-entered its own effect: setting it fired the cleanup, which
   * cancelled the write's continuation, and the re-run then bailed on the flag
   * it had just set. The section saved but never finished, so she sat on the
   * last frame forever. A ref changes nothing about when the effect runs.
   */
  const saving = useRef(false);

  const startedAt = useRef(runNow());
  /** When the phase currently on screen began. Both phases are timed. */
  const phaseStartedAt = useRef(runNow());
  const stimulusStartedAt = useRef(runNow());
  const records = useRef<StimulusRecord[]>([]);
  const workingSeconds = useRef(0);
  /**
   * Each stimulus's own portions of the recording, closed as they end.
   *
   * The recorder keeps the whole index and only hands it over at `stop`, which
   * is exactly the moment a crashed run never reaches. A row written as its
   * stimulus finishes has to carry its own stretch of the file with it, so the
   * segments are collected here as `mark` returns them.
   */
  const segmentsByOrder = useRef<Map<number, RecordingSegment[]>>(new Map());
  /**
   * Which Attempt this run is.
   *
   * A Section can be run again, and the rows of one run must never be mistaken
   * for the rows of another. That matters far more now that rows are written
   * during the run: an abandoned half-run leaves its stimuli behind, and a
   * fresh run starting at stimulus 1 would otherwise collide with them on the
   * unique index, lose the write, and end up graded as a mixture of two
   * sittings with the audio of only one.
   *
   * Null until the count comes back. The loop never waits on it: the flush
   * holds its rows until it lands, which takes one round trip at mount and is
   * done long before the first stimulus ends.
   */
  const attemptNo = useRef<number | null>(null);
  const [attemptReady, setAttemptReady] = useState(false);
  const [attemptLoadFailed, setAttemptLoadFailed] = useState(false);
  const [attemptLoadCycle, setAttemptLoadCycle] = useState(0);
  /** Stimuli already handed to the database for their first save. */
  const queued = useRef(0);
  /** Saves still resolving when the section ends. The backstop waits for them before retrying. */
  const inFlightRows = useRef<Set<Promise<boolean>>>(new Set());
  /** At most one pending timer per failed attempt, all cancelled at the backstop. */
  const retryTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  /** Stops a retry from firing after the run has entered its final backstop. */
  const finishing = useRef(false);

  useEffect(() => {
    return () => {
      finishing.current = true;
      for (const timer of retryTimers.current) clearTimeout(timer);
      retryTimers.current.clear();
    };
  }, []);

  const seconds = useCallback(
    (from: number) => Math.max(0, Math.round((runNow() - from) / 1000)),
    [runNow],
  );

  /*
   * The clock in the rail, ticked once a second.
   *
   * State rather than a ref, because it has to redraw. It is deliberately the
   * only thing in this component that re-renders on a timer: nothing else on
   * screen changes between her presses, and the recorder is untouched by it --
   * `mark()` reads refs and the recorder is started once on mount.
   */
  const [elapsed, setElapsed] = useState(0);

  /*
   * The ready beat, and the moment the section actually starts.
   *
   * Every clock in the run is re-zeroed as it ends, so the three seconds are
   * not charged to her goal. The RECORDER is deliberately not restarted: it
   * has been running since mount, which is what lets her see the level move
   * before the first stimulus, and restarting a recorder mid-section is the
   * one thing the drill forbids outright. The beat simply sits at the head of
   * the file, inside stimulus one's first window, as three seconds of nothing.
   */
  useEffect(() => {
    if (countdown === null) return;
    /*
     * The beat is also the gate.
     *
     * `getUserMedia` is a prompt she has to answer, and answering it can take
     * longer than three seconds, so a beat that ticks regardless would start
     * the section before the microphone had said anything at all. It waits for
     * an answer, and if the answer is no it holds here rather than spending
     * twenty-five unrepeatable minutes on a run nothing can mark.
     */
    if (!recording && !micRefused) return;
    if (micRefused) return;
    if (countdown <= 0) {
      startedAt.current = runNow();
      phaseStartedAt.current = startedAt.current;
      stimulusStartedAt.current = startedAt.current;
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, runNow, recording, micRefused]);

  /*
   * `countdown` is a dependency on purpose. This effect returns early during
   * the beat, so the ticker can only start when the beat ends -- and the beat
   * ending is a change to `countdown`. Without it the effect ran once, at
   * mount, and the clock read 0:00 for the whole of every run.
   */
  useEffect(() => {
    if (done || countdown !== null || paused) return;
    const tick = setInterval(() => setElapsed(seconds(startedAt.current)), 1000);
    return () => clearInterval(tick);
  }, [countdown, done, paused, seconds]);

  /*
   * Hold the app still for the length of the run.
   *
   * Two things in the browser will end a section without asking. The app's own
   * freshness check reloads the tab when a newer bundle has been published, on
   * every return to it -- so publishing mid-section and her glancing away was
   * enough to lose twenty-five minutes. And a reflex Cmd-R or a closed tab does
   * the same thing by hand.
   *
   * The first is suppressed outright: the reload is deferred until the run
   * ends, which costs her one stale bundle for one section. The second cannot
   * be suppressed, so it is questioned -- `beforeunload` is the browser's own
   * prompt and the only guard available, and it is deliberately registered for
   * the whole run rather than only once she has spoken, because the expensive
   * thing to lose is the recording and that starts here.
   */
  useEffect(() => {
    const release = beginLiveRun();
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Set for the browsers that still require it; none of them show the
      // string any more, and the prompt is generic by design.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      release();
    };
  }, []);

  /*
   * Press record at the very beginning. Before the first chunk, not on the
   * first keypress: the drill's first act is reading, and a recording that
   * starts on the first Space has already missed it.
   */
  useEffect(() => {
    if (!attemptReady) return;
    void startRecording();
    // Mount only. Restarting a recorder mid-section is the one thing the drill
    // forbids outright.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptReady]);

  /*
   * A run she leaves has no backup worth keeping.
   *
   * Leaving throws the whole run away (ADR 0023), and the recorder closes with
   * the hook. What the backup store still holds for this run id is the pieces
   * of a sitting that will never be graded: recovery would take them for a
   * crashed run and upload them, and on 2026-09-08 it did exactly that, over
   * the finished recording of the same assignment. So they go now.
   *
   * A run that ENDED is a different case and is left alone: its own finish
   * path discards the backup once the upload lands, and if she leaves the
   * Report Card handover mid-upload the pieces are the only copy there is.
   * Ordering matters here: React runs cleanups in the order the effects were
   * declared, and the one that cancels retries has already run by now.
   */
  useEffect(
    () => () => {
      // `saving`, not `finishing`: the unmount cleanup above raises `finishing`
      // for every unmount, ended or abandoned, while `saving` is set by the
      // finish path alone.
      if (saving.current) return;
      void discard(runId.current);
    },
    [],
  );

  /**
   * One key press, twice per stimulus. This is the whole interaction: no mouse
   * in the loop, and no other signal either -- advancing on detected silence
   * was considered and rejected, because a timeout would cut her off
   * mid-sentence if she paused to think (ADR 0013).
   *
   * The cursor itself is decided by `section.ts`, which is pure and tested.
   * What lives here is only the timing that goes with each transition, and the
   * one write at the end.
   */
  const press = useCallback(() => {
    if (done || saving.current || countdown !== null || paused) return;
    setCursor((at) => {
      const stimulus = run.stimuli[at.item];
      const spent = seconds(phaseStartedAt.current);
      phaseStartedAt.current = runNow();

      // Close this portion in the recording's index. Refs and arithmetic only:
      // nothing here reaches the network, so the loop cannot stall on it. The
      // two presses are the only moments not recoverable from the audio, and
      // this stamp is what makes each stimulus's stretch of the file findable.
      const closed = mark({
        slug: stimulus.slug,
        order: stimulus.order,
        phase: at.phase,
      });
      if (closed) {
        const forOrder = segmentsByOrder.current.get(stimulus.order) ?? [];
        forOrder.push(closed);
        segmentsByOrder.current.set(stimulus.order, forOrder);
      }

      if (at.phase === "working") {
        workingSeconds.current = spent;
      } else {
        // The Recall is over, so this stimulus is finished. Its record is
        // buffered, not written: no network call inside the loop.
        records.current.push({
          slug: stimulus.slug,
          order: stimulus.order,
          finishedAtSeconds: seconds(startedAt.current),
          elapsedSeconds: seconds(stimulusStartedAt.current),
          workingSeconds: workingSeconds.current,
          recallSeconds: spent,
        });
        workingSeconds.current = 0;
        stimulusStartedAt.current = runNow();
      }

      const next = advanceCursor(run, at);
      if (!next) {
        setDone(true);
        return at;
      }
      return next;
    });
  }, [done, countdown, paused, run, seconds, runNow, mark]);

  /**
   * Where this run's recording will live, decided before it exists.
   *
   * The path is a pure function of the student, the assignment and the Attempt,
   * so a row written at stimulus 3 can already name the file that stimulus 22
   * will upload. Without that, a row saved during the run could not say where
   * its audio was, and the grader would have nothing to fetch.
   *
   * The Attempt is in the name so a second sitting cannot overwrite the
   * recording of the first.
   */
  const audioPath = useCallback(() => {
    const attempt = attemptNo.current;
    if (attempt === null) return null;
    const ext = getMimeType().includes("mp4") ? "m4a" : "webm";
    return `${studentId}/${assignmentId}${attempt > 1 ? `-a${attempt}` : ""}.${ext}`;
  }, [assignmentId, studentId, getMimeType]);

  /**
   * One stimulus, as a row.
   *
   * Shared by the save that happens during the run and the backstop that
   * happens after it, so the two can never disagree about what a stimulus row
   * is. `sectionTotalSeconds` is the one field only the end knows; during the
   * run it is null, and the grader reads the section's length from the last
   * stimulus instead of insisting on it.
   */
  const buildRow = useCallback(
    (r: StimulusRecord, said: ReturnType<typeof transcript>, sectionTotalSeconds: number | null) => {
      const segments = segmentsByOrder.current.get(r.order) ?? [];
      /*
       * Every window closed so far, not just this stimulus's.
       *
       * The transcript is cut against the whole timeline rather than against
       * one stimulus's windows in isolation, because the boundaries ARE a
       * partition of the run and slicing them separately let two stimuli claim
       * the same words. That is how 21 rows in 22 came to store the previous
       * stimulus's recall.
       */
      const timeline = [...segmentsByOrder.current.values()].flat();
      const path = audioPath();
      return {
        assignment_id: assignmentId,
        student_id: studentId,
        item_order: r.order,
        /*
         * Empty, never null. The column is NOT NULL and an explicit null bypasses
         * its default, so a stimulus the recogniser heard nothing in was a row
         * Postgres refused -- and a browser with no SpeechRecognition at all
         * (Safari, Firefox) could not save a single one. "Not captured" is
         * `transcript_source: null` below; this field is only ever the words.
         */
        response_text: sliceTranscript(said, segments).join(" ").trim(),
        attempt_no: attemptNo.current ?? 1,
        rrc: {
          mode: "section",
          source_section: run.sourceSection,
          slug: r.slug,
          finished_at_seconds: r.finishedAtSeconds,
          elapsed_seconds: r.elapsedSeconds,
          working_seconds: r.workingSeconds,
          recall_seconds: r.recallSeconds,
          section_total_seconds: sectionTotalSeconds,
          /*
           * Her breaks, stated rather than hidden.
           *
           * Every other number on this row already has the pauses taken out of
           * it -- that is what the paused clock is for -- so without these two
           * a sitting broken by ten minutes at the door is indistinguishable
           * from one run straight through. That is a fact about the sitting,
           * and the person reading the card is the one it matters to.
           *
           * Cumulative at the moment the row was written, exactly like
           * `finished_at_seconds`: a row saved at stimulus 5 cannot know about a
           * break she takes at stimulus 12. The run's total is the largest of
           * them, which is the last row's.
           */
          paused_seconds: Math.round(pausedTotalMs.current / 1000),
          pause_count: pauseCount.current,
          accommodation,
          goal_minutes: run.timeGoalMinutes[accommodation],
          audio_bucket: path ? RECORDING_BUCKET : null,
          audio_path: path,
          audio_duration_ms: null,
          audio_segments: segments,
          transcript_segments: sliceTranscript(said, segments, timeline),
          transcript_source: said.length > 0 ? "browser-speech" : null,
        },
      };
    },
    [accommodation, assignmentId, audioPath, run.sourceSection, run.timeGoalMinutes, studentId],
  );

  /**
   * Store exactly one row.
   *
   * The unique key makes this idempotent. Keeping the database statement at
   * one row is what prevents one malformed or rejected response from taking
   * every good response in the same request down with it.
   */
  const persistRow = useCallback(async (row: ResponseInsert): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("activity_item_responses")
        .upsert([row], {
          onConflict: "assignment_id,student_id,item_order,attempt_no",
          ignoreDuplicates: true,
        });
      return !error;
    } catch (error) {
      console.error("[rrc] response write failed", error);
      return false;
    }
  }, []);

  /**
   * Find out which Attempt this is, once, at the start.
   *
   * One read before the first stimulus ends. It is deliberately not in the
   * loop and nothing waits on it there: the flush simply does not run until it
   * has landed, and it lands during her first read.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("activity_item_responses")
        .select("attempt_no")
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId)
        .order("attempt_no", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (cancelled) return;
      attemptNo.current = (data?.[0]?.attempt_no ?? 0) + 1;
      setAttemptReady(true);

      /*
       * Tell the local backup where this run's audio belongs.
       *
       * Written once the Attempt is known, which is what the path depends on.
       * Pieces filed before this moment are not lost: they carry the same run
       * id and this record is what gives them somewhere to be uploaded to.
       */
      const path = `${studentId}/${assignmentId}${attemptNo.current > 1 ? `-a${attemptNo.current}` : ""}.${
        getMimeType().includes("mp4") ? "m4a" : "webm"
      }`;
      void beginBackup({
        runId: runId.current,
        assignmentId,
        studentId,
        attempt: attemptNo.current,
        path,
        bucket: RECORDING_BUCKET,
        mimeType: getMimeType(),
        startedAt: Date.now(),
      });
    })().catch(error => {
      console.error("[rrc] could not read the attempt number", error);
      if (!cancelled) setAttemptLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [assignmentId, studentId, getMimeType, attemptLoadCycle]);

  /**
   * Save every stimulus that has finished since the last time this ran.
   *
   * In an effect rather than in `press`, because React is allowed to run a
   * state updater twice and a network write must not be one of the things it
   * repeats. Fired and not awaited: the loop never waits on this, which was the
   * whole point of writing nothing at all before.
   *
   * A failed row is retried with bounded backoff while she keeps working. Every
   * record also stays in `records`, and the backstop at the end re-sends each
   * one on its own, so a rejected row cannot take the good ones with it.
   */
  useEffect(() => {
    if (!attemptReady) return;
    if (records.current.length <= queued.current) return;
    const fresh = records.current.slice(queued.current);
    queued.current = records.current.length;
    const saveWithRetry = (record: StimulusRecord, attempt: number) => {
      if (finishing.current) return;
      const row = buildRow(record, transcript(), null) as ResponseInsert;
      const save = persistRow(row);
      inFlightRows.current.add(save);
      void save.then((stored) => {
        inFlightRows.current.delete(save);
        if (stored || finishing.current) return;
        console.error("[rrc] could not save a stimulus as it finished", {
          item_order: record.order,
          attempt: attempt + 1,
        });
        if (attempt + 1 >= ROW_RETRY_ATTEMPTS) return;
        const delay = Math.min(ROW_RETRY_BASE_MS * 2 ** attempt, ROW_RETRY_MAX_MS);
        const timer = setTimeout(() => {
          retryTimers.current.delete(timer);
          saveWithRetry(record, attempt + 1);
        }, delay);
        retryTimers.current.add(timer);
      });
    };
    for (const record of fresh) saveWithRetry(record, 0);
  }, [cursor, done, attemptReady, buildRow, persistRow, transcript]);

  // One key, and only Space. Bound on the document because the loop must not
  // depend on anything holding focus: a stray click on the page would otherwise
  // silently stop her being able to advance.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      // Not while she is being asked whether to throw the run away.
      if (confirmingExit) return;
      /*
       * Anything that takes typing keeps its own spaces.
       *
       * This is bound on the document and it calls `preventDefault`, so every
       * element the list forgets is an element the space bar stops working in
       * while a section is open. It listed BUTTON and INPUT and not TEXTAREA or
       * a contenteditable, which are exactly what a message box is made of --
       * and a student typing into one gets her words back with every space
       * removed, with nothing on screen to explain it.
       */
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "BUTTON" ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      e.preventDefault();
      press();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmingExit, done, press]);

  /**
   * Step away, and come back to the same run.
   *
   * The recording is paused FIRST and the clock only stops if it actually did.
   * A recorder that kept writing while the timeline stopped would put the whole
   * break inside the file with nothing in the index to say it is there, and
   * every segment after it would point minutes away from the words it names --
   * a wrong grade that looks like a right one, which is the failure this whole
   * feature has to not introduce. If the browser will not pause, she is told so
   * and the section carries on running rather than half-pausing.
   */
  const pauseRun = useCallback(() => {
    if (done || paused || countdown !== null || saving.current) return;
    if (!pauseRecording()) {
      setPauseError(
        "This browser will not pause the recording, so the section cannot pause. Keep going, or leave and start again in Chrome.",
      );
      return;
    }
    pausedSince.current = now();
    pauseCount.current += 1;
    setPauseError(null);
    setPaused(true);
  }, [countdown, done, paused, now, pauseRecording]);

  /**
   * Back to it.
   *
   * The break is added to the total before the clock is let go, so the instant
   * she resumes is the instant she left, and not one second of the break
   * reaches her time or the file's index.
   *
   * A resume that fails leaves her paused on purpose. The alternative is
   * twenty-five more minutes spoken into a recorder that stopped writing, and
   * the grader refuses a run with no recording -- the same reasoning that makes
   * the ready beat hold on a refused microphone rather than count down into a
   * run nothing can mark.
   */
  const resumeRun = useCallback(() => {
    if (!paused) return;
    if (!resumeRecording()) {
      setPauseError(
        "The recording did not start again, so nothing more can be marked. Leave this section and run it again.",
      );
      return;
    }
    if (pausedSince.current !== null) {
      pausedTotalMs.current += Math.max(0, now() - pausedSince.current);
      pausedSince.current = null;
    }
    setPauseError(null);
    setPaused(false);
  }, [paused, now, resumeRecording]);

  /**
   * Leaving, in two steps.
   *
   * Before the section starts there is nothing to lose and the button is just a
   * way out. Once she is working, one click on a permanently visible control
   * would throw away up to twenty-five minutes that is deliberately never
   * scored in part, so it asks first.
   */
  const askToExit = useCallback(() => {
    if (countdown !== null) onExit?.();
    else setConfirmingExit(true);
  }, [countdown, onExit]);

  /*
   * A run that ENDS while paused still has to close its books.
   *
   * `done` is reachable from a pause -- she can be paused on the last stimulus
   * when a resume fails, or the last press can be followed by one. The break
   * that is still open at that moment has never been added to the total, so
   * without this the final row would report a paused-time of everything except
   * the pause she was actually in.
   */
  useEffect(() => {
    if (!done || pausedSince.current === null) return;
    pausedTotalMs.current += Math.max(0, now() - pausedSince.current);
    pausedSince.current = null;
  }, [done, now]);

  /**
   * The end of the run: stop the recorder, upload, and re-send everything.
   *
   * The rows are already on record, stimulus by stimulus. What is left that
   * only the end knows is the audio file and the section's total length.
   */
  useEffect(() => {
    if (!done || saving.current) return;
    saving.current = true;
    finishing.current = true;
    for (const timer of retryTimers.current) clearTimeout(timer);
    retryTimers.current.clear();
    let cancelled = false;
    void (async () => {
      const total = seconds(startedAt.current);

      /*
       * Stop the recorder and put the file away.
       *
       * The path was decided before the section began, so the rows written
       * during the run already name this file. Uploading is the act of making
       * that name true.
       *
       * A failed upload does not fail the section. Twenty minutes of work and
       * the timings are still worth keeping, and the grader treats a file that
       * is not there as "not captured", which is the truth.
       */
      const finished = await stopRecording();
      const path = audioPath();
      if (path) {
        // Capture the finished take before either save can fail. Reload can
        // recover its backups and verify both account evidence channels.
        pendingCompletion.current = { assignmentId, studentId, audioPath: path,
          attemptNo: attemptNo.current ?? 1, itemOrders: records.current.map(row => row.order) };
        try { keepSectionCompletion(pendingCompletion.current); }
        catch (error) { console.error("[rrc] could not retain closeout intent", error); }
      }
      let storedRecording = false;
      if (finished && finished.blob.size > 0 && path) {
        /*
         * Once, then once more, then say so.
         *
         * A failed upload used to be a console line, and its consequence
         * arrived minutes later somewhere else entirely: the grader refuses a
         * run with no recording, so a dropped connection at this exact moment
         * turned twenty-five minutes of correct work into "Not scored" with
         * nothing anywhere saying why. It is a real fault and it is hers to
         * know about, because the recovery needs her to open the section again.
         */
        const uploadRecording = async () => {
          try {
            return (await supabase.storage.from(RECORDING_BUCKET)
              .upload(path, finished.blob, { contentType: finished.mimeType, upsert: true })).error;
          } catch (error) { return error; }
        };
        let upload = await uploadRecording();
        if (upload) {
          console.error("[rrc] could not store the recording; retrying once", upload);
          upload = await uploadRecording();
        }
        if (upload) {
          console.error("[rrc] could not store the recording", upload);
          if (!cancelled) setUploadFailed(true);
        }
        // The real recording is safely away, so the local copy has done its
        // job. Deliberately only on success: an upload that failed is exactly
        // when the backup is the only copy there is, and the next open of this
        // section is what sends it.
        else {
          storedRecording = true;
          void discard(runId.current);
        }
      }
      if (!cancelled) setRecordingStored(storedRecording);

      /*
       * Her words, cut at the same boundaries as the audio.
       *
       * Both channels are stamped in milliseconds from the same start, so the
       * text for one portion and the audio for that portion are the same slice
       * of the same run rather than two things lined up by hand afterwards.
       */
      const said = transcript();
      const rows: (ResponseInsert & { rrc: unknown })[] = records.current.map((r) =>
        buildRow(r, said, total),
      );
      let missingRows = 0;

      if (rows.length > 0) {
        /*
         * The backstop, not the write.
         *
         * Every stimulus was already sent as it finished. This re-sends the
         * whole run so that anything the network dropped along the way still
         * lands, and duplicates are declined rather than treated as failures.
         * On a clean run it inserts nothing at all.
         */
        // Let every save already in flight settle first. Otherwise an initial
        // save could succeed just after a failed backstop and make the warning
        // false before it was even painted.
        await Promise.allSettled([...inFlightRows.current]);
        const stored = await Promise.all(rows.map((row) => persistRow(row as ResponseInsert)));
        missingRows = stored.filter((ok) => !ok).length;
        if (missingRows > 0) {
          console.error("[rrc] response rows still missing after the backstop", { missing: missingRows });
          if (!cancelled) setUnsavedCount(missingRows);
          /*
           * The way back, which these rows did not have.
           *
           * They live in `records.current`, in memory, in a component about to
           * unmount. She leaves this screen and the answers are gone, and
           * ADR 0027 then refuses the whole run for ever -- including the
           * recording, which may have uploaded perfectly. So the ones that did
           * not land go where the recording's own backup goes, and the next
           * entry into any section sends them.
           *
           * Not conditional on the upload. The common shape of this failure is
           * exactly the run whose audio is safely away and whose answers are
           * not.
           */
          await stashRows(
            rows
              .map((row, i) => ({ row, ok: stored[i] }))
              .filter((r) => !r.ok)
              .map(({ row }) => ({
                runId: runId.current,
                assignmentId,
                studentId,
                itemOrder: row.item_order,
                row,
              })),
          );
        }
      }

      // Completion is acknowledged only after the recording and every row
      // landed. Keep that evidence marker before attempting the status write,
      // so a lost response or reload can retry closeout without another take.
      if (missingRows === 0 && storedRecording && path && !cancelled) {
        pendingCompletion.current = { assignmentId, studentId, audioPath: path,
          attemptNo: attemptNo.current ?? 1, itemOrders: rows.map(row => row.item_order) };
        await closeSavedSection();
      } else if (!cancelled) setCompletionBusy(false);

    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, audioPath, buildRow, closeSavedSection, done, persistRow, seconds, stopRecording, studentId, transcript]);

  const stimulus = run.stimuli[cursor.item];

  if (attemptLoadFailed) return (
    <div className="ac-section is-finishing"><main className="ac-section-field"><div className="ac-section-paper">
      <p role="alert">Could not load your section history. Recording has not started.</p>
      <button type="button" className="ac-section-exit" onClick={() => {
        setAttemptLoadFailed(false); setAttemptLoadCycle(cycle => cycle + 1);
      }}>Retry loading</button>
      {onExit && <button type="button" className="ac-section-exit" onClick={onExit}>Back to the Activity Centre</button>}
    </div></main></div>
  );

  if (!attemptReady) return (
    <div className="ac-section is-finishing"><main className="ac-section-field"><div className="ac-section-paper">
      <p role="status">Loading your section history. Recording has not started.</p>
      {onExit && <button type="button" className="ac-section-exit" onClick={onExit}>Back to the Activity Centre</button>}
    </div></main></div>
  );

  if (done) {
    /*
     * The handover, rather than a cut.
     *
     * The Report Card replaces this screen the moment the save finishes, and
     * the two surfaces could not be further apart: a cold indigo field against
     * a violet-cast white on a violet ground. `is-finishing` warms the field
     * and lifts the chrome over nine hundred milliseconds so the card arrives
     * on ground that is already the right colour, which means the colour the
     * report phase actually paints (`.rc-ground`) and not the Activity
     * Centre's cream. It is decoration and it is deliberately on the one frame
     * she is most likely to remember.
     */
    return (
      <div className="ac-section is-finishing">
        <main className="ac-section-field">
          <div className="ac-section-paper">
            <div className="ac-section-body">
              <p className="ac-section-finished">
                Section finished.
                <span>
                  {completionError
                    ? "Your section is kept for recovery. Your account has not confirmed all saved evidence and completion. Retry saving to open your Report Card."
                    : completionBusy
                      ? "Saving your recording and answers to your account."
                      : unsavedCount > 0 && uploadFailed
                    ? `${unsavedCount} ${unsavedCount === 1 ? "answer" : "answers"} did not reach us. Your recording did not reach us either, so both are still on this computer. Open this section again from the same browser and they will be sent, and then marked.`
                    : unsavedCount > 0 && recordingStored
                      ? `${unsavedCount} ${unsavedCount === 1 ? "answer" : "answers"} did not reach us, but the recording did. Open this section again from the same browser and they will be sent, and then marked.`
                      : unsavedCount > 0
                        ? `${unsavedCount} ${unsavedCount === 1 ? "answer" : "answers"} did not reach us, and there was no recording of this run to mark instead. Open this section again from the same browser and the answers will be sent.`
                        : uploadFailed
                          ? `${run.stimuli.length} stimuli, end to end. Your recording did not reach us, so it is still on this computer. Open this section again from the same browser and it will be sent, and then marked.`
                          : !recordingStored
                            ? `${run.stimuli.length} stimuli, end to end. Nothing was recorded of this run, so there is no audio to mark and none of it is on this computer either. Tell Joshua what happened and he can see what was saved.`
                            : `${run.stimuli.length} stimuli, end to end. Your Report Card comes next.`}
                </span>
              </p>
              {completionError && (
                <button type="button" className="ac-section-exit" disabled={completionBusy}
                  onClick={() => void closeSavedSection()}>
                  {completionBusy ? "Saving" : "Retry saving"}
                </button>
              )}
              {(completionError || unsavedCount > 0 || !recordingStored) && onExit && (
                <button type="button" className="ac-section-exit" onClick={onExit}>
                  Back to the Activity Centre
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <SectionStage
      stimulus={stimulus}
      phase={cursor.phase}
      stimulusNumber={cursor.item + 1}
      totalStimuli={run.stimuli.length}
      /*
       * A refused microphone is the loud fault and wins the line. A live one
       * that heard nothing through a whole Recall is the quiet one, and it is
       * the one that otherwise ends in a perfect-looking run and a card of
       * zeros.
       */
      error={
        // While the beat is held on a refusal, the panel is already saying it
        // in full. Repeating it in the footer is not emphasis, it is noise.
        countdown !== null && micRefused
          ? null
          : // A break is not a fault, and the dead-input line was measured
            // against a window she was not in the room for.
            paused
            ? null
            : (micError ??
            (deadInput
              ? "Nothing is reaching the microphone. Check it is not muted, then keep going."
              : null))
      }
      onExit={onExit ? askToExit : undefined}
      sectionName={run.sourceSection}
      /* What the elapsed figure is elapsed against. Her goal, not the standard
         one: an accommodation scales it, and pacing her against someone else's
         is worse than showing no goal at all. */
      goalSeconds={run.timeGoalMinutes[accommodation] * 60}
      elapsedSeconds={countdown === null ? elapsed : 0}
      /* "Recording" must not be on the rail while nothing is being written to
         the file. The paused mark takes its place. */
      recording={recording && !micRefused && !paused}
      paused={paused}
      /* No pausing before the section has started -- there is nothing to pause
         and nothing to lose -- and none once it is over. */
      onPause={countdown === null ? pauseRun : undefined}
      onResume={resumeRun}
      pauseError={pauseError}
      getStream={getStream}
      onDeadInput={setDeadInput}
      micRefused={micRefused}
      onRetryMic={startRecording}
      confirmingExit={confirmingExit}
      onConfirmExit={onExit}
      onCancelExit={() => setConfirmingExit(false)}
      countdown={countdown}
      /* The same act as the Space handler, for a device with no Space key. The
         stage decides whether to draw it; the runner only supplies the act. */
      onAdvance={press}
      /* First section only, first three stimuli only, and never in the loop. */
      coach={coachOn ? coachNote(cursor.item, cursor.phase) : null}
      onDismissCoach={() => setCoachOn(false)}
    />
  );
}
