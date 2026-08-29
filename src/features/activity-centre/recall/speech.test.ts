import { describe, expect, it } from "vitest";
import readRecallColour from "../content/read-recall-colour.json";
import type { RecallItem } from "../api/types";
import {
  boundaryPulse,
  decayLevel,
  gate,
  initialGate,
  pickVoice,
  PROMPTS,
  type GateState,
  type VoiceLike,
} from "./speech";
import { words } from "./overlap";

// The gate exists to stop one specific bug: the microphone hearing the speaker,
// so the student is graded on the app's own words. It presents as bad
// recognition accuracy rather than as an echo, so it is pinned here instead of
// left to component ordering.

const run = (events: Parameters<typeof gate>[1][], from: GateState = initialGate) =>
  events.reduce(gate, from);

describe("the speech gate", () => {
  it("never listens while the orb is talking", () => {
    const state = run([{ type: "speak" }, { type: "listen" }]);
    expect(state.phase).toBe("speaking");
    expect(state.pendingListen).toBe(true);
  });

  it("starts listening the moment the utterance ends", () => {
    const state = run([{ type: "speak" }, { type: "listen" }, { type: "speech-end" }]);
    expect(state.phase).toBe("listening");
    expect(state.pendingListen).toBe(false);
  });

  it("goes quiet after speaking when nobody asked to listen", () => {
    expect(run([{ type: "speak" }, { type: "speech-end" }]).phase).toBe("idle");
  });

  it("throws away anything heard while the orb is talking, and counts it", () => {
    // The whole point. A transcript arriving here is the app hearing itself,
    // and letting it through would score her on the prompt.
    const state = run([
      { type: "speak" },
      { type: "heard", text: "Say it back." },
    ]);
    expect(state.captured).toBeNull();
    expect(state.selfHeard).toBe(1);
    expect(state.phase).toBe("speaking");
  });

  it("does not fail her for the app's mistake", () => {
    // Self-heard audio must not be captured AND must not look like silence that
    // she is responsible for: the phase is untouched, so the run does not
    // advance and does not mark her down.
    const before = run([{ type: "speak" }, { type: "listen" }, { type: "speech-end" }]);
    const speaking = gate(before, { type: "speak" });
    const after = gate(speaking, { type: "heard", text: "Next one." });
    expect(after.captured).toBeNull();
    expect(after.phase).toBe("speaking");
  });

  it("captures what she actually says once it is listening", () => {
    const state = run([
      { type: "listen" },
      { type: "heard", text: "a news show covered a row about a road" },
    ]);
    expect(state.captured).toBe("a news show covered a row about a road");
    expect(state.phase).toBe("idle");
    expect(state.selfHeard).toBe(0);
  });

  it("treats silence as nothing heard rather than as an empty answer", () => {
    const state = run([{ type: "listen" }, { type: "heard", text: "   " }]);
    expect(state.captured).toBeNull();
    expect(state.phase).toBe("listening");
  });

  it("clears the previous capture when a new listen begins", () => {
    const state = run([
      { type: "listen" },
      { type: "heard", text: "the first one" },
      { type: "listen" },
    ]);
    expect(state.captured).toBeNull();
    expect(state.phase).toBe("listening");
  });

  it("lets speaking interrupt listening, so the two are never live together", () => {
    const state = run([{ type: "listen" }, { type: "speak" }]);
    expect(state.phase).toBe("speaking");
    expect(state.pendingListen).toBe(false);
  });

  it("drops a pending listen when the run is stopped", () => {
    const state = run([{ type: "speak" }, { type: "listen" }, { type: "stop" }]);
    expect(state.phase).toBe("idle");
    expect(state.pendingListen).toBe(false);
    expect(gate(state, { type: "speech-end" }).phase).toBe("idle");
  });

  it("still takes the transcript that arrives after she lets go", () => {
    // Capture is hold-to-talk, and the recogniser only hands back a final
    // result once it is stopped, so the answer ALWAYS arrives after the
    // release. An earlier version of this gate discarded it as self-heard,
    // which is the echo guard eating the thing it exists to protect.
    const state = run([
      { type: "listen" },
      { type: "release" },
      { type: "heard", text: "a news show covered a row about a road" },
    ]);
    expect(state.captured).toBe("a news show covered a row about a road");
    expect(state.selfHeard).toBe(0);
    expect(state.phase).toBe("idle");
  });

  it("stops accepting audio once she lets go", () => {
    const settling = run([{ type: "listen" }, { type: "release" }]);
    expect(settling.phase).toBe("settling");
    // A second result after the final one is no longer hers to be scored on.
    const done = gate(settling, { type: "heard", text: "the real answer" });
    const after = gate(done, { type: "heard", text: "stray audio" });
    expect(after.captured).toBe("the real answer");
    expect(after.selfHeard).toBe(1);
  });

  it("reports an empty release as nothing said, not as still listening", () => {
    const state = run([
      { type: "listen" },
      { type: "release" },
      { type: "heard", text: "" },
    ]);
    expect(state.phase).toBe("idle");
    expect(state.captured).toBeNull();
  });

  it("cancels a queued listen if she lets go while the orb is still talking", () => {
    const state = run([{ type: "speak" }, { type: "listen" }, { type: "release" }]);
    expect(state.pendingListen).toBe(false);
    expect(gate(state, { type: "speech-end" }).phase).toBe("idle");
  });

  it("survives an utterance that errors instead of ending cleanly", () => {
    // onerror ends the utterance just as much as onend does, and both are sent
    // as speech-end. Without that the gate would wait forever and she could
    // never answer.
    const state = run([{ type: "speak" }, { type: "listen" }, { type: "speech-end" }]);
    expect(state.phase).toBe("listening");
  });
});

