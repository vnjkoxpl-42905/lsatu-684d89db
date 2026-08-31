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

export function useSectionTranscript(enabled: boolean, now: () => number = () => Date.now()) {
  const pieces = useRef<TranscriptPiece[]>([]);
  const startedAt = useRef<number | null>(null);
  const running = useRef(false);

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
    startedAt.current = now();
    running.current = true;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result.isFinal) continue;
        const text = result[0].transcript.trim();
        if (!text) continue;
        pieces.current.push({ atMs: now() - (startedAt.current ?? 0), text });
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
  }, [enabled, now]);

  /** Everything said, in order, with offsets from the start of the section. */
  const transcript = useCallback(() => pieces.current.slice(), []);

  return { transcript };
}

/**
 * Cut the transcript at the recording's own segment boundaries.
 *
 * Every piece lands in exactly one segment. That is the whole contract: a piece
 * counted twice would show her colour repeated inside the silent read next to
 * it, and a scorer reading that would mark a read she never spoke during.
 *
 * Recognition settles a final result slightly after the words were spoken, so a
 * piece can land just past the end of the turn it belongs to. `graceMs` biases
 * those back into the earlier segment, which is the right way to be wrong here:
 * her words are far more likely to be the tail of the turn that just ended than
 * the head of one she has not started.
 */
export function sliceTranscript(
  pieces: TranscriptPiece[],
  segments: { startMs: number; endMs: number }[],
  graceMs = 1200,
): string[] {
  const out = segments.map(() => [] as string[]);
  for (const piece of pieces) {
    const i = segments.findIndex(
      (seg) => piece.atMs >= seg.startMs && piece.atMs < seg.endMs + graceMs,
    );
    if (i >= 0) out[i].push(piece.text);
  }
  return out.map((texts) => texts.join(" ").trim());
}
