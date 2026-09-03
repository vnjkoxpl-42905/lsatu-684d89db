import { useEffect, useRef } from "react";
import type { SectionPhase } from "./section";

/**
 * One quiet element that moves with her voice, and the only evidence on screen
 * that the microphone is alive.
 *
 * For twenty-one minutes she talks into a blank card. The recorder already
 * reports a REFUSED microphone, but it cannot see a live-but-silent one -- a
 * muted input, a device the OS switched underneath her, a headset that dropped
 * off. That failure produces a perfect-looking run, a clean upload, and a
 * Report Card of zeros, and she finds out at the end of the twenty-one minutes.
 *
 * So this does two jobs with one reading.
 *
 * **Presence.** A bar that answers "is anything reaching it" without answering
 * "how am I doing". Deliberately not a level meter with a target: nothing here
 * may look like a score, because nothing is judged until the section ends.
 *
 * **The fault.** If a whole Recall passes with the input never leaving the noise
 * floor, that is said out loud once, at the boundary, while there is still a
 * section left to save.
 *
 * Nothing here re-renders the runner. The bar is written to as a DOM node
 * inside an animation frame, because a component that set state at 60Hz would
 * be re-rendering the drill room underneath her while she reads.
 */

/**
 * The line between "an open microphone in a quiet room" and "nothing arriving".
 *
 * RMS over the raw time-domain samples, so it is amplitude and not loudness. A
 * genuinely dead input sits at or near zero; a live one in a silent room still
 * carries the room. Set low on purpose: this exists to catch nothing at all,
 * never to judge a quiet speaker, and a false "your microphone is dead" during
 * a real run is worse than the fault it reports.
 */
const NOISE_FLOOR = 0.004;

/**
 * How long a Recall has to run before its silence means anything.
 *
 * A Recall she ends in three seconds carries no evidence either way, and
 * accusing the hardware on that is how a warning stops being believed.
 */
const MIN_RECALL_MS = 8000;

/** Full deflection. Chosen so ordinary speech uses most of the bar. */
const FULL_SCALE = 0.15;

export interface VoiceLevelProps {
  /** The live input, or null when the microphone never opened. */
  getStream: () => MediaStream | null;
  phase: SectionPhase;
  /**
   * A whole Recall spent at the noise floor. Called at the boundary, at most
   * once per run: a fault repeated every stimulus becomes wallpaper.
   */
  onSilentRecall?: () => void;
}

export function VoiceLevel({ getStream, phase, onSilentRecall }: VoiceLevelProps) {
  const bar = useRef<HTMLSpanElement>(null);
  const level = useRef(0);
  /** The loudest thing heard since the current Recall began. */
  const peak = useRef(0);
  const recallStartedAt = useRef<number | null>(null);
  const reported = useRef(false);
  const onSilent = useRef(onSilentRecall);
  onSilent.current = onSilentRecall;

  /*
   * One analyser for the life of the run.
   *
   * Opened once and closed once, like the recorder itself: an AudioContext per
   * phase would be forty-four of them across a section, and Chrome caps how
   * many a page may hold at the same time.
   */
  useEffect(() => {
    let raf = 0;
    let context: AudioContext | null = null;
    let stopped = false;

    const attach = () => {
      if (stopped) return;
      const stream = getStream();
      // The recorder opens the microphone asynchronously and this mounts with
      // it, so the stream is usually a moment away rather than absent. Ask
      // again next frame; a genuinely refused microphone simply never arrives
      // and the bar stays flat, which is the truth.
      if (!stream) {
        raf = requestAnimationFrame(attach);
        return;
      }
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      const analyser = context.createAnalyser();
      // Small window, because this is an amplitude reading and not a spectrum:
      // it costs less per frame and follows her voice more closely.
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);

      const read = () => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        if (rms > peak.current) peak.current = rms;
        // Rises fast and falls slowly, so the bar tracks speech rather than
        // flickering on every syllable boundary.
        level.current = rms > level.current ? rms : level.current * 0.88 + rms * 0.12;
        if (bar.current) {
          bar.current.style.transform = `scaleX(${Math.min(1, level.current / FULL_SCALE)})`;
        }
        raf = requestAnimationFrame(read);
      };
      read();
    };

    attach();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      void context?.close();
    };
  }, [getStream]);

  /*
   * The fault, decided at the boundary rather than during the Recall.
   *
   * Judging it while she is mid-sentence would fire on a long pause. Judging it
   * as the Recall closes uses the whole window, which is the only reading that
   * separates "she went quiet" from "nothing is arriving".
   */
  useEffect(() => {
    if (phase === "recalling") {
      peak.current = 0;
      recallStartedAt.current = Date.now();
      return;
    }
    const started = recallStartedAt.current;
    recallStartedAt.current = null;
    if (started === null || reported.current) return;
    if (Date.now() - started < MIN_RECALL_MS) return;
    if (peak.current >= NOISE_FLOOR) return;
    reported.current = true;
    onSilent.current?.();
  }, [phase]);

  return (
    <span className="ac-section-level" aria-hidden>
      <span ref={bar} className="ac-section-level-fill" />
    </span>
  );
}