describe("pickVoice", () => {
  const voices: VoiceLike[] = [
    { name: "Zoe", lang: "en-US", localService: false },
    { name: "Daniel", lang: "en-GB", localService: true },
    { name: "Amelie", lang: "fr-FR", localService: true },
    { name: "Samantha", lang: "en-US", localService: true, default: true },
  ];

  it("takes the first name on the preference list, in order", () => {
    expect(pickVoice(voices)?.name).toBe("Samantha");
    expect(pickVoice(voices, ["Daniel", "Samantha"])?.name).toBe("Daniel");
  });

  it("prefers a local voice in the language when no preferred name is present", () => {
    // A local voice does not stop working when the network does, mid-session.
    expect(pickVoice(voices, ["Nobody"])?.name).toBe("Daniel");
  });

  it("is stable rather than taking whatever came first", () => {
    const noLocal: VoiceLike[] = [
      { name: "Zoe", lang: "en-US" },
      { name: "Alan", lang: "en-GB" },
    ];
    expect(pickVoice(noLocal, ["Nobody"])?.name).toBe("Alan");
    expect(pickVoice([...noLocal].reverse(), ["Nobody"])?.name).toBe("Alan");
  });

  it("falls back across languages rather than returning nothing", () => {
    expect(pickVoice([{ name: "Amelie", lang: "fr-FR" }], ["Nobody"])?.name).toBe("Amelie");
  });

  it("returns null before the voice list has arrived", () => {
    // getVoices() is empty until voiceschanged fires, and index 0 of an empty
    // list is the classic crash here.
    expect(pickVoice([])).toBeNull();
  });
});

describe("what the orb is allowed to say", () => {
  const item = (readRecallColour.items[0] as unknown) as RecallItem;

  it("speaks stage directions only, never the stimulus", () => {
    // The hard boundary. A chunk spoken aloud is a reread with the eyes closed,
    // which would undo the hiding the whole activity is built around. Stated as
    // the real invariant rather than a list of banned words, so it still holds
    // for prompts nobody has written yet and stimuli nobody has banked yet.
    const STOP = new Set([
      "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with",
      "by", "is", "are", "was", "were", "be", "it", "its", "this", "that", "so",
      "now", "next", "one", "me", "your", "you", "all", "back", "from", "what",
      "there", "those", "they", "them", "their", "would", "who", "several",
    ]);
    const distinctive = new Set(words(item.prompt).filter((w) => !STOP.has(w)));
    expect(distinctive.size, "the fixture should have content words to protect").toBeGreaterThan(5);

    for (const line of Object.values(PROMPTS)) {
      const leaked = words(line).filter((w) => distinctive.has(w));
      expect(leaked, `"${line}" repeats the stimulus`).toEqual([]);
    }
  });

  it("keeps every prompt short enough to be an instruction, not a passage", () => {
    for (const line of Object.values(PROMPTS)) {
      expect(words(line).length, `"${line}"`).toBeLessThanOrEqual(9);
    }
  });

  it("carries no em-dashes, since these are spoken to a student", () => {
    for (const line of Object.values(PROMPTS)) expect(line).not.toContain("—");
  });
});

