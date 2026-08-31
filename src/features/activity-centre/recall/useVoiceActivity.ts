import { useEffect, useRef } from "react";
import { armVoice, feedVoice, frameDb, type VoiceConfig } from "./voice-activity";

/**
 * Watch the live microphone and say when she has stopped talking.
 *
 * The decision itself is `voice-activity.ts`, which is pure and tested. This is
 * the plumbing: an analyser tapped off the stream the recorder already holds
 * open, read once per animation frame.
 *
 * It taps the same stream rather than opening a second one on purpose. Two
 * `getUserMedia` calls means two microphone sessions, a second permission
 * prompt on some browsers, and a recording that can be stopped while the
 * detector keeps listening. One stream, two consumers.
 *
 * `armed` disarms it, so nothing at all is measured while she is reading
 * silently. `turn` is what makes it usable more than once: the detector is
 * one-shot by design, and consecutive lines are both spoken turns, so `armed`
 * never goes false between them. Without a key that changes per line it would
 * fire on the first recall of the section and then never again, which looks
 * exactly like a microphone that stopped working.
 */
export function useVoiceActivity({
  armed,
  turn,
  getStream,
  onEnded,
  config,
}: {
  armed: boolean;
  /** Changes once per spoken turn. Any stable, distinct value will do. */
  turn: string;
  getStream: () => MediaStream | null;
  onEnded: () => void;
  config?: VoiceConfig;
}) {
  // Held in a ref so a changing handler never restarts the audio graph
  // mid-sentence, which would reset the turn she is halfway through.
  const ended = useRef(onEnded);
  ended.current = onEnded;

  useEffect(() => {
    if (!armed) return;
    const stream = getStream();
    if (!stream) return;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    // Small window: this is a level meter, not a spectrum. 1024 samples is
    // about 21ms at 48kHz, short enough that the hang time is what decides the
    // pause length rather than the buffer.
    analyser.fftSize = 1024;
    source.connect(analyser);

    const buf = new Float32Array(analyser.fftSize);
    let state = armVoice();
    let raf = 0;
    let fired = false;

    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      state = feedVoice(state, frameDb(buf), performance.now(), config);
      if (state.phase === "ended" && !fired) {
        fired = true;
        ended.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      // The stream itself belongs to the recorder and is deliberately not
      // stopped here: closing it would end the take.
      void ctx.close();
    };
  }, [armed, turn, getStream, config]);
}
