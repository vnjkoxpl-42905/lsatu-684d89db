import { describe, expect, it } from "vitest";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import { buildRecallSections, restoreRecallPractice, selectRecallPractice, sectionLabel, SectionIntegrityError, verifyLoadedSection, type RecallIndexPassage } from "./sections";
import { STANDARD } from "./fixtures";

const idx = (preptest: number, section: number, setNumber: number, over: Partial<RecallIndexPassage> = {}): RecallIndexPassage => ({
  passageId: preptest * 1000 + section * 10 + setNumber, preptest, section, setNumber, title: null, topic: null, format: null,
  frameworks: [], difficulty: null, questionCount: 6, explainedCount: 6, questionIds: [], firstWords: "Words", ...over,
});
const full = (pt: number, s: number, over: (n: number) => Partial<RecallIndexPassage> = () => ({})) =>
  [1, 2, 3, 4].map((n) => idx(pt, s, n, over(n)));

describe("buildRecallSections", () => {
  it("keeps four-passage groups in published order", () => {
    const shuffled = [...full(140, 4)].reverse();
    const [s] = buildRecallSections(shuffled);
    expect(s.passageIds).toEqual([140041, 140042, 140043, 140044]);
  });
  it("does not exclude a section because its passages have no drillable questions", () => {
    const sections = buildRecallSections(full(100, 2, () => ({ questionCount: 0, explainedCount: 0 })));
    expect(sections).toHaveLength(1);
  });
  it("excludes groups without exactly four passages or without Positions 1-4", () => {
    const three = full(1, 1).slice(0, 3);
    const five = [...full(2, 1), idx(2, 1, 5)];
    const gap = [idx(3, 1, 1), idx(3, 1, 2), idx(3, 1, 3), idx(3, 1, 5)];
    expect(buildRecallSections([...three, ...five, ...gap])).toEqual([]);
  });
  it("excludes sections with an empty passage body", () => {
    expect(buildRecallSections(full(5, 1, (n) => (n === 3 ? { firstWords: " " } : {})))).toEqual([]);
  });
  it("sorts by PrepTest and section", () => {
    const sections = buildRecallSections([...full(9, 2), ...full(9, 1), ...full(3, 4)]);
    expect(sections.map((s) => `${s.preptest}.${s.section}`)).toEqual(["3.4", "9.1", "9.2"]);
  });
});

describe("verifyLoadedSection", () => {
  const section = { preptest: 140, section: 4, passageIds: [1, 2, 3, 4] };
  const passage = (id: number, setNumber: number, text = STANDARD) => ({ passageId: id, setNumber, text }) as RcPassage;
  const good = [passage(1, 1), passage(2, 2), passage(3, 3), passage(4, 4)];

  it("accepts the exact section in order", () => {
    expect(verifyLoadedSection(section, good).segmented).toHaveLength(4);
  });
  it("fails visibly rather than shortening a section", () => {
    expect(() => verifyLoadedSection(section, good.slice(0, 3))).toThrow(SectionIntegrityError);
  });
  it("fails when passages arrive out of order", () => {
    expect(() => verifyLoadedSection(section, [good[1], good[0], good[2], good[3]])).toThrow(SectionIntegrityError);
  });
  it("fails when a passage has no text", () => {
    expect(() => verifyLoadedSection(section, [good[0], passage(2, 2, "  "), good[2], good[3]])).toThrow(/no text/);
  });

  it("keeps a single passage's original position and restores the same selection", () => {
    const single = selectRecallPractice(section, 1, 3);
    expect(single.passageIds).toEqual([3]);
    expect(verifyLoadedSection(single, [good[2]]).passages[0].setNumber).toBe(3);
    expect(restoreRecallPractice(section, [3])).toEqual(single);
    expect(sectionLabel({ ...single, passage_ids: [3] })).toContain("One passage");
  });

  it("refuses a changed, partial or reordered saved selection", () => {
    for (const ids of [[999], [1, 2], [2, 1, 3, 4]]) expect(() => restoreRecallPractice(section, ids)).toThrow(SectionIntegrityError);
    expect(() => verifyLoadedSection(selectRecallPractice(section, 1, 3), [good[0]])).toThrow(SectionIntegrityError);
  });
});
