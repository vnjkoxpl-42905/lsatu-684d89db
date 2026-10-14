import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The section's recording: one unbroken file, plus an index of what is where.
 *
 * The drill's own rule, from `corpus/loophole-online/drills/translation-plus-clir-drill.md`:
 * press record at the very beginning and do not end the recording until the
 * whole drill is finished, never pausing or stopping between steps or stimuli.
 * So this records once, continuously, and stops once.
 *
 * That rule and "organise the recording per portion of each question" only look
 * like they conflict. They are reconciled by an index rather than by cutting:
 * every phase boundary the runner passes is stamped as an offset from the start
 * of the file, so any portion -- a single chunk's recall, one stimulus's Read,
 * the whole of stimulus 14 -- is a seek, not a separate recording. Nothing has
 * to be found by ear afterwards.
 *
 * There is exactly one break in that rule and it is the student's, not the
 * drill's: `pause` and `resume`. The rule above forbids stopping BETWEEN STEPS
 * -- pausing to think, to check a word, to compose herself before The Recall --
 * because a drill practised in pieces is not the drill. It was never a rule that
 * a twenty-five minute sitting may not be interrupted by a life, and enforced as
 * one it produced the only outcome worse than a paused take: a student who has
 * to leave, cannot, and throws away twenty-five minutes of work by walking away
 * from it. The recorder is paused rather than stopped, so it is still one file
 * and still one index. What the pause must never do is desynchronise the two,
 * which is why it is the RUNNER's clock that stops with it: every offset in this
 * file is measured with the `now` the runner injects, and a paused run's `now`
 * does not advance (`SectionRunner.tsx`). The break is therefore absent from the
 * audio and absent from the timeline by the same arithmetic, and how long she
 * was away is recorded on the run as its own number rather than hidden inside
 * her time.
 *
 * What this does NOT do is transcribe. Transcription happens off the machine
 * the drill is running on, against the finished file, so a slow or failed model
 * call can never touch a twenty-minute unbroken take.
 */

/**
 * Which portion of which stimulus a stretch of the file belongs to.
 *
 * Stimulus-grained: `working` is her time with the text up, `recalling` is The
 * Recall. There is no chunk field, because the app does not track which chunk
 * she is on (`docs/adr/0013-she-chunks-freely-and-the-app-does-not-track-it.md`);
 * what she covered inside a stretch is worked out from the audio afterwards.
 */
export interface SegmentBody {
  /** The stimulus this belongs to, by its content slug. */
  slug: string;
  /** 1-based position of that stimulus in the section. */
  order: number;
  phase: "working" | "recalling";
}

/** One stretch of the file, in ms from the start of the recording. */
export interface RecordingSegment extends SegmentBody {
  startMs: number;
  endMs: number;
  /**
   * A segment is stored verbatim inside `activity_item_responses.rrc`, which is
   * a `jsonb` column typed as `Json`. The index signature is what lets this
   * interface satisfy that type without a cast at the insert, so the shape is
   * checked rather than asserted. It sits here and not on `SegmentBody` because
   * `Omit` over an index signature erases the named members with it.
   */
  [key: string]: string | number;
}

export interface FinishedRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  segments: RecordingSegment[];
}

/**
 * Pick a container the browser will actually produce. Safari has no webm/opus,
 * so asking for it there yields a recorder that starts and emits nothing, which
 * is the worst failure available: it looks like it worked.
 */
function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  const supported = (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  if (!supported?.isTypeSupported) return undefined;
  return candidates.find((t) => supported.isTypeSupported(t));
}

/**
 * What the microphone is asked for, and what it is asked NOT to do.
 *
 * `{ audio: true }` takes Chrome's defaults, which are tuned for a phone call:
 * automatic gain, noise suppression and echo cancellation, all on. Measured on
 * a live 21-minute run, all three were active. For a call that is right. For
 * this it is not, and in three separate ways.
 *
 * The take is twenty-odd minutes with long SILENT reads inside it, so automatic
 * gain spends those reads winding the input up and then pumps room noise into
 * the gap before she speaks again. Noise suppression is a speech/not-speech
 * judgement made by the browser, ahead of ours, and the quiet end of her
 * delivery -- a trailed-off clause, an aside, the half-swallowed word -- is
 * exactly what it is most likely to decide is not speech. And what comes off
 * this file is not listened to, it is transcribed and then graded Detail by
 * Detail: a word the browser removed is a Detail she is marked as having
 * dropped.
 *
 * So they are asked for explicitly, and off. Mono because the source is one
 * voice and a second channel is bytes against a bucket cap, not information.
 *
 * The constraints are not `exact`. A device that cannot honour one of them
 * should still record the section: a run with automatic gain is worse than a
 * run without it and far better than no run. Nothing here can fail the drill.
 */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  autoGainControl: false,
  noiseSuppression: false,
  echoCancellation: false,
  channelCount: 1,
};

/**
 * Open the microphone, preferring the untreated stream and accepting the
 * treated one.
 *
 * Older browsers reject an unknown constraint key outright rather than ignoring
 * it, so a single request would turn "cannot switch off noise suppression" into
 * "no microphone" -- trading a slightly worse recording for none at all. The
 * retry is what stops a preference from ever becoming a requirement.
 */
