import { useCallback, useEffect, useRef } from "react";

/**
 * What she actually said, word for word, for the whole section.
 *
 * Verbatim is the requirement, not a summary and not a cleaned-up version. The
 * transcript is what her Read gets checked against, so anything that rewrites
 * her on the way through would be marking a paraphrase of her answer rather
 * than her answer.
 *
 * Recognition runs continuously for the entire section and every final result
 * is kept with the time it arrived. Nothing is cut here: slicing the transcript
 * into "the recall of line 3 of stimulus 14" is done afterwards, against the
 * same segment boundaries the recording index uses, so the audio and the text
 * are cut at exactly the same places by exactly the same numbers.
 *
 * This is a best-effort second channel and never the primary record. The audio
 * file is the primary record, and it is the one a proper transcription runs
 * against later. Browser recognition is not available everywhere, it degrades
 * on a bad connection, and it must never be able to stall the loop, so nothing
 * here is awaited and a failure is silent to her.
 */

export interface TranscriptPiece {
  /** Milliseconds from the start of the section. */
  atMs: number;
  text: string;
}

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSectionTranscript(
  enabled: boolean,
  now: () => number = () => Date.now(),
  /**
   * The instant the RECORDING begins, which is the zero every piece is measured
   * from. Null until the microphone answers.
   *
   * Without it this hook measured from its own mount instead, and the two zero
   * points are not the same instant: recognition starts on mount and the
   * recorder starts when `getUserMedia` resolves, which on a first run is a
   * permission prompt she has to answer. Every piece was then stamped that much
   * too late and filed one segment further on than the one she spoke it in --
   * the exact failure the slicing below was rewritten to fix, arriving by the
   * other door. Words heard before the file exists are dropped rather than
   * guessed at: they are not in the recording, so there is no stretch of it they
   * could belong to.
   *
   * Omit it and the hook falls back to its own mount, which is right for a
   * caller that has no recording to line up against.
   */
  zeroAt?: () => number | null,
) {
  const pieces = useRef<TranscriptPiece[]>([]);
  /**
   * When each result in the current session was FIRST heard.
   *
   * The engine settles a result some time after the words were said, and that
   * lag is the whole reason the transcript used to be filed against the wrong
   * stimulus. It also emits interim guesses for the same result as she speaks,
   * and the first of those arrives while she is still saying it. So the arrival
   * of the first interim is the timestamp, and the final text is the text. That
   * is a measurement of when she spoke rather than an assumption about how long
   * the engine takes.
   *
   * Keyed by result index and cleared whenever a session restarts, because the
   * indices start again with it.
   */
  const heardAt = useRef<Map<number, number>>(new Map());
  const startedAt = useRef<number | null>(null);
  const running = useRef(false);
  /*
   * `now` is usually an inline arrow from the caller, so its identity changes
   * on every render. Held in a ref, the recognition session survives the whole
   * section instead of being aborted and restarted at every phase boundary —
   * which used to reset the offsets each piece is timed against.
   */
  const nowRef = useRef(now);
  nowRef.current = now;
  const zeroRef = useRef(zeroAt);
  zeroRef.current = zeroAt;

  useEffect(() => {
    if (!enabled) return;
    const Ctor = recognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    // Interim results are asked for but never stored. They make the engine emit
    // as it goes, which keeps the timestamps close to when she actually spoke;
    // only `isFinal` results are kept, because an interim is a guess that the
    // engine itself is about to revise.
    rec.interimResults = true;
    /*
     * Set once, on the first session only. A session that ends on silence is
     * restarted below, and re-zeroing here would restart the offsets with it --
     * so every piece after the first silence would be timed from the middle of
     * the run and filed against a segment near the start of it.
     */
    if (startedAt.current === null) startedAt.current = nowRef.current();
    /*
     * A new session numbers its results from zero again, so anything the last
     * session left here would be read as this session's timings.
     */
    heardAt.current.clear();
    running.current = true;

    rec.onresult = (e) => {
      // The recording's zero when there is one, this hook's own otherwise.
      // Null means the file has not started; those words are not in it.
      const zero = zeroRef.current ? zeroRef.current() : (startedAt.current ?? 0);
      if (zero === null) return;
      const at = nowRef.current() - zero;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        // First sighting of this result, interim or final: this is when she
        // started saying it. Recorded before the isFinal check, because for a
        // result that arrives already final it is still the closest reading
        // available.
        if (!heardAt.current.has(i)) heardAt.current.set(i, at);
        if (!result.isFinal) continue;
        const text = result[0].transcript.trim();
        if (!text) continue;
        pieces.current.push({ atMs: heardAt.current.get(i) ?? at, text });
      }
    };
    /*
     * Engines end a session on their own after a stretch of silence, even with
     * `continuous` set, and she is silent for every read in the section. So a
     * finished session is restarted rather than treated as the end, or the
     * transcript would stop somewhere in the first stimulus.
     */
    rec.onend = () => {
      if (!running.current) return;
      // A new session numbers its results from zero again, so last session's
      // times must not be read as this session's.
      heardAt.current.clear();
      try {
        rec.start();
      } catch {
        // Already starting. The next `onend` will get it.
      }
    };
    rec.onerror = () => {
      // Nothing surfaced to her. The audio file is the real record, and an
      // error banner about a second channel in the middle of a twenty minute
      // take is worse than the missing text.
    };

    try {
      rec.start();
    } catch {
      running.current = false;
      return;
    }

    return () => {
      running.current = false;
      rec.onend = null;
      rec.onresult = null;
      rec.abort();
    };
  }, [enabled]);

  /** Everything said, in order, with offsets from the start of the section. */
  const transcript = useCallback(() => pieces.current.slice(), []);

  return { transcript };
}

