import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SectionStage } from "./SectionStage";
import { useSectionRecorder, type RecordingSegment } from "./useSectionRecorder";
import { useVoiceActivity } from "./useVoiceActivity";
import { sliceTranscript, useSectionTranscript } from "./useSectionTranscript";
import {
  advanceCursor,
  buildSectionRun,
  chunkStates,
  chunksDone,
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
 * - **No network call in the loop.** A dropped connection must not be able to
 *   stall her mid-section. So every row is buffered in a ref and written once,
 *   after the last stimulus. That also means a run abandoned halfway writes
 *   nothing, which is correct: a section is the unit of work, and half a
 *   section is not a partial score, it is not a run.
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

/** What one stimulus's run looked like, written once the section is over. */
interface StimulusRecord {
  slug: string;
  order: number;
  /** Seconds from the section's start to the end of this stimulus. */
  finishedAtSeconds: number;
  /** Seconds spent on this stimulus alone. */
  elapsedSeconds: number;
  /** Per chunk, in order: seconds reading it, then seconds speaking it back. */
  chunkSeconds: { n: number; read: number; speak: number }[];
  /** Seconds spent giving The Read. */
  theReadSeconds: number;
}

export function SectionRunner({
  assignmentId,
  studentId,
  items,
  sourceSection,
  timeGoalMinutes,
  accommodation = "standard",
  onComplete,
  onExit,
  now = () => Date.now(),
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
    getStream,
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
  /** When the phase currently on screen began. Every phase is timed. */
  const phaseStartedAt = useRef(now());
  const stimulusStartedAt = useRef(now());
  const records = useRef<StimulusRecord[]>([]);
  const chunkTimes = useRef<{ n: number; read: number; speak: number }[]>([]);

  const seconds = useCallback(
    (from: number) => Math.max(0, Math.round((now() - from) / 1000)),
    [now],
  );

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
   * One key press. This is the whole interaction: no mouse in the loop.
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
      // nothing here reaches the network, so the loop cannot stall on it.
      mark({
        slug: stimulus.slug,
        order: stimulus.order,
        phase: at.phase,
        chunk: at.phase === "the-read" ? null : stimulus.chunks[at.chunk].n,
      });

      if (at.phase === "read") {
        chunkTimes.current[at.chunk] = {
          n: stimulus.chunks[at.chunk].n,
          read: spent,
          speak: 0,
        };
      } else if (at.phase === "speak") {
        const entry = chunkTimes.current[at.chunk];
        if (entry) entry.speak = spent;
      } else {
        // The Read is over, so this stimulus is finished. Its record is
        // buffered, not written: no network call inside the loop.
        records.current.push({
          slug: stimulus.slug,
          order: stimulus.order,
          finishedAtSeconds: seconds(startedAt.current),
          elapsedSeconds: seconds(stimulusStartedAt.current),
          chunkSeconds: chunkTimes.current.slice(),
          theReadSeconds: spent,
        });
        chunkTimes.current = [];
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

  /*
   * The section moves on when she stops talking.
   *
   * Every hand this drill asks of her is a hand not on the page, and she is
   * running 23 stimuli back to back. So space is only ever needed to say "I
   * have finished reading, I am about to speak"; the end of the turn announces
   * itself. Space still advances, always, because a detector that mishears once
   * must never be able to strand her mid-section.
   *
   * Armed only while she is meant to be speaking. During a silent read there is
   * nothing to hear, and a detector listening then would take the first cough
   * or chair creak as a whole turn.
   */
  const speaking = !done && (cursor.phase === "speak" || cursor.phase === "the-read");
  useVoiceActivity({
    armed: speaking,
    // Re-armed per stimulus, chunk and phase. Two consecutive recalls are both
    // spoken turns, so `armed` never drops between them; without this key the
    // detector would fire once at the top of the section and then sit silent
    // for the other 80 chunks.
    turn: `${cursor.item}:${cursor.chunk}:${cursor.phase}`,
    getStream,
    onEnded: press,
  });

  /** The one write, after the last stimulus. */
  useEffect(() => {
    if (!done || saving.current) return;
    saving.current = true;
    let cancelled = false;
    void (async () => {
      const total = seconds(startedAt.current);

      /*
       * Stop the recorder and put the file away first, so every row can name
       * where its audio is. The upload is one request for the whole section and
       * it happens here, after the last stimulus, never inside the loop.
       *
       * A failed upload does not fail the section. Her twenty minutes are done
       * and the timings are still worth keeping, so the rows are written either
       * way and the audio path is simply absent -- which reads as "not
       * captured", the truth, rather than as silence.
       */
      const finished = await stopRecording();
      let audioPath: string | null = null;
      if (finished && finished.blob.size > 0) {
        const ext = finished.mimeType.includes("mp4") ? "m4a" : "webm";
        const path = `${studentId}/${assignmentId}.${ext}`;
        const { error: upload } = await supabase.storage
          .from(RECORDING_BUCKET)
          .upload(path, finished.blob, { contentType: finished.mimeType, upsert: true });
        if (upload) console.error("[rrc] could not store the recording", upload);
        else audioPath = path;
      }

      // The index, split per stimulus, so a row carries only its own portions.
      const byOrder = new Map<number, RecordingSegment[]>();
      for (const seg of finished?.segments ?? []) {
        const list = byOrder.get(seg.order) ?? [];
        list.push(seg);
        byOrder.set(seg.order, list);
      }

      /*
       * Her words, cut at the same boundaries as the audio.
       *
       * Both channels are stamped in milliseconds from the same start, so the
       * text for one portion and the audio for that portion are the same slice
       * of the same run rather than two things lined up by hand afterwards.
       */
      const said = transcript();

      const spokenFor = (order: number) =>
        sliceTranscript(said, byOrder.get(order) ?? []).join(" ").trim();

      const rows: (ResponseInsert & { rrc: unknown })[] = records.current.map((r) => ({
        assignment_id: assignmentId,
        student_id: studentId,
        item_order: r.order,
        /*
         * Everything she said during this stimulus, verbatim and in order.
         *
         * Null rather than an empty string when nothing came back, because a
         * browser without recognition and a student who said nothing are
         * different facts and only one of them is about her.
         */
        response_text: spokenFor(r.order) || null,
        attempt_no: 1,
        rrc: {
          mode: "section",
          source_section: run.sourceSection,
          slug: r.slug,
          finished_at_seconds: r.finishedAtSeconds,
          elapsed_seconds: r.elapsedSeconds,
          chunk_seconds: r.chunkSeconds,
          the_read_seconds: r.theReadSeconds,
          section_total_seconds: total,
          accommodation,
          goal_minutes: run.timeGoalMinutes[accommodation],
          audio_bucket: audioPath ? RECORDING_BUCKET : null,
          audio_path: audioPath,
          audio_duration_ms: finished?.durationMs ?? null,
          // Where this stimulus's portions sit in that one file, in ms.
          audio_segments: byOrder.get(r.order) ?? [],
          /*
           * The same portions as text, one entry per segment, in the same
           * order. This is a best-effort browser transcript: the audio is the
           * record a proper transcription runs against later, and the scorer
           * must treat a blank here as "not captured", never as silence.
           */
          transcript_segments: sliceTranscript(said, byOrder.get(r.order) ?? []),
          transcript_source: said.length > 0 ? "browser-speech" : null,
        },
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("activity_item_responses")
          .insert(rows as ResponseInsert[]);
        // Logged rather than shown: she has finished the section, and a storage
        // failure is ours to fix, not a thing to hand her at the end of twenty
        // unbroken minutes.
        if (error) console.error("[rrc] could not record the section", error);
      }
      if (!cancelled) onComplete?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [accommodation, assignmentId, done, onComplete, run, seconds, studentId, stopRecording, transcript]);

  const stimulus = run.stimuli[cursor.item];
  const states = chunkStates(run, cursor);

  if (done) {
    return (
      <div className="ac-section">
        <div className="ac-section-body">
          <p className="ac-section-instruction">Section finished</p>
          <div className="ac-section-stimulus">
            <span className="ac-section-chunk is-done">
              {chunksDone(run, cursor)} chunks, {run.stimuli.length} stimuli. Your scorecard comes
              next.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SectionStage
      stimulus={stimulus}
      states={states}
      phase={cursor.phase}
      stimulusNumber={cursor.item + 1}
      totalStimuli={run.stimuli.length}
      error={micError}
      onExit={onExit}
    />
  );
}
