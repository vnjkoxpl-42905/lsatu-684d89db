import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * One truth about pausing.
 *
 * For a while the runner shipped a working Pause button while six separate
 * student-facing statements told her the section could not be paused. She
 * either believed the copy and sat through a knock at the door, or she pressed
 * the button and learned that the writing on this drill is not to be trusted.
 * Joshua's call, 2026-09-09: Pause stays, the copy tells the truth.
 *
 * The truth is one sentence, and every surface says the same one: the text
 * hides, the clock stops, and she cannot go back to a stimulus. If the button
 * is ever removed, delete this file in the same commit rather than around it.
 */
const HERE = __dirname;

/** Every place a student reads about the shape of the run. */
const SURFACES = [
  "components/SectionLaunchFrame.tsx",
  "components/SectionLaunch.tsx",
  "components/SectionLibraryLaunch.tsx",
  "components/SectionBriefingPage.tsx",
  "recall/coach.ts",
  "content/read-recall-colour-section.instructions.json",
];

/** Claims that were true before the Pause button and are lies after it. */
const DENIALS = [
  /no pause/i,
  /cannot pause/i,
  /can't pause/i,
  /never pauses?/i,
  /does not pause/i,
  /no stopping/i,
  /no breaks/i,
];

/**
 * Comments carry the reasoning and are allowed to discuss a pause; only what
 * renders is under test. This strips `//`, `/* *\/` and `{/* *\/}` so a
 * design note cannot fail the build and a lie cannot hide inside one either.
 */
function rendered(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

describe("what the drill says about pausing", () => {
  for (const rel of SURFACES) {
    const source = fs.readFileSync(path.join(HERE, rel), "utf8");
    const text = rel.endsWith(".json") ? source : rendered(source);

    it(`${rel} does not deny the Pause button the runner ships`, () => {
      const lies = DENIALS.filter((re) => re.test(text)).map(String);
      expect(lies).toEqual([]);
    });
  }

  /**
   * Where she is deciding whether to start, she gets the whole sentence. The
   * door's closing line and the walkthrough card are compressed restatements
   * read at a glance or mid-run, and a third clause there is noise; they are
   * held only to not contradicting it.
   */
  const FULL_SENTENCE = [
    "components/SectionLaunch.tsx",
    "components/SectionLibraryLaunch.tsx",
    "components/SectionBriefingPage.tsx",
    "content/read-recall-colour-section.instructions.json",
  ];

  it("says the same three things everywhere she reads before she starts", () => {
    for (const rel of FULL_SENTENCE) {
      const source = fs.readFileSync(path.join(HERE, rel), "utf8");
      const text = rendered(source).replace(/\s+/g, " ");
      expect(text, `${rel}: the offer`).toMatch(/You can pause/i);
      expect(text, `${rel}: what it costs`).toMatch(/the clock stops/i);
      expect(text, `${rel}: the one door that stays shut`).toMatch(/cannot go back/i);
    }
  });

  it("keeps the walkthrough card short without letting it contradict them", () => {
    const text = rendered(
      fs.readFileSync(path.join(HERE, "recall/coach.ts"), "utf8"),
    ).replace(/\s+/g, " ");
    expect(text).toMatch(/You can pause/i);
    expect(text).toMatch(/cannot go back/i);
  });
});
