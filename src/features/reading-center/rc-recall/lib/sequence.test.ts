import { describe, expect, it } from "vitest";
import { buildPassageSteps, buildSectionSteps, confirmationIndices, stepInstruction, type RecallStep } from "./sequence";
import { segmentPassage } from "./segment";
import { COMPARATIVE, STANDARD } from "./fixtures";

const standard = segmentPassage(STANDARD);
const comparative = segmentPassage(COMPARATIVE);
const brief = (steps: RecallStep[]) => steps.map((s) => `${s.kind}:${s.paragraph + 1}:${s.visible.map((i) => i + 1).join("+") || "hidden"}:${s.covers.map((i) => i + 1).join("+")}`);
const upTo = (steps: RecallStep[], paragraph: number) => steps.filter((s) => s.paragraph === paragraph);

describe("RC Recall sequence", () => {
  const steps = buildPassageSteps("rc_recall", standard, 0);

  it("paragraph 1: read, hidden recall, then confirm paragraph 1 only", () => {
    expect(brief(upTo(steps, 0))).toEqual(["read:1:1:1", "recall:1:hidden:1", "confirm:1:1:1"]);
  });
  it("paragraph 2: read, hidden recall, confirm all text read so far", () => {
    expect(brief(upTo(steps, 1))).toEqual(["read:2:2:2", "recall:2:hidden:2", "confirm:2:1+2:1+2"]);
  });
  it("paragraph 5: confirmation covers paragraphs 1 to 5", () => {
    expect(brief(upTo(steps, 4)).slice(0, 3)).toEqual(["read:5:5:5", "recall:5:hidden:5", "confirm:5:1+2+3+4+5:1+2+3+4+5"]);
  });
  it("keeps paragraph capture fixed and offers a voice choice only for the optional passage recap", () => {
    const voiced = steps.filter((s) => s.voiceChoice);
    expect(voiced.map((s) => s.kind)).toEqual(["passage_recap"]);
    expect(voiced[0].optional).toBe(true);
    expect(voiced[0].visible).toEqual([]);
    expect(steps.filter((s) => s.kind === "confirm").every((s) => s.recapKey === null)).toBe(true);
  });
  it("has no cumulative step", () => {
    expect(steps.some((s) => s.kind === "cumulative")).toBe(false);
  });
  it("explains Space recording and the spoken paragraph recall", () => {
    expect(stepInstruction(steps[0], "rc_recall")).toContain("Press Space to hide it and record");
    expect(stepInstruction(steps[1], "rc_recall")).toContain("out loud");
    expect(stepInstruction(steps[1], "rc_recall")).toContain("stop recording and check");
  });
});

describe("Cumulative Recall sequence", () => {
  const steps = buildPassageSteps("cumulative_recall", standard, 0);

  it("paragraph 1 has only read and a hidden recall, no look-back", () => {
    expect(brief(upTo(steps, 0))).toEqual(["read:1:1:1", "recall:1:hidden:1"]);
  });
  it("paragraph 2 adds a hidden cumulative recap of 1 + 2", () => {
    expect(brief(upTo(steps, 1))).toEqual(["read:2:2:2", "recall:2:hidden:2", "cumulative:2:hidden:1+2"]);
  });
  it("paragraph 5 recaps 1 to 5 with the text hidden", () => {
    expect(brief(upTo(steps, 4))).toEqual(["read:5:5:5", "recall:5:hidden:5", "cumulative:5:hidden:1+2+3+4+5"]);
  });
  it("both recap kinds can be spoken or silent and nothing shows text", () => {
    expect(steps.filter((s) => s.recapKey).every((s) => s.voiceChoice)).toBe(true);
    expect(steps.some((s) => s.kind === "confirm" || s.kind === "passage_recap")).toBe(false);
  });
});

describe("comparative passages", () => {
  it("confirmation instructions describe the actual text scope for standard and paired passages", () => {
    const standardCheck = buildPassageSteps("rc_recall", standard, 0, "current_sub_passage")
      .find((step) => step.kind === "confirm" && step.paragraph === 2)!;
    expect(stepInstruction(standardCheck, "rc_recall", "current_sub_passage")).toContain("all the paragraphs you have read so far");
    const separateCheck = buildPassageSteps("rc_recall", comparative, 0, "current_sub_passage")
      .find((step) => step.kind === "confirm" && step.paragraph === 4)!;
    expect(stepInstruction(separateCheck, "rc_recall", "current_sub_passage")).toContain("paragraphs shown from Passage B");
    const allReadCheck = buildPassageSteps("rc_recall", comparative, 0)
      .find((step) => step.kind === "confirm" && step.paragraph === 4)!;
    expect(stepInstruction(allReadCheck, "rc_recall")).toContain("all the paragraphs you have read so far");
  });
  it("RC Recall default scope confirms all text read so far, including Passage A in Passage B", () => {
    expect(confirmationIndices(comparative, 4, "all_read")).toEqual([0, 1, 2, 3, 4]);
  });
  it("RC Recall current-sub-passage scope confirms only the sub-passage", () => {
    expect(confirmationIndices(comparative, 1, "current_sub_passage")).toEqual([0, 1]);
    expect(confirmationIndices(comparative, 3, "current_sub_passage")).toEqual([3]);
    expect(confirmationIndices(comparative, 4, "current_sub_passage")).toEqual([3, 4]);
    expect(confirmationIndices(comparative, 5, "current_sub_passage")).toEqual([3, 4, 5]);
  });
  it("a standard passage has no sub-passages, so the sub-passage scope shows everything read", () => {
    expect(confirmationIndices(standard, 2, "current_sub_passage")).toEqual([0, 1, 2]);
  });
  it("Cumulative Recall recaps Passage A and Passage B together once B starts", () => {
    const steps = buildPassageSteps("cumulative_recall", comparative, 1);
    const firstB = steps.find((s) => s.kind === "cumulative" && s.paragraph === 3)!;
    expect(firstB.covers).toEqual([0, 1, 2, 3]);
  });
  it("headings are never their own steps", () => {
    const steps = buildPassageSteps("rc_recall", comparative, 0);
    expect(steps.filter((s) => s.kind === "read")).toHaveLength(6);
  });
});

describe("section", () => {
  it("runs every passage in order and restarts the cumulative scope per passage", () => {
    const steps = buildSectionSteps("cumulative_recall", [standard, comparative, standard, standard]);
    expect(steps.map((s) => s.passage).filter((p, i, a) => a.indexOf(p) === i)).toEqual([0, 1, 2, 3]);
    const firstOfSecond = steps.find((s) => s.passage === 1 && s.kind === "cumulative")!;
    expect(firstOfSecond.covers).toEqual([0, 1]);
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
