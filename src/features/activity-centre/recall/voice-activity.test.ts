import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOICE_CONFIG,
  armVoice,
  feedVoice,
  frameDb,
  type VoiceState,
} from "./voice-activity";

// The detector that decides when she has finished speaking, and therefore when
// the section moves on without her touching anything.
//
// Everything here is a rule about being wrong in the safe direction. Firing
// early skips a chunk she has not recalled, mid-section, with no way back. So
// the cases below are mostly about NOT firing.

/** Feed a level for a stretch of time, one frame every 16ms. */
function hold(state: VoiceState, db: number, ms: number, from = 0): { state: VoiceState; at: number } {
  let at = from;
  const until = from + ms;
  while (at < until) {
    at += 16;
    state = feedVoice(state, db, at);
  }
  return { state, at };
}

const QUIET = -70;
const VOICE = -25;

describe("learning the room", () => {
  it("drops to a quiet room immediately rather than hearing it as speech", () => {
    const { state } = hold(armVoice(), QUIET, 500);
    expect(state.floorDb).toBeLessThanOrEqual(QUIET);
    expect(state.phase).toBe("waiting");
  });

  it("does not let her own voice lift the floor up to meet itself", () => {
    // The failure this guards: a floor that chases the level upward would sit
    // just under her voice within a second or two, so the middle of her recall
    // would read as silence and the chunk would advance while she was talking.
    let { state, at } = hold(armVoice(), QUIET, 500);
    ({ state, at } = hold(state, VOICE, 8000, at));
    expect(state.phase).toBe("speaking");
  });
});

describe("not firing before she has started", () => {
  it("never ends on silence alone, however long", () => {
    // She has pressed space and is still gathering the sentence. Ten seconds of
    // nothing is a student thinking, not a student finished.
    const { state } = hold(armVoice(), QUIET, 10_000);
    expect(state.phase).toBe("waiting");
  });

  it("ignores a blip too short to be a person talking", () => {
    let { state, at } = hold(armVoice(), QUIET, 400);
    ({ state, at } = hold(state, VOICE, DEFAULT_VOICE_CONFIG.onsetMs - 100, at));
    ({ state } = hold(state, QUIET, 5000, at));
    expect(state.phase).toBe("waiting");
  });
});

describe("ending when she stops", () => {
  it("ends once she has spoken and then gone quiet for the hang time", () => {
    let { state, at } = hold(armVoice(), QUIET, 500);
    ({ state, at } = hold(state, VOICE, 3000, at));
    expect(state.phase).toBe("speaking");
    ({ state, at } = hold(state, QUIET, DEFAULT_VOICE_CONFIG.hangMs + 200, at));
    expect(state.phase).toBe("ended");
  });

  it("rides through the pause between the recall and the colour", () => {
    // The two are one turn with a real gap in the middle: she says the chunk
    // back, then thinks, then reacts to it. Ending in that gap would cut her
    // off before the colour, which is the half of the drill she is here for.
    let { state, at } = hold(armVoice(), QUIET, 500);
    ({ state, at } = hold(state, VOICE, 2500, at));
    ({ state, at } = hold(state, QUIET, DEFAULT_VOICE_CONFIG.hangMs - 400, at));
    expect(state.phase).toBe("speaking");
    ({ state, at } = hold(state, VOICE, 2000, at));
    expect(state.phase).toBe("speaking");
  });

  it("stays ended once it has ended", () => {
    let { state, at } = hold(armVoice(), QUIET, 300);
    ({ state, at } = hold(state, VOICE, 1000, at));
    ({ state, at } = hold(state, QUIET, DEFAULT_VOICE_CONFIG.hangMs + 200, at));
    expect(state.phase).toBe("ended");
    ({ state } = hold(state, VOICE, 3000, at));
    expect(state.phase).toBe("ended");
  });
});

describe("measuring a frame", () => {
  it("floors true silence rather than returning negative infinity", () => {
    expect(frameDb(new Float32Array(128))).toBe(-100);
  });

  it("reads a full-scale tone as roughly zero", () => {
    const buf = new Float32Array(128).fill(1);
    expect(frameDb(buf)).toBeCloseTo(0, 5);
  });

  it("puts a quiet signal well below a loud one", () => {
    const loud = new Float32Array(128).fill(0.5);
    const quiet = new Float32Array(128).fill(0.005);
    expect(frameDb(quiet)).toBeLessThan(frameDb(loud) - 30);
  });
});
