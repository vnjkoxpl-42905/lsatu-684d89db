import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { completeSectionRun, requestSectionGrading } from "../api/activitiesClient";
import { SectionStage } from "./SectionStage";
import { useSectionRecorder, type RecordingSegment } from "./useSectionRecorder";
import { sliceTranscript, useSectionTranscript } from "./useSectionTranscript";
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
 * no stopping.
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
}: {
  run: NonNullable<ReturnType<typeof buildSectionRun>>;
  assignmentId: string;
  studentId: string;
  accommodation: Accommodation;
  onComplete?: () => void;
  onExit?: () => void;
  now: () => number;
}) {
  const [cursor, setCursor] = useState<SectionCursor>(startCursor);
  const [done, setDone] = useState(false);
  const {
    start: startRecording,
    mark,
    stop: stopRecording,
    error: micError,
    getMimeType,
  } = useSectionRecorder(now);
  // Runs for the whole section, alongside the recording rather than instead of
  // it. The audio file stays the primary record.
  const { transcript } = useSectionTranscript(!done, now);
  /**
   * Guards the one write, and a ref rather than state on purpose.
   *
   * As state it re-entered its own effect: setting it fired the cleanup, which
   * cancelled the write's continuation, and the re-run then bailed on the flag
   * it had just set. The section saved but never finished, so she sat on the
   * last frame forever. A ref changes nothing about when the effect runs.
   */
  const saving = useRef(false);

  const startedAt = useRef(now());
  /** When the phase currently on screen began. Both phases are timed. */
  const phaseStartedAt = useRef(now());
  const stimulusStartedAt = useRef(now());
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
  /** Stimuli already handed to the database. Never sent twice. */
  const queued = useRef(0);

  const seconds = useCallback(
    (from: number) => Math.max(0, Math.round((now() - from) / 1000)),
    [now],
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
  useEffect(() => {
    if (done) return;
    const tick = setInterval(() => setElapsed(seconds(startedAt.current)), 1000);
    return () => clearInterval(tick);
  }, [done, seconds]);

  /*
   * Press record at the very beginning. Before the first chunk, not on the
   * first keypress: the drill's first act is reading, and a recording that
   * starts on the first Space has already missed it.
   */
  useEffect(() => {
    void startRecording();
    // Mount only. Restarting a recorder mid-section is the one thing the drill
    // forbids outright.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (done || saving.current) return;
    setCursor((at) => {
      const stimulus = run.stimuli[at.item];
      const spent = seconds(phaseStartedAt.current);
      phaseStartedAt.current = now();

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
        stimulusStartedAt.current = now();
      }

      const next = advanceCursor(run, at);
      if (!next) {
        setDone(true);
        return at;
      }
      return next;
    });
  }, [done, run, seconds, now, mark]);

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
      const path = audioPath();
      return {
        assignment_id: assignmentId,
        student_id: studentId,
        item_order: r.order,
        response_text: sliceTranscript(said, segments).join(" ").trim() || null,
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
          accommodation,
          goal_minutes: run.timeGoalMinutes[accommodation],
          audio_bucket: path ? RECORDING_BUCKET : null,
          audio_path: path,
          audio_duration_ms: null,
          audio_segments: segments,
          transcript_segments: sliceTranscript(said, segments),
          transcript_source: said.length > 0 ? "browser-speech" : null,
        },
      };
    },
    [accommodation, assignmentId, audioPath, run.sourceSection, run.timeGoalMinutes, studentId],
  );

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
      // A failed read must not stop the drill. Attempt 1 is the honest guess
      // when nothing is known, and a collision on it is caught by the unique
      // index rather than by overwriting anything.
      if (error) console.error("[rrc] could not read the attempt number", error);
      if (cancelled) return;
      attemptNo.current = (data?.[0]?.attempt_no ?? 0) + 1;
      setAttemptReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, studentId]);

  /**
   * Save every stimulus that has finished since the last time this ran.
   *
   * In an effect rather than in `press`, because React is allowed to run a
   * state updater twice and a network write must not be one of the things it
   * repeats. Fired and not awaited: the loop never waits on this, which was the
   * whole point of writing nothing at all before.
   *
   * A failed write is left alone on purpose. Every record stays in `records`,
   * and the backstop at the end re-sends the lot, so one dropped request costs
   * nothing. What this buys is the crash: twenty minutes of work that used to
   * live only in the tab now lands as it is made.
   */
  useEffect(() => {
    if (!attemptReady) return;
    if (records.current.length <= queued.current) return;
    const fresh = records.current.slice(queued.current);
    queued.current = records.current.length;
    const said = transcript();
    void (async () => {
      const { error } = await supabase
        .from("activity_item_responses")
        .upsert(fresh.map((r) => buildRow(r, said, null)) as ResponseInsert[], {
          onConflict: "assignment_id,student_id,item_order,attempt_no",
          // Never overwrite: a row already on record wins. She holds INSERT on
          // this table and deliberately not UPDATE, because what she said is
          // what she said (ADR 0019). This is an insert that declines to
          // collide, not an update in disguise.
          ignoreDuplicates: true,
        });
      if (error) console.error("[rrc] could not save a stimulus as it finished", error);
    })();
  }, [cursor, done, attemptReady, buildRow, transcript]);

  // One key, and only Space. Bound on the document because the loop must not
  // depend on anything holding focus: a stray click on the page would otherwise
  // silently stop her being able to advance.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "BUTTON" || target.tagName === "INPUT")) return;
      e.preventDefault();
      press();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [done, press]);

  /**
   * The end of the run: stop the recorder, upload, and re-send everything.
   *
   * The rows are already on record, stimulus by stimulus. What is left that
   * only the end knows is the audio file and the section's total length.
   */
  useEffect(() => {
    if (!done || saving.current) return;
    saving.current = true;
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
      if (finished && finished.blob.size > 0 && path) {
        const { error: upload } = await supabase.storage
          .from(RECORDING_BUCKET)
          .upload(path, finished.blob, { contentType: finished.mimeType, upsert: true });
        if (upload) console.error("[rrc] could not store the recording", upload);
      }

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

      if (rows.length > 0) {
        /*
         * The backstop, not the write.
         *
         * Every stimulus was already sent as it finished. This re-sends the
         * whole run so that anything the network dropped along the way still
         * lands, and duplicates are declined rather than treated as failures.
         * On a clean run it inserts nothing at all.
         */
        const { error } = await supabase
          .from("activity_item_responses")
          .upsert(rows as ResponseInsert[], {
            onConflict: "assignment_id,student_id,item_order,attempt_no",
            ignoreDuplicates: true,
          });
        // Logged rather than shown: she has finished the section, and a storage
        // failure is ours to fix, not a thing to hand her at the end of twenty
        // unbroken minutes.
        if (error) console.error("[rrc] could not record the section", error);
      }

      /*
       * Close the assignment.
       *
       * Deliberately after the rows and deliberately not conditional on them:
       * `status` is the Classroom's answer to "did she do the work", and she
       * did, whether or not our write of the evidence succeeded. Left out, an
       * RRC section stayed `in_progress` for ever -- every run ever done still
       * reads as unfinished -- because this branch never called the completion
       * the free-text path calls.
       *
       * Logged rather than thrown, like every other failure in this effect. She
       * has finished twenty unbroken minutes and a write we can retry is not a
       * thing to hand her at the end of them.
       */
      try {
        await completeSectionRun(assignmentId);
      } catch (err) {
        console.error("[rrc] could not close the assignment", err);
      }

      /*
       * Ask for the grade, and genuinely do not wait on it.
       *
       * This used to be awaited, which meant the ask's whole round trip stood
       * between her and the next screen -- and that round trip is the grading
       * job. On the trial run it was a 504 after two and a half minutes, spent
       * staring at "Section finished" with a Report Card screen already built
       * and polling for exactly this result on the other side of it.
       *
       * `void` is the fix and the intent: the Report Card polls, and the
       * sweeper re-drives anything this call missed, so the ask being slow or
       * lost costs nothing that is not already recovered.
       */
      void requestSectionGrading(assignmentId);

      if (!cancelled) onComplete?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, audioPath, buildRow, done, onComplete, seconds, stopRecording, transcript]);

  const stimulus = run.stimuli[cursor.item];

  if (done) {
    return (
      <div className="ac-section">
        <div className="ac-section-body">
          <p className="ac-section-instruction">Section finished</p>
          <div className="ac-section-stimulus">
            <span className="ac-section-chunk">
              {run.stimuli.length} stimuli, end to end. Your Report Card comes next.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SectionStage
      stimulus={stimulus}
      phase={cursor.phase}
      stimulusNumber={cursor.item + 1}
      totalStimuli={run.stimuli.length}
      error={micError}
      onExit={onExit}
      elapsedSeconds={elapsed}
      goalMinutes={run.timeGoalMinutes[accommodation]}
    />
  );
}
