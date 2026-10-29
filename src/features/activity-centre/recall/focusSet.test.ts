import { describe, expect, it } from "vitest";
import { pickFocusSet } from "./focusSet";
import type { SectionStimulusGrade } from "../api/types";

function stim(over: Partial<SectionStimulusGrade>): SectionStimulusGrade {
  return {
    slug: "s",
    carried: 10,
    total: 10,
    percent: 100,
    band: "at-the-standard",
    missed: [],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    dead_air_seconds: 0,
    ...over,
  };
}

describe("pickFocusSet", () => {
  it("asks for nothing when every stimulus was at the standard", () => {
    const stimuli = Array.from({ length: 8 }, (_, i) => stim({ slug: `a${i}`, item_order: i }));
    expect(pickFocusSet({ stimuli })).toBeNull();
  });

  it("pads a single weak stimulus up to five", () => {
    const stimuli = Array.from({ length: 12 }, (_, i) =>
      stim({ slug: `a${i}`, item_order: i, percent: 90 + i }),
    );
    stimuli[3] = stim({ slug: "a3", item_order: 3, percent: 40, band: "thin" });
    const set = pickFocusSet({ stimuli })!;
    expect(set.slugs).toHaveLength(5);
    expect(set.slugs).toContain("a3");
    expect(set.weakCount).toBe(1);
  });

  it("caps at ten and keeps authored order", () => {
    const stimuli = Array.from({ length: 20 }, (_, i) =>
      stim({ slug: `a${i}`, item_order: i, percent: 10 + i, band: "lost-it" }),
    );
    const set = pickFocusSet({ stimuli })!;
    expect(set.slugs).toHaveLength(10);
    expect([...set.slugs].sort()).toEqual(set.slugs.slice().sort());
    expect(set.stimuli.map((s) => s.item_order)).toEqual(
      [...set.stimuli].sort((a, b) => a.item_order! - b.item_order!).map((s) => s.item_order),
    );
  });

  it("counts a recited run as weak even at full coverage", () => {
    const stimuli = Array.from({ length: 6 }, (_, i) => stim({ slug: `a${i}`, item_order: i }));
    stimuli[2] = stim({ slug: "a2", item_order: 2, reciting: true });
    const set = pickFocusSet({ stimuli })!;
    expect(set.slugs).toContain("a2");
  });
});
