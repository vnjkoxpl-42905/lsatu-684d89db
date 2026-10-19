import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { METHOD_STEPS, THE_RECALL, stepName } from "./method";

/**
 * One method, one source.
 *
 * The drill taught three. The door said step 1 is silent; the walkthrough said
 * "Read it, out loud in pieces". The door said a colour is a doubt or a joke;
 * the walkthrough told her to say "what that piece is doing in the argument,
 * evidence, conclusion", which is precisely the pasteable label the judge
 * refuses to count. The Report Card then listed both as faults. The product
 * coached her into them and marked her down for them.
 *
 * These tests hold every surface to the authored steps and to the vocabulary in
 * CONTEXT.md. They read source rather than rendering, because the drift they
 * exist to catch is someone writing the method out again by hand.
 */
const AC = path.join(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(AC, rel), "utf8");
}

/** Comments carry the reasoning and may name a retired term to explain it. */
function rendered(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\s+/g, " ");
}

/** Everywhere a student meets the method before or during a run. */
const STUDENT_COPY = [
  "components/SectionLaunch.tsx",
  "components/SectionLibraryLaunch.tsx",
  "components/SectionLaunchFrame.tsx",
  "components/MethodSummary.tsx",
  "components/SectionBriefingPage.tsx",
  "recall/coach.ts",
  "recall/SectionStage.tsx",
];

describe("the four steps", () => {
  it("are the four, in order, from the authored instructions", () => {
    expect(METHOD_STEPS.map((s) => s.label)).toEqual([
      "Read it.",
      "Tell it back.",
      "Colour it.",
      "The Recall.",
    ]);
    expect(stepName(THE_RECALL)).toBe("The Recall");
  });

  it("each carry a one-line definition", () => {
    for (const step of METHOD_STEPS) {
      expect(step.short.length, step.label).toBeGreaterThan(20);
      expect(step.short.trim().endsWith("."), step.label).toBe(true);
    }
  });

  it("say step one is silent, because it is", () => {
    // CONTEXT.md, Read (step 1): "The silent reading of a chunk. Nothing is
    // spoken." The walkthrough said the opposite for as long as it existed.
    expect(METHOD_STEPS[0].short).toMatch(/silent/i);
  });

  it("define the colour as her own reaction, never as a label for the sentence", () => {
    // A label that would fit any stimulus is the one thing the judge refuses to
    // count as a colour, so no surface may ask her for one.
    const colour = METHOD_STEPS[2].short;
    expect(colour).toMatch(/react/i);
    for (const rel of STUDENT_COPY) {
      const text = rendered(read(rel));
      expect(text, `${rel} asks for a structural label instead of a reaction`).not.toMatch(
        /what (?:that|the) (?:piece|sentence|line|chunk) is doing in the argument/i,
      );
    }
  });
});

describe("the vocabulary CONTEXT.md fixes", () => {
  /** Retired student-facing words, and the step each one blurred. */
  const RETIRED: [RegExp, string][] = [
    [/\bsay it back\b/i, "step 2's old student label; the label is Tell it back"],
    [/\brepeat[- ]back\b/i, "step 2"],
    [/\bparaphrase\b/i, "step 2"],
    [/\brecap\b/i, "step 4; the name is The Recall"],
    [/\btakeaway\b/i, "The Read"],
  ];

  for (const rel of STUDENT_COPY) {
    it(`${rel} uses none of the retired words`, () => {
      const text = rendered(read(rel));
      const found = RETIRED.filter(([re]) => re.test(text)).map(([re, why]) => `${re} (${why})`);
      expect(found).toEqual([]);
    });
  }

  it("never calls the fourth step a Read outside the Report Card", () => {
    // ADR 0012 renamed step 4 to The Recall. ADR 0025 then gave "The Read" a
    // new and different job: the analytical second number, which the Report
    // Card is right to name. Everywhere else, "your Read" means the retired
    // step name and is a lie about what Space just did.
    for (const rel of STUDENT_COPY) {
      expect(rendered(read(rel)), rel).not.toMatch(/\byour Read\b/i);
    }
  });

  it("defines the move somewhere on the card", () => {
    // That the definition comes BEFORE the first use is asserted against the
    // rendered DOM in SectionReportCard.test.tsx; source order is not render
    // order here, because the first use is inside a helper declared at the top.
    expect(rendered(read("components/SectionReportCard.tsx"))).toMatch(
      /The move is what an argument runs on/,
    );
  });
});
