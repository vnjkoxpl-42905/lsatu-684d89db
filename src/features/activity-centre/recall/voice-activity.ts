/**
 * When she has finished speaking.
 *
 * The drill is one unbroken run of 23 stimuli done out loud, and every hand it
 * asks of her is a hand not on the page. So the section advances itself: she
 * presses space once to blank a chunk, says it back and colours it, and the
 * screen moves on when she stops talking rather than when she reaches for a
 * key.
 *
 * This module is only the decision, kept pure so the thresholds below can be
 * argued with in a test rather than guessed at in a browser. `useVoiceActivity`
 * feeds it real levels; nothing here touches the microphone.
 *
 * Two rules shape it, and both are about the cost of being wrong:
 *
 * - **It never fires before she has started.** A silence is only the end of
 *   speech if there was speech. Otherwise every pause before she opens her
 *   mouth would skip a chunk she has not recalled, which is the one failure she
 *   cannot undo mid-section.
 * - **The floor is learned, not assumed.** A fixed threshold is a promise about
 *   her room and her microphone that this code is in no position to make. The
 *   quietest thing recently heard is the floor, and speech is what stands well
 *   clear of it.
 */

export interface VoiceConfig {
  /** How far above the learned noise floor, in dB, counts as her voice. */
  marginDb: number;
  /** How long she must be audible before we believe she has started. */
  onsetMs: number;
  /**
   * How long the silence after she has started must last before it is the end.
   *
   * This is the one number a student would feel. Too short and it cuts her off
   * between the recall and the colour, which are one continuous turn with a
   * real thinking pause in the middle. Too long and the section feels like it
   * is lagging behind her. Two and a half seconds clears an ordinary
   * mid-sentence pause and still reads as immediate.
   */
  hangMs: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  marginDb: 9,
  onsetMs: 200,
  hangMs: 2500,
};

export type VoicePhase = "waiting" | "speaking" | "ended";

export interface VoiceState {
  phase: VoicePhase;
  /** The learned noise floor, in dB. */
  floorDb: number;
  /** When the current run of loud-or-quiet began, or null if it has not. */
  sinceMs: number | null;
}

/**
 * Armed and listening, with a floor pessimistic enough that a first sample from
 * a quiet room lowers it immediately rather than reading as speech.
 */
export function armVoice(): VoiceState {
  return { phase: "waiting", floorDb: 0, sinceMs: null };
}

/**
 * The floor falls to whatever is quietest straight away, and rises only very
 * slowly. That asymmetry is deliberate: a room that gets quieter is news, and a
 * room that gets louder is usually her talking, which must not be allowed to
 * lift the floor up to meet itself and end the turn early.
 */
function adaptFloor(floorDb: number, db: number): number {
  return db < floorDb ? db : floorDb + (db - floorDb) * 0.005;
}

/** One level sample. `db` is dBFS, so it is at or below zero. */
export function feedVoice(
  state: VoiceState,
  db: number,
  atMs: number,
  cfg: VoiceConfig = DEFAULT_VOICE_CONFIG,
): VoiceState {
  if (state.phase === "ended") return state;

  // The floor only learns while she is not talking, for the reason above.
  const floorDb = state.phase === "waiting" ? adaptFloor(state.floorDb, db) : state.floorDb;
  const loud = db > floorDb + cfg.marginDb;

  if (state.phase === "waiting") {
    if (!loud) return { phase: "waiting", floorDb, sinceMs: null };
    if (state.sinceMs === null) return { phase: "waiting", floorDb, sinceMs: atMs };
    if (atMs - state.sinceMs >= cfg.onsetMs) {
      return { phase: "speaking", floorDb, sinceMs: null };
    }
    return { phase: "waiting", floorDb, sinceMs: state.sinceMs };
  }

  // speaking
  if (loud) return { phase: "speaking", floorDb, sinceMs: null };
  if (state.sinceMs === null) return { phase: "speaking", floorDb, sinceMs: atMs };
  if (atMs - state.sinceMs >= cfg.hangMs) {
    return { phase: "ended", floorDb, sinceMs: null };
  }
  return { phase: "speaking", floorDb, sinceMs: state.sinceMs };
}

/** The level of one frame of samples, in dBFS. Silence floors at -100. */
export function frameDb(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / Math.max(samples.length, 1));
  if (rms <= 0) return -100;
  return Math.max(-100, 20 * Math.log10(rms));
}
