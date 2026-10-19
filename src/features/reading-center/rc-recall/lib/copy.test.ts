import { describe, expect, it } from "vitest";
import * as instructions from "./instructions";
import { PURPOSE } from "./instructions";
import { RC_RECALL_DEMO_CORRECTION } from "./media";
import { STEP_TITLE, buildSectionSteps, stepInstruction, MODE_LABEL } from "./sequence";
import { segmentPassage } from "./segment";

const EM_DASH = "—";
const passage = segmentPassage("First paragraph.\n\nSecond paragraph.\n\nThird paragraph.");

/** Every string a student reads from the shared teaching copy. */
const studentCopy = (): string[] => {
  const out: string[] = [...Object.values(STEP_TITLE), ...Object.values(MODE_LABEL), ...RC_RECALL_DEMO_CORRECTION];
  for (const value of Object.values(instructions)) {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) out.push(...value.filter((v): v is string => typeof v === "string"));
  }
  for (const mode of ["rc_recall", "cumulative_recall"] as const) {
    for (const scope of ["all_read", "current_sub_passage"] as const) {
      for (const step of buildSectionSteps(mode, [passage, passage], scope)) out.push(stepInstruction(step, mode, scope));
    }
  }
  return out;
};

describe("RC Training student copy", () => {
  it("uses no em dashes", () => {
    expect(studentCopy().filter((text) => text.includes(EM_DASH))).toEqual([]);
  });

  it("explains why before how: the purpose names familiarity versus recall and what checking shows", () => {
    expect(PURPOSE).toMatch(/familiar/i);
    expect(PURPOSE).toMatch(/hiding it shows what you can explain from memory/i);
    expect(PURPOSE).toMatch(/checking afterward shows which details or connections you lost/i);
  });

  it("teaches recorded whole-paragraph recall with end feedback and an honest silent fallback", () => {
    const text = [instructions.RC_RECALL_STEPS.join(" "), instructions.VOICE_NOTE].join(" ");
    expect(text).toMatch(/whole paragraph/i);
    expect(text).toMatch(/optional/i);
    expect(text).not.toMatch(/sentence/i);
    expect(text).toMatch(/Press Space/i);
    expect(text).toMatch(/microphone stays on while you read, recall and check/i);
    expect(text).toMatch(/Complete practice and save your result, then choose Get feedback/i);
    expect(text).toMatch(/Silent recalls and unusable recordings are not graded/i);
    expect(text).toMatch(/Only hidden recall speech is graded/i);
  });

  it("uses recall, not recap, in the steps a student follows", () => {
    const steps = buildSectionSteps("rc_recall", [passage], "all_read").map((s) => `${STEP_TITLE[s.kind]} ${stepInstruction(s, "rc_recall")}`).join(" ");
    expect(steps).not.toMatch(/recap/i);
    expect(instructions.RC_RECALL_STEPS.join(" ")).not.toMatch(/recap/i);
  });

  it("does not teach the separate 35-minute variant or a countdown", () => {
    const text = studentCopy().join(" ");
    expect(text).not.toMatch(/35[- ]minute|countdown to|time limit of/i);
  });
});