describe("the orb's level while it is talking", () => {
  it("pulses up on a word boundary and decays between them", () => {
    // speechSynthesis exposes no amplitude, so the level is driven from
    // onboundary. Silence here leaves the orb looking dead while it talks.
    const pulsed = boundaryPulse(0);
    expect(pulsed).toBeGreaterThan(0.5);
    expect(decayLevel(pulsed)).toBeLessThan(pulsed);
  });

  it("never exceeds the level the orb accepts", () => {
    let level = 0;
    for (let i = 0; i < 40; i++) level = boundaryPulse(level);
    expect(level).toBeLessThanOrEqual(1);
  });

  it("settles to a real zero rather than an asymptote", () => {
    let level = 1;
    for (let i = 0; i < 200; i++) level = decayLevel(level);
    expect(level).toBe(0);
  });
});

/**
 * The typed / dictated answer.
 *
 * The browser's recognition is the weakest part of this activity, so the answer
 * can also arrive from the field, which is what a desktop transcriber types
 * into. It enters through the same gate, but never as `heard`.
 */
describe("a submitted answer", () => {
  it("is accepted from idle, where a heard transcript would be discarded", () => {
    const heard = gate(initialGate, { type: "heard", text: "the orb talking" });
    expect(heard.captured).toBeNull();
    expect(heard.selfHeard).toBe(1);

    const typed = gate(initialGate, { type: "submitted", text: "the orchids bloom by morning" });
    expect(typed.captured).toBe("the orchids bloom by morning");
    expect(typed.phase).toBe("idle");
  });

  it("never counts toward selfHeard, which measures a different fault", () => {
    // selfHeard is the number that separates a bad microphone from the app
    // grading itself. Nothing the orb says can reach her keyboard, so a typed
    // answer inflating it would make that diagnostic useless.
    let s = initialGate;
    for (const text of ["one", "two", "three"]) {
      s = gate(s, { type: "submitted", text });
    }
    expect(s.selfHeard).toBe(0);
    expect(s.captured).toBe("three");
  });

  it("is accepted while listening, so typing mid-hold is not lost", () => {
    const listening = gate(initialGate, { type: "listen" });
    const s = gate(listening, { type: "submitted", text: "typed instead" });
    expect(s.captured).toBe("typed instead");
    expect(s.phase).toBe("idle");
  });

  it("leaves the phase alone while the orb is still speaking", () => {
    const speaking = gate(initialGate, { type: "speak" });
    const s = gate(speaking, { type: "submitted", text: "answered early" });
    expect(s.captured).toBe("answered early");
    // Reporting idle here would change the orb's character mid-utterance.
    expect(s.phase).toBe("speaking");
    expect(gate(s, { type: "speech-end" }).phase).toBe("idle");
  });

  it("ignores an empty submission rather than recording a blank answer", () => {
    const s = gate(initialGate, { type: "submitted", text: "   " });
    expect(s.captured).toBeNull();
    expect(s).toEqual(initialGate);
  });

  it("clears a queued listen, because she has already answered", () => {
    const queued = gate(gate(initialGate, { type: "speak" }), { type: "listen" });
    expect(queued.pendingListen).toBe(true);
    const ended = gate(queued, { type: "speech-end" });
    const s = gate(ended, { type: "submitted", text: "done" });
    expect(s.pendingListen).toBe(false);
    expect(s.captured).toBe("done");
  });
});
