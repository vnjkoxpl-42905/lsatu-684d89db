import { describe, expect, it } from "vitest";
import { COACHED_STIMULI, coachNote } from "./coach";

describe("the first-run walkthrough", () => {
  it("covers the first few stimuli in both phases", () => {
    for (let i = 0; i < COACHED_STIMULI; i++) {
      expect(coachNote(i, "working")?.step).toBe(i + 1);
      expect(coachNote(i, "recalling")?.next).toContain("Space");
    }
  });

  it("retires itself after them", () => {
    expect(coachNote(COACHED_STIMULI, "working")).toBeNull();
    expect(coachNote(9, "recalling")).toBeNull();
  });

  it("tells her what to do now and what the key does next", () => {
    const note = coachNote(0, "working")!;
    expect(note.body.length).toBeGreaterThan(40);
    expect(note.next).toMatch(/Space/);
  });
});