async function openMicrophone(): Promise<MediaStream> {
  // No microphone API at all -- an insecure origin, or a browser without it.
  // That is the refused-microphone case, not a constraint the device would not
  // take, and retrying it would only produce the same TypeError twice.
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("no microphone on this device");
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
  } catch (e) {
    // A refusal is not a constraint failure and must not be retried into a
    // second permission prompt.
    const name = (e as DOMException)?.name;
    if (name === "NotAllowedError" || name === "SecurityError") throw e;
    console.warn("[rrc] microphone would not take the drill's constraints; using its defaults", e);
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

/**
 * How often the backup recorder hands over a piece.
 *
 * The most that can ever be lost to a crash. Ten seconds is short enough that
 * nothing meaningful goes missing and long enough that a twenty-minute section
 * costs about 130 small writes to her own disk, which is nothing.
 */
const BACKUP_SLICE_MS = 10_000;

export function useSectionRecorder(
  now: () => number = () => Date.now(),
  /**
   * Called with each piece of the parallel backup copy, in order.
   *
   * Optional, and the drill runs identically without it. The recorder does not
   * know or care where the pieces go; keeping the storage decision outside this
   * hook is what lets the backup be swapped or switched off without touching
   * the thing that produces the real recording.
   */
  onBackupChunk?: (blob: Blob, seq: number) => void,
) {
  const recorder = useRef<MediaRecorder | null>(null);
  const backup = useRef<MediaRecorder | null>(null);
  const backupSeq = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  /** Kept in a ref so the callback can change without restarting a recorder. */
  const onChunk = useRef(onBackupChunk);
  onChunk.current = onBackupChunk;
  const parts = useRef<Blob[]>([]);
  const startedAt = useRef<number | null>(null);
  const segments = useRef<RecordingSegment[]>([]);
  const openAt = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);

  /**
   * Ask for the microphone and start. Resolves either way, and reports the
   * refusal rather than throwing it.
   *
   * This used to say that a refused microphone must not stop the drill, because
   * the sitting is still valid against a handheld recorder. It is not: the
   * grader refuses a run with no recording, and no handheld file has any way to
   * reach the assignment. The runner now treats a reported refusal as a gate on
   * the ready beat (ADR 0029), so what this returns decides whether a section
   * begins at all.
   *
   * Safe to call again after a failure, and only after one: nothing has been
   * opened, so there is no recorder to restart.
   */
  const start = useCallback(async () => {
    if (recorder.current) return;
    try {
      const media = await openMicrophone();
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      parts.current = [];
      segments.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) parts.current.push(e.data);
      };
      rec.start();

      /*
       * The second recorder, on the same microphone.
       *
       * `rec` above is the real recording and is deliberately left alone: asked
       * for pieces as it goes, it can no longer write its own duration and the
       * file stops being seekable, which is what Clips are cut with. This one
       * exists only so a crash does not cost twenty minutes, and a recovered
       * copy only has to be good enough to grade.
       *
       * Its failure is swallowed whole. A browser that will not run two
       * recorders at once still runs the drill.
       */
      if (onChunk.current) {
        try {
          const copy = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
          backupSeq.current = 0;
          copy.ondataavailable = (e) => {
            if (e.data.size > 0) onChunk.current?.(e.data, backupSeq.current++);
          };
          copy.start(BACKUP_SLICE_MS);
          backup.current = copy;
        } catch (e) {
          console.error("[rrc] no local backup copy for this run", e);
        }
      }

      stream.current = media;
      recorder.current = rec;
      startedAt.current = now();
      openAt.current = 0;
      setRecording(true);
      setError(null);
    } catch {
      // The name of the fault is not useful to her; the consequence is.
      setError("No microphone. The drill still runs, but nothing is being recorded.");
    }
  }, [now]);

  /**
   * Close the portion that just ended. Called on every phase boundary, from
   * inside the loop -- which is safe because it touches refs and no network.
   */
  const mark = useCallback(
    (segment: SegmentBody): RecordingSegment | null => {
      if (startedAt.current === null) return null;
      const at = now() - startedAt.current;
      const closed: RecordingSegment = { ...segment, startMs: openAt.current, endMs: at };
      segments.current.push(closed);
      openAt.current = at;
      // Handed back as well as kept, so a caller saving one stimulus as it
      // finishes can carry that stimulus's own portions with it. Without this
      // the index is only readable at `stop`, which is the one moment a crash
      // means it never arrives.
      return closed;
    },
    [now],
  );

  /**
   * Hold the file open and stop writing to it.
   *
   * `pause` is not `stop`: the recorder keeps its parts, its mime type and its
   * identity, so what resumes is the same take rather than a second one. That
   * distinction is the whole reason this is allowed at all -- the drill forbids
   * a second recording, not a gap in the first.
   *
   * It answers whether it actually paused, and the runner treats a false as a
   * refusal to pause rather than as a pause that failed quietly. A recorder that
   * kept running while the runner's clock stopped would put minutes of a break
   * inside the file and nowhere in the index, and every segment boundary after
   * it would name the wrong stretch of audio. Silence about that is worse than
   * telling her this browser will not do it.
   *
   * The backup copy is paused too, and its failure is swallowed like every other
   * failure of the backup copy: a recovered file with a break the index does not
   * know about is still a file worth having.
   */
  const pause = useCallback((): boolean => {
    const rec = recorder.current;
    if (!rec || rec.state !== "recording") return false;
    try {
      rec.pause();
    } catch {
      return false;
    }
    /*
     * Asked for, and then checked. A browser is allowed to implement `pause`
     * as a no-op, and a no-op here is the misalignment this returns false to
     * prevent.
     *
     * Read into a widened local because TypeScript narrowed `rec.state` to
     * "recording" at the guard above and does not model `pause()` as changing
     * it, so the comparison it needs to see is the one it calls impossible.
     */
    const afterPause: string = rec.state;
    if (afterPause !== "paused") return false;
    try {
      if (backup.current?.state === "recording") backup.current.pause();
    } catch {
      // The backup is best effort and always has been.
    }
    setPaused(true);
    return true;
  }, []);

  /** Start writing to the same file again. Answers whether it did. */
  const resume = useCallback((): boolean => {
    const rec = recorder.current;
    if (!rec || rec.state !== "paused") return false;
    try {
      rec.resume();
    } catch {
      return false;
    }
    // Widened for the same reason as `afterPause` above.
    const afterResume: string = rec.state;
    if (afterResume !== "recording") return false;
    try {
      if (backup.current?.state === "paused") backup.current.resume();
    } catch {
      // As above.
    }
    setPaused(false);
    return true;
  }, []);

  /** Stop once, at the end, and hand back the file with its index. */
  const stop = useCallback(async (): Promise<FinishedRecording | null> => {
    const rec = recorder.current;
    if (!rec || startedAt.current === null) return null;
    const durationMs = now() - startedAt.current;
    const mimeType = rec.mimeType || "audio/webm";
    const finished = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(parts.current, { type: mimeType }));
    });
    rec.stop();
    // Stopped before the tracks are, so its last piece is emitted rather than
    // cut off with the microphone.
    try {
      backup.current?.stop();
    } catch {
      // Already stopped, or never started. Neither is worth reporting.
    }
    backup.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    recorder.current = null;
    stream.current = null;
    setRecording(false);
    setPaused(false);
    const blob = await finished;
    return { blob, mimeType, durationMs, segments: segments.current.slice() };
  }, [now]);

  /**
   * A recorder does not outlive the component that started it.
   *
   * `stop` is the run's own ending and the only place this used to close the
   * microphone. A section she LEFT -- the exit button, a route change, any
   * unmount before `done` -- left both recorders running with the microphone
   * open, invisible, for as long as the tab lived. On 2026-09-07 one such
   * orphan ran for two hours: through the student's real sitting of the same
   * section and past its end, feeding its backup the whole time. When the tab
   * finally reloaded, the recovery pass took that orphan's 116-minute file for
   * a crashed run and uploaded it over the 66-minute recording the real run
   * had stored, and the grader refused the section for a clock that sat 37
   * minutes off.
   *
   * So the tracks close with the hook. Nothing is handed back: whatever this
   * recorder held belongs to a run that is, by the drill's own rule, thrown
   * away (ADR 0023). A run that ended properly has already been through `stop`
   * and there is nothing here left to close.
   */
  useEffect(
    () => () => {
      for (const rec of [recorder.current, backup.current]) {
        try {
          if (rec && rec.state !== "inactive") rec.stop();
        } catch {
          // Already stopped. Nothing to close twice.
        }
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      backup.current = null;
      stream.current = null;
    },
    [],
  );

  /**
   * The live input, for anything that needs to listen rather than store.
   *
   * A getter rather than state: the voice detector reads it inside an animation
   * frame loop, and re-rendering the whole runner when the microphone opens
   * would be a render in the middle of her first read.
   */
  const getStream = useCallback(() => stream.current, []);

  /**
   * The container the recorder settled on, readable from the first stimulus.
   *
   * The file name depends on it, and a row written before the section ends has
   * to name the file it will belong to. Falls back to the type the picker would
   * have chosen, so this answers even before the microphone opens.
   */
  const getMimeType = useCallback(
    () => recorder.current?.mimeType || pickMimeType() || "audio/webm",
    [],
  );

  /**
   * The instant the file begins, or null before the microphone opens.
   *
   * Every segment in the index is an offset from this, and the transcript is
   * cut against those segments -- so anything stamping the transcript has to
   * measure from the same instant or the two channels disagree by however long
   * the microphone took to answer. Recognition starts at mount and the recorder
   * starts when `getUserMedia` resolves, which on a first run is a permission
   * prompt: several seconds of skew, silently shifting every piece of her
   * transcript into a later segment than the one she said it in.
   */
  const getStartedAt = useCallback(() => startedAt.current, []);

  return { start, pause, resume, mark, stop, error, recording, paused, getStream, getMimeType, getStartedAt };
}
