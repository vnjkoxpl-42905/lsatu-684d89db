import { describe, expect, it } from "vitest";
import readRecallColour from "../content/read-recall-colour.json";
import type { RecallItem } from "../api/types";
import {
  advance,
  buildSession,
  missesByChunk,
  scoreRecall,
  startSession,
  type RecallSession,
  type SessionState,
} from "./session";
import { bigramOverlap, longestSharedRun } from "./overlap";

// The session decides what the student is asked and what her answer is measured
// against, so every rule the drill would quietly stop working without is pinned
// here rather than left to a screen to remember.

const FIXTURE = (readRecallColour.items[0] as unknown) as RecallItem;

function session(): RecallSession {
  const s = buildSession(FIXTURE);
  if (!s) throw new Error("the shipped fixture must build a session");
  return s;
}

/** Walk a whole chunk step: read, recall, see the feedback, colour. */
function workChunk(s: RecallSession, state: SessionState): SessionState {
  let next = advance(s, state, { type: "read-done" });
  next = advance(s, next, { type: "recall-captured", transcript: "said it back" });
  next = advance(s, next, { type: "feedback-done" });
  return advance(s, next, { type: "colour-captured", transcript: "huh" });
}

describe("buildSession", () => {
  it("refuses anything that is not a usable spoken-recall item", () => {
    expect(buildSession(undefined)).toBeNull();
    expect(buildSession({ prompt: "x", chunks: [] })).toBeNull();
    expect(buildSession({ prompt: "x", chunks: [{ n: 1, text: "", details: [{ n: 1, text: "a" }] }] })).toBeNull();
    // A chunk with no answer key cannot be scored, so it is not a session.
    expect(buildSession({ prompt: "x", chunks: [{ n: 1, text: "a b c", details: [] }] })).toBeNull();
  });

  it("lays the fixture out as chunk, chunk, cumulative, chunk, cumulative, the read", () => {
    const s = session();
    expect(s.steps.map((step) => step.kind)).toEqual([
      "chunk",
      "chunk",
      "cumulative",
      "chunk",
      "cumulative",
      "the-read",
    ]);
    expect(s.steps.map((step) => step.index)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("shows text only during a chunk's Read, never in a cumulative round", () => {
    // This is the whole reason the activity is worth building rather than doing
    // with a voice recorder. A cumulative round that showed anything would be a
    // reading exercise.
    for (const step of session().steps) {
      if (step.kind === "chunk") expect(step.text, `step ${step.index}`).toBeTruthy();
      else expect(step.text, `step ${step.index}`).toBeNull();
    }
  });

  it("scores a cumulative round against the union of every chunk so far", () => {
    const s = session();
    const [c1, c2, cum2, c3, cum3] = s.steps;
    expect(cum2.covers).toEqual([1, 2]);
    expect(cum3.covers).toEqual([1, 2, 3]);
    expect(cum2.details).toHaveLength(c1.details.length + c2.details.length);
    expect(cum3.details).toHaveLength(
      c1.details.length + c2.details.length + c3.details.length,
    );
  });

  it("renumbers a cumulative round's details densely while keeping their origin", () => {
    // The Coach answers in the numbers it was given, so the list handed over
    // must be 1..n; the origin has to ride alongside or a miss cannot be named
    // back to the sentence it came from, which is the whole point of feedback.
    const cumulative = session().steps.filter((s) => s.kind === "cumulative");
    for (const step of cumulative) {
      expect(step.details.map((d) => d.n)).toEqual(step.details.map((_, i) => i + 1));
      expect(new Set(step.details.map((d) => d.chunk))).toEqual(new Set(step.covers));
      for (const d of step.details) expect(d.chunkDetailN).toBeGreaterThanOrEqual(1);
    }
  });

  it("measures own words against everything a cumulative round covers", () => {
    const s = session();
    const cum3 = s.steps[4];
    expect(cum3.source).toBe(s.chunks.map((c) => c.text).join(" "));
  });

  it("ends on The Read, which carries no answer key because it is not scored", () => {
    const last = session().steps.at(-1)!;
    expect(last.kind).toBe("the-read");
    expect(last.details).toEqual([]);
    expect(last.source).toBe(FIXTURE.prompt);
  });

  it("invents no cumulative round the bank did not author", () => {
    const s = buildSession({ ...FIXTURE, cumulative_after: [] })!;
    expect(s.steps.map((step) => step.kind)).toEqual(["chunk", "chunk", "chunk", "the-read"]);
  });

  it("ignores a cumulative round pointed at a chunk that does not exist", () => {
    const s = buildSession({ ...FIXTURE, cumulative_after: [2, 9] })!;
    expect(s.steps.filter((step) => step.kind === "cumulative")).toHaveLength(1);
  });
});

describe("the phase machine", () => {
  it("opens a chunk on Read and a cumulative round on Recall", () => {
    const s = session();
    expect(startSession(s)).toEqual({ step: 0, phase: "read" });
    let state = workChunk(s, startSession(s));
    state = workChunk(s, state);
    expect(s.steps[state.step].kind).toBe("cumulative");
    expect(state.phase).toBe("recall");
  });

  it("does not advance on silence, so a dead microphone looks like one", () => {
    const s = session();
    const listening = advance(s, startSession(s), { type: "read-done" });
    expect(listening.phase).toBe("recall");
    expect(advance(s, listening, { type: "recall-captured", transcript: "   " })).toEqual(listening);
  });

  it("will not let her past Colouring In without colouring", () => {
    // The colour is the verifier that the recall was real, not a garnish. A
    // skippable one turns this back into a recall checker.
    const s = session();
    let state = advance(s, startSession(s), { type: "read-done" });
    state = advance(s, state, { type: "recall-captured", transcript: "said it back" });
    state = advance(s, state, { type: "feedback-done" });
    expect(state.phase).toBe("colour");
    expect(advance(s, state, { type: "colour-captured", transcript: "" })).toEqual(state);
    expect(advance(s, state, { type: "colour-captured", transcript: "ha" }).step).toBe(1);
  });

  it("accepts any colour at all, because none of them is judged", () => {
    const s = session();
    let state = advance(s, startSession(s), { type: "read-done" });
    state = advance(s, state, { type: "recall-captured", transcript: "said it back" });
    state = advance(s, state, { type: "feedback-done" });
    expect(advance(s, state, { type: "colour-captured", transcript: "ha" }).step).toBe(1);
  });

  it("never goes back to the recall after the feedback", () => {
    // No retry of a chunk. The dropped detail gets its second chance in the
    // next cumulative round, which is the drill's own answer.
    const s = session();
    let state = advance(s, startSession(s), { type: "read-done" });
    state = advance(s, state, { type: "recall-captured", transcript: "said it back" });
    expect(state.phase).toBe("feedback");
    expect(advance(s, state, { type: "recall-captured", transcript: "again" })).toEqual(state);
    expect(advance(s, state, { type: "feedback-done" }).phase).toBe("colour");
  });

  it("gives a cumulative round no colour stage", () => {
    const s = session();
    let state = workChunk(s, startSession(s));
    state = workChunk(s, state);
    expect(s.steps[state.step].kind).toBe("cumulative");
    state = advance(s, state, { type: "recall-captured", transcript: "both of them back" });
    expect(state.phase).toBe("feedback");
    const after = advance(s, state, { type: "feedback-done" });
    expect(after.phase).toBe("read");
    expect(s.steps[after.step].kind).toBe("chunk");
  });

  it("takes The Read once and finishes, without judging it", () => {
    const s = session();
    let state = startSession(s);
    while (s.steps[state.step].kind !== "the-read") {
      const step = s.steps[state.step];
      state =
        step.kind === "chunk"
          ? workChunk(s, state)
          : advance(
              s,
              advance(s, state, { type: "recall-captured", transcript: "everything so far" }),
              { type: "feedback-done" },
            );
    }
    expect(state.phase).toBe("recall");
    expect(advance(s, state, { type: "recall-captured", transcript: "my read on it" }).phase).toBe(
      "complete",
    );
  });

  it("ignores every event once complete", () => {
    const s = session();
    const done: SessionState = { step: s.steps.length - 1, phase: "complete" };
    expect(advance(s, done, { type: "read-done" })).toEqual(done);
    expect(advance(s, done, { type: "recall-captured", transcript: "x" })).toEqual(done);
  });
});

describe("scoreRecall", () => {
  const step = session().steps[0];

  it("names the details that went missing", () => {
    const score = scoreRecall(step, "a retelling", [1, 3]);
    expect(score.judged).toBe(true);
    expect(score.kept).toBe(2);
    expect(score.total).toBe(step.details.length);
    expect(score.missed.map((d) => d.n)).toEqual(
      step.details.filter((d) => d.n !== 1 && d.n !== 3).map((d) => d.n),
    );
  });

  it("treats an unanswered Coach as unjudged, not as nothing survived", () => {
    // These are different claims and only one of them is true. Stamping a zero
    // over an answer nobody judged is a score the app has no basis for.
    const score = scoreRecall(step, "a retelling", undefined);
    expect(score.judged).toBe(false);
    expect(score.kept).toBe(0);
    expect(score.missed).toEqual([]);
  });

  it("ignores a number the Coach invented", () => {
    const score = scoreRecall(step, "a retelling", [1, 99, 1]);
    expect(score.kept).toBe(1);
  });

  it("reads reciting as high overlap and retelling as low", () => {
    const recited = scoreRecall(step, step.text ?? "", [1]);
    const retold = scoreRecall(step, "a telly show covered a big row about putting in a road", [1]);
    expect(recited.overlap).toBe(1);
    expect(recited.longestRun).toBeGreaterThan(retold.longestRun);
    expect(retold.overlap).toBeLessThan(0.3);
  });

  it("groups a cumulative round's misses by the sentence they came from", () => {
    const cumulative = session().steps[2];
    const score = scoreRecall(cumulative, "some of it", []);
    const grouped = missesByChunk(score);
    expect([...grouped.keys()].sort()).toEqual([1, 2]);
    expect(grouped.get(1)!.every((d) => d.chunk === 1)).toBe(true);
  });
});

describe("overlap", () => {
  it("counts the longest verbatim run in words", () => {
    expect(longestSharedRun("the cat sat on the mat", "a dog and the cat sat down")).toBe(3);
    expect(longestSharedRun("", "anything")).toBe(0);
    expect(longestSharedRun("nothing alike", "totally different")).toBe(0);
  });

  it("counts shared word pairs", () => {
    expect(bigramOverlap("the cat sat", "the cat sat")).toBe(1);
    expect(bigramOverlap("one", "one two three")).toBe(0);
  });

  it("agrees that the shipped reference recall is a retelling, not a recitation", () => {
    // The fixture's credited answer is the model of what "close enough" means,
    // so if it ever drifts into quoting, every judgement calibrated against it
    // drifts too.
    const recall = FIXTURE.credited_answers[0];
    expect(longestSharedRun(recall, FIXTURE.prompt)).toBeLessThanOrEqual(4);
    expect(bigramOverlap(recall, FIXTURE.prompt)).toBeLessThanOrEqual(0.15);
  });
});
