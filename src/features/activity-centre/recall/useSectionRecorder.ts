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

/** Which portion of which stimulus a stretch of the file belongs to. */
export interface SegmentBody {
  /** The stimulus this belongs to, by its content slug. */
  slug: string;
  /** 1-based position of that stimulus in the section. */
  order: number;
  /** Which portion: silent read, the recall-and-colour, or The Read. */
  phase: "read" | "speak" | "the-read";
  /** Which chunk, or null for The Read, which is the whole stimulus. */
  chunk: number | null;
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
  [key: string]: string | number | null;
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

export function useSectionRecorder(now: () => number = () => Date.now()) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
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
    (segment: SegmentBody) => {
      if (startedAt.current === null) return;
      const at = now() - startedAt.current;
      segments.current.push({ ...segment, startMs: openAt.current, endMs: at });
      openAt.current = at;
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

  return { start, mark, stop, error, recording, getStream };
}