/**
 * Cut the transcript at the recording's own segment boundaries.
 *
 * Every piece lands in exactly one segment. That is the whole contract, and it
 * used to be broken in the one way that is invisible: each stimulus was sliced
 * against its OWN segments in isolation, so a piece falling between two
 * stimuli could be claimed by both, or by the wrong one, with nothing to
 * notice. On the trial run 21 rows in 22 stored the previous stimulus's words,
 * and the card for the speed-limit stimulus read back an argument about a
 * manufacturing director.
 *
 * Two changes fix it. The pieces are now stamped with when she STARTED saying
 * them rather than when the engine settled them, which is the actual cause; and
 * the boundaries are treated as what they are, a partition of the run, so the
 * segment a piece falls in is decided once against the whole timeline instead
 * of separately per stimulus. `graceMs` survives as a small bias for a piece
 * that lands right on a boundary: her words are far likelier to be the tail of
 * the turn that just ended than the head of one she has not started.
 *
 * `all` is the full ordered timeline when the caller has it. Without it this
 * falls back to the old per-stimulus behaviour, which is right for a caller
 * that genuinely only holds one stimulus's windows.
 *
 * None of this text is graded (ADR 0017). It is the diagnostic channel and the
 * only text that exists if the upload fails, which is exactly when a
 * mis-filed transcript would be the only thing anyone had to go on.
 */
export function sliceTranscript(
  pieces: TranscriptPiece[],
  segments: { startMs: number; endMs: number }[],
  all?: { startMs: number; endMs: number }[],
  graceMs = 300,
): string[] {
  const timeline = all && all.length ? [...all].sort((a, b) => a.startMs - b.startMs) : segments;
  const out = segments.map(() => [] as string[]);
  // No windows means nothing can be filed anywhere -- a stimulus recorded
  // before the microphone opened. Blank rows are the right answer; a throw here
  // would take the whole section's save down with it.
  if (timeline.length === 0) return out.map(() => "");

  for (const piece of pieces) {
    // Anything said before the first window opened is not part of the run.
    if (piece.atMs < timeline[0].startMs) continue;
    /*
     * The last window that had opened by the time she started speaking. A piece
     * sitting a hair past a boundary belongs to the turn that just closed --
     * which is what the bias buys, and why it is clamped to the start of the
     * run rather than allowed to reach behind it and lose her first words.
     */
    const at = Math.max(timeline[0].startMs, piece.atMs - graceMs);
    let chosen: { startMs: number; endMs: number } | null = null;
    for (const seg of timeline) {
      if (seg.startMs > at) break;
      chosen = seg;
    }
    if (!chosen) continue;
    // Past the end of the last window is past the end of the run.
    if (at >= chosen.endMs && chosen === timeline[timeline.length - 1]) continue;
    const i = segments.indexOf(chosen);
    if (i >= 0) out[i].push(piece.text);
  }
  return out.map((texts) => texts.join(" ").trim());
}
