import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { LEXICON, buildGallery, buildSortingRound, routableItems } from "./rounds";

// Both wings drill against the authored bank, so these assert the two things
// that would quietly ruin them: a round that is not reproducible, and a lever
// that collects the wrong items ("only if" swallowing "the only" is the exact
// confusion the gallery exists to drill apart).

const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;

describe("routableItems", () => {
  it("keeps only the items whose credited answer parses into two clauses", () => {
    const pool = routableItems(conditional.items);
    expect(pool.length).toBeGreaterThan(40);
    for (const p of pool) {
      expect(p.ifText.length, `item ${p.order} if`).toBeGreaterThan(0);
      expect(p.thenText.length, `item ${p.order} then`).toBeGreaterThan(0);
    }
  });

  it("alternates which clause is presented first so the answer is not positional", () => {
    const pool = routableItems(conditional.items);
    const swapped = pool.filter((p) => p.swapped).length;
    expect(swapped).toBeGreaterThan(0);
    expect(swapped).toBeLessThan(pool.length);
  });
});

describe("buildSortingRound", () => {
  it("returns ten statements", () => {
    expect(buildSortingRound(conditional.items)).toHaveLength(10);
  });

  it("is deterministic, so a round can be reviewed before a student sees it", () => {
    expect(buildSortingRound(conditional.items, 10, 7)).toEqual(
      buildSortingRound(conditional.items, 10, 7),
    );
  });

  it("moves the round on with the offset", () => {
    const a = buildSortingRound(conditional.items, 10, 0);
    const b = buildSortingRound(conditional.items, 10, 5);
    expect(a[0].order).not.toBe(b[0].order);
  });

  it("wraps rather than running short at the end of the pool", () => {
    const pool = routableItems(conditional.items);
    const round = buildSortingRound(conditional.items, 10, pool.length - 3);
    expect(round).toHaveLength(10);
  });

  it("returns nothing rather than inventing a round from an empty bank", () => {
    expect(buildSortingRound([], 10, 0)).toEqual([]);
  });
});

describe("buildGallery", () => {
  const levers = buildGallery(conditional.items);

  it("renders only levers the bank can actually back", () => {
    expect(levers.length).toBeGreaterThan(0);
    for (const l of levers) expect(l.prompts.length).toBeGreaterThan(0);
    expect(levers.every((l) => LEXICON.includes(l.word))).toBe(true);
  });

  it("keeps the look-alike pair apart: no 'the only' item lands on the 'only if' lever", () => {
    const onlyIf = levers.find((l) => l.word === "only if");
    expect(onlyIf).toBeTruthy();
    for (const p of onlyIf!.prompts) {
      expect(p.indicator?.toLowerCase(), `item ${p.order}`).not.toContain("the only");
    }
  });

  it("gives the two look-alikes their own levers", () => {
    expect(levers.find((l) => l.word === "the only")?.prompts.length).toBeGreaterThan(0);
    expect(levers.find((l) => l.word === "only if")?.prompts.length).toBeGreaterThan(0);
  });

  it("keeps the lexicon's order, so the pair stays adjacent in the wall", () => {
    const words = levers.map((l) => l.word);
    const sorted = [...words].sort((a, b) => LEXICON.indexOf(a) - LEXICON.indexOf(b));
    expect(words).toEqual(sorted);
    expect(Math.abs(words.indexOf("the only") - words.indexOf("only if"))).toBe(1);
  });
});
