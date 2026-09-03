import { useCallback, useRef, useState } from "react";

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
 * the whole of stimulus 14 -- is a seek, not a separate recording. Nothing is
 * ever paused, and nothing has to be found by ear afterwards.
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

  /**
   * Ask for the microphone and start. Resolves either way: a refused or missing
   * microphone must not stop the drill, because the drill is still valid run
   * against a handheld recorder. It only has to say so, since silence and a
   * dead input are indistinguishable from her side.
   */
  const start = useCallback(async () => {
    if (recorder.current) return;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    const blob = await finished;
    return { blob, mimeType, durationMs, segments: segments.current.slice() };
  }, [now]);

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

  return { start, mark, stop, error, recording, getStream, getMimeType };
}
