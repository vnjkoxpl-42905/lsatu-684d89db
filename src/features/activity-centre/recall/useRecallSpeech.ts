/**
 * The browser half of the speech loop: `SpeechRecognition` for what she says,
 * `speechSynthesis` for what the orb says, both driven through the gate in
 * `speech.ts` so they are never live at once.
 *
 * Every decision worth arguing about is in `speech.ts` and tested there. This
 * file is the wiring, and it is deliberately thin: what it must get right is
 * that nothing touches the two APIs except in response to a phase the reducer
 * has already agreed to.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  boundaryPulse,
  decayLevel,
  gate,
  initialGate,
  pickVoice,
  type GateState,
  type VoiceLike,
} from "./speech";

/**
 * The slice of the Web Speech recognition API this uses.
 *
 * Hand-written because it is not in the DOM lib: `SpeechRecognition` is still
 * unprefixed only in some engines and TypeScript ships no types for it. Naming
 * the four things actually read is better than `any`, which would hide a typo
 * in `results[i][0].transcript` until a student lost a recall to it.
 */
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly [index: number]: RecognitionAlternative;
  isFinal: boolean;
}
interface RecognitionResultList {
  readonly length: number;
  readonly [index: number]: RecognitionResult;
}
interface RecognitionEvent {
  resultIndex: number;
  results: RecognitionResultList;
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return Boolean(recognitionCtor()) && typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface RecallSpeech {
  /** What the gate thinks is happening. Drives the orb's mood. */
  phase: GateState["phase"];
  /** 0..1, pushed straight into the orb. Microphone while she talks, speech boundaries while it does. */
  level: number;
  /** The last completed transcript, cleared when a new capture starts. */
  transcript: string | null;
  /** Press. */
  hold: () => void;
  /** Release. The final transcript arrives after this. */
  release: () => void;
  /**
   * Take the answer she entered herself, typed or dictated into the field by a
   * desktop transcriber. It goes in through the same gate as a spoken one, so
   * there is still exactly one way a transcript enters this feature.
   */
  submit: (text: string) => void;
  /** Say a line, then optionally start listening the moment it ends. */
  say: (text: string, thenListen?: boolean) => void;
  /** Abandon everything, e.g. she exited the run. */
  stop: () => void;
  /**
   * Set when the microphone itself failed, so the screen can say so. Silence and
   * a broken microphone look identical to the student otherwise, and telling her
   * nothing while she talks into a dead input is the worst version of this.
   */
  error: string | null;
  /**
   * How many transcripts arrived while the orb was talking and were discarded.
   * Non-zero means recognition ran when it should not have, and is the number
   * that separates a bad microphone from the app grading itself.
   */
  selfHeard: number;
  supported: boolean;
}

export function useRecallSpeech(lang = "en-US"): RecallSpeech {
  const [state, dispatch] = useReducer(gate, initialGate);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const voice = useRef<VoiceLike | null>(null);
  const supported = useMemo(speechSupported, []);

  // The lifecycle handlers fire outside React's render, so they read the live
  // phase from here rather than closing over a stale one.
  const phase = useRef(state.phase);
  phase.current = state.phase;

  // Resolve the voice once. getVoices() is empty until voiceschanged fires on
  // most browsers, and index 0 of an empty list is the classic crash. Confirmed
  // in this app on 2026-08-29: the first call returned zero voices.
  useEffect(() => {
    if (!supported) return;
    const resolve = () => {
      const voices = window.speechSynthesis.getVoices() as unknown as VoiceLike[];
      if (voices.length) voice.current = pickVoice(voices, undefined, lang);
    };
    resolve();
    window.speechSynthesis.addEventListener("voiceschanged", resolve);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", resolve);
  }, [supported, lang]);

  useEffect(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${piece} `;
        else interim += piece;
      }
      // Interim results drive the level only. They are never shown: watching her
      // own words appear is rereading with extra steps, and it invites the
      // mid-sentence self-correction the colour stage bans.
      if (interim) setLevel((l) => Math.min(1, l * 0.6 + 0.5));
      if (finalText.trim()) dispatch({ type: "heard", text: finalText.trim() });
    };

    /**
     * Recognition stops on its own, and this is where that used to strand her.
     *
     * Engines end a session after a stretch of silence even with `continuous`
     * set. If that happens while she is still holding the button, the gate is
     * still `listening`, the phase never changes, and the effect that starts
     * recognition never re-runs: she talks into nothing and the run waits
     * forever. So a spontaneous end while listening restarts it.
     *
     * From `settling` the opposite is true. `stop()` was deliberate and `onend`
     * means no final result is coming, so the empty capture is reported and the
     * phase clears rather than hanging.
     */
    rec.onend = () => {
      if (phase.current === "listening") {
        try {
          rec.start();
        } catch {
          /* it is already running; nothing to do */
        }
        return;
      }
      if (phase.current === "settling") dispatch({ type: "heard", text: "" });
    };

    rec.onerror = (event) => {
      // `no-speech` is not a failure, it is her thinking. Everything else is a
      // real fault and must not leave the gate believing it is listening.
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "The microphone is blocked. Allow it in your browser and try again."
          : "The microphone stopped working. Press and hold to try again.",
      );
      dispatch({ type: "stop" });
    };

    recognition.current = rec;
    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      recognition.current = null;
    };
  }, [lang]);

  // The single place recognition is started or stopped, and it only ever reacts
  // to a phase the reducer already agreed to. Nothing else in the feature may
  // call rec.start().
  useEffect(() => {
    const rec = recognition.current;
    if (!rec) return;
    if (state.phase === "listening") {
      setError(null);
      try {
        rec.start();
      } catch {
        /* already running */
      }
      return;
    }
    try {
      // `stop` rather than `abort` on settling: stop asks for the final result,
      // abort throws it away, and that result is her answer.
      if (state.phase === "settling") rec.stop();
      else rec.abort();
    } catch {
      /* not running */
    }
  }, [state.phase]);

  // Decay the level whenever nothing is pushing it up, so the orb settles rather
  // than freezing at whatever it last saw.
  const quiet = level === 0;
  useEffect(() => {
    if (quiet) return;
    const id = window.setInterval(() => setLevel((l) => decayLevel(l)), 80);
    return () => window.clearInterval(id);
  }, [quiet]);

  const say = useCallback(
    (text: string, thenListen = false) => {
      if (!supported) {
        // No speech available. The prompt is shown instead, which is safe: an
        // instruction is not the stimulus, so reading "Say it back" costs the
        // drill nothing.
        if (thenListen) dispatch({ type: "listen" });
        return;
      }
      window.speechSynthesis.cancel();
      dispatch({ type: "speak" });
      if (thenListen) dispatch({ type: "listen" });
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice.current) utterance.voice = voice.current as unknown as SpeechSynthesisVoice;
      utterance.rate = 1;
      // speechSynthesis exposes no amplitude, so the orb's level is pulsed from
      // word boundaries. Without it the orb looks dead at the exact moment it is
      // talking.
      utterance.onboundary = () => setLevel((l) => boundaryPulse(l));
      const done = () => {
        setLevel(0);
        dispatch({ type: "speech-end" });
      };
      utterance.onend = done;
      // An utterance that errors has ended just as much as one that finished.
      // Without this the gate waits forever and she can never answer.
      utterance.onerror = done;
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  const hold = useCallback(() => dispatch({ type: "listen" }), []);
  const release = useCallback(() => dispatch({ type: "release" }), []);
  const submit = useCallback((text: string) => {
    // Silence the orb first. She has answered, so a prompt still being read out
    // is talking over the answer it asked for.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    dispatch({ type: "submitted", text });
  }, []);
  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setLevel(0);
    dispatch({ type: "stop" });
  }, [supported]);

  return {
    phase: state.phase,
    level,
    transcript: state.captured,
    hold,
    release,
    submit,
    say,
    stop,
    error,
    selfHeard: state.selfHeard,
    supported,
  };
}
