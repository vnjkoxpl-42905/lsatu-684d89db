import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActivityCoach } from "./useActivityCoach";
import type { ActivityItem } from "../api/types";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

// The Press is the only drill that asks which ideas survived, and the whole
// point of that number is that it is judged rather than guessed. These pin the
// two halves of that: the checklist goes out, and only a real array comes back.

const item = {
  order: 1,
  prompt: "a dense paragraph",
  credited_answers: ["one clear sentence"],
  explanation: "the big ideas: (1) first · (2) second",
  category: "Tier 1",
} as unknown as ActivityItem;

const ideas = [
  { n: 1, text: "first" },
  { n: 2, text: "second" },
];

async function judgeWith(data: unknown, withIdeas = true) {
  invoke.mockResolvedValue({ data, error: null });
  const { result } = renderHook(() => useActivityCoach());
  // judge() flips the hook's `judging` state, so the call is the state update.
  let out!: Awaited<ReturnType<typeof result.current.judge>>;
  await act(async () => {
    out = await result.current.judge({
      item,
      studentResponse: "a summary",
      attemptNo: 1,
      ideas: withIdeas ? ideas : undefined,
    });
  });
  return out;
}

describe("sending the checklist", () => {
  beforeEach(() => invoke.mockReset());

  it("passes the ideas through so the Coach can judge coverage", async () => {
    await judgeWith({ verdict: "correct", feedback: "Yes.", covered: [1, 2] });
    expect(invoke.mock.calls[0][1].body.ideas).toEqual(ideas);
  });

  it("sends no checklist for a drill that did not ask for one", async () => {
    await judgeWith({ verdict: "correct", feedback: "Yes." }, false);
    expect(invoke.mock.calls[0][1].body.ideas).toBeUndefined();
  });
});

describe("reading coverage back", () => {
  beforeEach(() => invoke.mockReset());

  it("keeps the numbers the Coach returned", async () => {
    const out = await judgeWith({ verdict: "partial", feedback: "Close.", covered: [1] });
    expect(out.verdict?.covered).toEqual([1]);
  });

  it("keeps an empty array, which means judged and none survived", async () => {
    const out = await judgeWith({ verdict: "incorrect", feedback: "Not yet.", covered: [] });
    expect(out.verdict?.covered).toEqual([]);
  });

  it("leaves coverage undefined when the Coach did not answer", async () => {
    const out = await judgeWith({ verdict: "correct", feedback: "Yes." });
    expect(out.verdict?.covered).toBeUndefined();
  });

  /**
   * The failure that would matter: a malformed coverage field rendering as
   * "every idea was lost" on a student's correct answer.
   */
  it("refuses a coverage field that is not an array", async () => {
    const out = await judgeWith({ verdict: "correct", feedback: "Yes.", covered: "all of them" });
    expect(out.verdict?.covered).toBeUndefined();
  });

  it("drops non-numeric entries rather than ticking a nonexistent idea", async () => {
    const out = await judgeWith({ verdict: "partial", feedback: "Close.", covered: [1, "two", null] });
    expect(out.verdict?.covered).toEqual([1]);
  });
});
