import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { RcIndex, RcPreptestFile } from "@/features/rc/lib/rcTypes";
import { buildRecallSections, restoreRecallPractice, selectRecallPractice, verifyLoadedSection } from "./sections";
import { buildSectionSteps } from "./sequence";
import { RC_TRAINING_DEMO_PARAGRAPHS } from "../RcTrainingDemo";

const bank = resolve(process.cwd(), "public/data/rc");
const read = <T,>(name: string): T => JSON.parse(readFileSync(resolve(bank, name), "utf8"));
const index = read<RcIndex>("rc-index.json");
const sections = buildRecallSections(index.preptests.flatMap((pt) => pt.passages.map((p) => ({ ...p, preptest: pt.preptest }))));

describe("complete RC Training sections in the published bank", () => {
  it("uses the actual opening paragraphs of the passage recommended beside the demo", () => {
    const passage = read<RcPreptestFile>("RC-PT140.json").passages.find((p) => p.passageId === 15)!;
    expect(passage.title).toBe("Online Game Currencies");
    for (const paragraph of RC_TRAINING_DEMO_PARAGRAPHS) expect(passage.text).toContain(paragraph);
  });
  it("makes complete sets available from every indexed PrepTest", () => {
    expect(sections.length).toBeGreaterThan(0);
    expect(new Set(sections.map((s) => s.preptest))).toEqual(new Set(index.preptests.map((pt) => pt.preptest)));
  });

  it.each(sections)("loads four ordered passages and a complete workout for PT$preptest section $section", (section) => {
    const file = read<RcPreptestFile>(`RC-PT${section.preptest}.json`);
    const loaded = section.passageIds.map((id) => file.passages.find((p) => p.passageId === id)!);
    expect(loaded.every(Boolean)).toBe(true);
    const { passages, segmented } = verifyLoadedSection(section, loaded);
    expect(passages).toHaveLength(4);
    expect(segmented.every((p) => p.paragraphs.length > 0)).toBe(true);
    const steps = buildSectionSteps("rc_recall", segmented, "all_read");
    expect(steps.length).toBeGreaterThan(0);
    expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
    expect(new Set(steps.map((step) => step.passage))).toEqual(new Set([0, 1, 2, 3]));
  });

  it.each(sections.flatMap((section) => [1, 2, 3, 4].map((position) => ({ section, position }))))(
    "loads and resumes one original passage: PT$section.preptest section $section.section passage $position",
    ({ section, position }) => {
      const file = read<RcPreptestFile>(`RC-PT${section.preptest}.json`);
      const selection = selectRecallPractice(section, 1, position);
      const restored = restoreRecallPractice(section, selection.passageIds);
      expect(restored).toEqual(selection);
      const loaded = selection.passageIds.map((id) => file.passages.find((p) => p.passageId === id)!);
      const { passages, segmented } = verifyLoadedSection(restored, loaded);
      expect(passages).toHaveLength(1);
      expect(passages[0].setNumber).toBe(position);
      const steps = buildSectionSteps("rc_recall", segmented, "all_read");
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.every((step) => step.passage === 0)).toBe(true);
      expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
    },
  );
});
