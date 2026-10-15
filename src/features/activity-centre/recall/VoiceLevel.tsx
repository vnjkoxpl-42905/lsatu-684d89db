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
 * **The fault.** If the input never leaves the noise floor across a whole
 * stimulus, that is said out loud at the boundary, while there is still a
 * section left to save -- and unsaid the moment anything is heard again.
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
 * How long a phase has to run before its silence means anything.
 *
 * A Recall she ends in three seconds carries no evidence either way, and
 * accusing the hardware on that is how a warning stops being believed. A window
 * shorter than this counts neither for the fault nor against it.
 */
const MIN_WINDOW_MS = 8000;

/**
 * Consecutive silent windows before the fault is raised.
 *
 * Both halves of a stimulus are spoken -- "Read it. Tell it back and colour it in
 * as you go", then "Say the whole argument back from memory" -- so a dead input
 * is silent through every window there is. A skip is silent through exactly
 * one: she had nothing for that Recall, and then she reads the next stimulus
 * aloud like all the others.
 *
 * One window was therefore the wrong unit, and it accused the hardware on the
 * most ordinary thing a student does. Two consecutive is the shortest run a skip
 * cannot produce, and it costs a genuinely dead microphone one further stimulus
 * before it is named.
 */
const SILENT_WINDOWS = 2;

/** Full deflection. Chosen so ordinary speech uses most of the bar. */
const FULL_SCALE = 0.15;

export interface VoiceLevelProps {
  /** The live input, or null when the microphone never opened. */
  getStream: () => MediaStream | null;
  phase: SectionPhase;
  /**
   * Whether nothing is reaching the microphone, called only when the answer
   * changes.
   *
   * It used to be a one-way announcement, fired once and never taken back, and
   * the runner had no setter that could clear it. One deliberate skip therefore
   * told a student her hardware was broken, and went on telling her for the
   * remaining twenty-five stimuli and four minutes of clearly heard speech.
   */
  onDeadInput?: (dead: boolean) => void;
}

export function VoiceLevel({ getStream, phase, onDeadInput }: VoiceLevelProps) {
  const bar = useRef<HTMLSpanElement>(null);
  const level = useRef(0);
  /** The loudest thing heard since the current phase began. */
  const peak = useRef(0);
  const windowStartedAt = useRef<number | null>(null);
  /** Consecutive windows that ran long enough to count and carried nothing. */
  const silentWindows = useRef(0);
  /** What the runner has been told, so it is told only when that changes. */
  const dead = useRef(false);
  const onDead = useRef(onDeadInput);
  onDead.current = onDeadInput;

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
        /*
         * Recovery is immediate, and deliberately not deferred to the next
         * boundary like the fault is. The fault needs a whole window to be sure;
         * being heard again needs one frame, and a warning that outlives the
         * condition it describes is the thing being fixed. Guarded on `dead` so
         * this is a transition rather than a call at 60Hz.
         */
        if (rms >= NOISE_FLOOR && dead.current) {
          dead.current = false;
          silentWindows.current = 0;
          onDead.current?.(false);
        }
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
   * The fault, decided at the boundary rather than during a phase.
   *
   * Judging it while she is mid-sentence would fire on a long pause. Judging it
   * as a phase closes uses the whole window, which is the only reading that
   * separates "she went quiet" from "nothing is arriving".
   *
   * Every boundary is judged now, not only the end of a Recall. The working
   * phase is spoken too, so its silence is evidence of exactly the same kind,
   * and using both is what lets a run of them mean something a single one
   * cannot.
   */
  useEffect(() => {
    const started = windowStartedAt.current;
    const loudest = peak.current;
    peak.current = 0;
    windowStartedAt.current = Date.now();

    // The first run of this effect opens the first window; nothing has closed.
    if (started === null) return;
    // Too short to carry evidence either way, so it neither raises the fault
    // nor clears the count towards it.
    if (Date.now() - started < MIN_WINDOW_MS) return;

    if (loudest >= NOISE_FLOOR) {
      silentWindows.current = 0;
      return;
    }
    silentWindows.current += 1;
    if (silentWindows.current >= SILENT_WINDOWS && !dead.current) {
      dead.current = true;
      onDead.current?.(true);
    }
  }, [phase]);

  return (
    <span className="ac-section-level" aria-hidden>
      <span ref={bar} className="ac-section-level-fill" />
    </span>
  );
}
