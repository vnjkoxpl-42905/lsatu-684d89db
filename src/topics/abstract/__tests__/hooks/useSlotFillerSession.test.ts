import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSlotFillerSession } from "../../hooks/useSlotFillerSession";
import type { PlaygroundStimulus } from "../../types";

const STIM: PlaygroundStimulus[] = [
  {
    id: "ps-test-1",
    stimulus_text: "A. B.",
    clauses: [
      { id: "c1", text: "A", slot: "authors-conclusion" },
      { id: "c2", text: "B", slot: "authors-evidence" },
    ],
    indicator_words: [],
  },
];

describe("useSlotFillerSession", () => {
  it("check marks correct placements", () => {
    const { result } = renderHook(() => useSlotFillerSession(STIM));
    act(() => result.current.place("c1", "authors-conclusion"));
    act(() => result.current.place("c2", "authors-evidence"));
    act(() => {
      const r = result.current.check();
      expect(r.every((x) => x.correct)).toBe(true);
    });
    expect(result.current.sessionAccuracy.correct).toBe(2);
    expect(result.current.sessionAccuracy.total).toBe(2);
  });

  it("check marks incorrect placement with a tip", () => {
    const { result } = renderHook(() => useSlotFillerSession(STIM));
    act(() => result.current.place("c1", "authors-evidence"));
    act(() => result.current.place("c2", "authors-evidence"));
    act(() => {
      const r = result.current.check();
      const c1 = r.find((x) => x.clauseId === "c1")!;
      expect(c1.correct).toBe(false);
      expect(c1.expectedSlot).toBe("authors-conclusion");
    });
  });

  it("next clears placements without resetting session accuracy", () => {
    const { result } = renderHook(() => useSlotFillerSession(STIM));
    act(() => result.current.place("c1", "authors-conclusion"));
    act(() => result.current.place("c2", "authors-evidence"));
    act(() => {
      result.current.check();
    });
    act(() => result.current.next());
    expect(result.current.placements).toEqual({});
    expect(result.current.sessionAccuracy.total).toBe(2);
  });
});
