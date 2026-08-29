/**
 * The rule that keeps the app from grading itself.
 *
 * Read, Recall, Colour speaks its prompts aloud and listens to the answer, on
 * the same device, through the same pair of Web Speech APIs. The microphone
 * hears the speaker. If recognition is listening while the orb is talking, it
 * transcribes the orb, and the student is scored against the app's own words.
 *
 * That failure does not look like an echo. It looks like bad recognition
 * accuracy, which is already the top risk on this activity
 * (`docs/specs/2026-08-29-read-recall-colour.md`, section 12), so it would be
 * misdiagnosed and chased in the wrong place. The gate is therefore a state
 * machine that is tested, rather than an ordering the components are trusted to
 * remember.
 *
 * The policy lives here as a pure reducer and the DOM lives in the hook that
 * drives it, so the one part that has to be right can be proved without a
 * browser.
 */

/**
 * `settling` is the window after she lets go of the button and before
 * recognition has handed back its final transcript.
 *
 * It exists because capture is hold-to-talk. The recogniser does not deliver a
 * final result until it is stopped, so the transcript for a recall arrives
 * AFTER the release. Without this phase that result lands while the gate thinks
 * nothing is listening, and the echo guard throws away the very answer it was
 * built to protect. A settling gate accepts a result and no longer accepts
 * audio, which is the real state the microphone is in.
 */
export type SpeechPhase = "idle" | "speaking" | "listening" | "settling";

export interface GateState {
  phase: SpeechPhase;
  /**
   * A listen was asked for while the orb was still talking. It is honoured the
   * moment the utterance ends, rather than dropped: the caller's intent was
   * "listen next", and making every caller re-ask after `onend` is how the
   * ordering gets forgotten in one branch.
   */
  pendingListen: boolean;
  /** The last accepted transcript. Never set from audio heard while speaking. */
  captured: string | null;
  /**
   * How many transcripts arrived while the orb was talking and were thrown
   * away. Not cosmetic: a non-zero count means recognition is running when it
   * should not be, and it is the number that tells the difference between a bad
   * microphone and the app grading itself.
   */
  selfHeard: number;
}

export type GateEvent =
  /** The orb has begun an utterance. */
  | { type: "speak" }
  /** `speechSynthesis` fired `onend` (or `onerror`, which ends it just as much). */
  | { type: "speech-end" }
  /** She pressed and held. Recognition should run as soon as it legally can. */
  | { type: "listen" }
  /** She let go. No more audio, but the final transcript is still owed. */
  | { type: "release" }
  /** Recognition produced a final transcript. */
  | { type: "heard"; text: string }
  /** Stop everything: she exited, or the step moved on. */
  | { type: "stop" };

export const initialGate: GateState = {
  phase: "idle",
  pendingListen: false,
  captured: null,
  selfHeard: 0,
};

export function gate(state: GateState, event: GateEvent): GateState {
  switch (event.type) {
    case "speak":
      // Speaking always wins. Anything already listening is stopped by the
      // effect that watches this phase, so the two are never live together.
      return { ...state, phase: "speaking", pendingListen: false };

    case "listen":
      if (state.phase === "speaking") return { ...state, pendingListen: true };
      return { ...state, phase: "listening", pendingListen: false, captured: null };

    case "speech-end":
      if (state.pendingListen) {
        return { ...state, phase: "listening", pendingListen: false, captured: null };
      }
      return { ...state, phase: "idle" };

    case "release":
      // A release before the utterance ended cancels the queued listen: she
      // pressed and let go while the orb was still talking, so there is nothing
      // to wait for.
      if (state.phase === "speaking") return { ...state, pendingListen: false };
      if (state.phase !== "listening") return state;
      return { ...state, phase: "settling" };

    case "heard": {
      if (state.phase !== "listening" && state.phase !== "settling") {
        // This is the app hearing itself. Count it and discard it; never let it
        // reach a transcript, and never let it look like the student said
        // nothing either, which would fail her for the app's mistake.
        return { ...state, selfHeard: state.selfHeard + 1 };
      }
      if (!event.text.trim()) {
        // Nothing was said. From `settling` that is a real answer to report, so
        // the phase clears; from `listening` she is simply still thinking.
        return state.phase === "settling" ? { ...state, phase: "idle" } : state;
      }
      return { ...state, phase: "idle", captured: event.text };
    }

    case "stop":
      return { ...state, phase: "idle", pendingListen: false };

    default:
      return state;
  }
}

// --------------------------------------------------------------------------
// Choosing a voice
// --------------------------------------------------------------------------

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

/**
 * Pick the voice deterministically.
 *
 * `speechSynthesis.getVoices()` returns a different list on every machine, in a
 * different order, and returns an empty one until `voiceschanged` fires. Taking
 * index 0, or the one flagged default, means the activity has a different
 * narrator on a different laptop, which makes it a different product.
 *
 * Preference order, and each step is doing work:
 *  1. a name from the preference list, in the order given
 *  2. any local voice in the wanted language, since a local one does not
 *     depend on the network mid-session
 *  3. any voice in the wanted language
 *  4. the first voice there is, alphabetically by name so it is at least stable
 */
export function pickVoice(
  voices: readonly VoiceLike[],
  preferred: readonly string[] = ["Samantha", "Karen", "Daniel", "Google US English"],
  lang = "en",
): VoiceLike | null {
  if (!voices.length) return null;
  for (const name of preferred) {
    const hit = voices.find((v) => v.name === name);
    if (hit) return hit;
  }
  const inLang = voices.filter((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase()));
  const local = inLang.find((v) => v.localService);
  if (local) return local;
  if (inLang.length) return [...inLang].sort((a, b) => a.name.localeCompare(b.name))[0];
  return [...voices].sort((a, b) => a.name.localeCompare(b.name))[0];
}

// --------------------------------------------------------------------------
// What the orb says
// --------------------------------------------------------------------------

/**
 * The prompts, and the hard boundary around them.
 *
 * The orb speaks stage directions ONLY. It never speaks the stimulus, a chunk,
 * or any part of one. A chunk read aloud is a reread with the eyes closed, and
 * it would undo the hiding this whole activity is built around. Reading is
 * stage one: it happens with her eyes, on the screen, once.
 *
 * Keeping the lines here as constants rather than inline in a component is what
 * makes that boundary checkable, and there is a test that no line contains any
 * of the stimulus.
 */
export const PROMPTS = {
  recall: "Say it back.",
  cumulative: "Now everything so far.",
  colour: "React to it.",
  theRead: "Give me your read on the whole thing.",
  next: "Next one.",
} as const;

export type PromptKey = keyof typeof PROMPTS;

/**
 * Pulse levels for the orb while the orb itself is talking.
 *
 * `speechSynthesis` exposes no amplitude, so there is nothing real to plot, but
 * it fires `onboundary` once per word. Pulsing on those and decaying between
 * them gives the orb a level that tracks actual speech timing rather than a
 * fixed animation, and the orb already smooths whatever it is handed, so a
 * pulse train reads as speech instead of flicker.
 *
 * Silence would leave it looking dead at the exact moment it is talking.
 */
export function boundaryPulse(previous: number, decay = 0.55): number {
  return Math.min(1, previous * decay + 0.7);
}

export function decayLevel(previous: number, decay = 0.8): number {
  return previous < 0.01 ? 0 : previous * decay;
}
