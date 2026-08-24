import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "./content";
import type { ActivityItem, Verdict } from "./api/types";
import { buildIndicatorLedger, ledgerHeadline } from "./ledger";
import {
  CONDITIONAL_REPHRASE_INDICATORS,
  INDICATOR_FAMILIES,
  indicatorMapFor,
} from "./indicator-families";

const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;

/**
 * The map is the whole grouping, so these are the tests that make a reworded
 * category fail loudly instead of quietly re-bucketing the ledger. That is the
 * entire reason the map exists rather than a `category.split(": ")`.
 */
describe("the family map covers the bank", () => {
  it("places every one of the 62 items, with nothing falling through", () => {
    const unplaced = conditional.items.filter(
      (i) => !i.category || !CONDITIONAL_REPHRASE_INDICATORS[i.category],
    );
    expect(unplaced.map((i) => `${i.order}: ${i.category ?? "(none)"}`)).toEqual([]);
    expect(conditional.items).toHaveLength(62);
  });

  it("carries no entry the bank does not use", () => {
    const used = new Set(conditional.items.map((i) => i.category));
    const dead = Object.keys(CONDITIONAL_REPHRASE_INDICATORS).filter((k) => !used.has(k));
    expect(dead).toEqual([]);
  });

  it("places each category in exactly one declared family", () => {
    const families = new Set(Object.keys(INDICATOR_FAMILIES));
    for (const [category, meta] of Object.entries(CONDITIONAL_REPHRASE_INDICATORS)) {
      expect(families.has(meta.family), `${category} -> ${meta.family}`).toBe(true);
      expect(meta.indicator.trim(), category).not.toBe("");
    }
  });

  it("leaves no family standing empty, so a family is never a label with nobody in it", () => {
    const inUse = new Set(Object.values(CONDITIONAL_REPHRASE_INDICATORS).map((m) => m.family));
    expect([...Object.keys(INDICATOR_FAMILIES)].filter((f) => !inUse.has(f as never))).toEqual([]);
  });

  it("merges the two presupposes categories onto one word", () => {
    expect(CONDITIONAL_REPHRASE_INDICATORS["Requirement word: presupposes"]).toEqual(
      CONDITIONAL_REPHRASE_INDICATORS["Requirement word under jargon: presupposes"],
    );
  });

  it("follows the indicator, not the label, where the two disagree", () => {
    // "Same rule, new seat" is a teaching device. The family is the word's.
    expect(CONDITIONAL_REPHRASE_INDICATORS["Same rule, new seat: unless"].family).toBe(
      "negative-requirement",
    );
    expect(CONDITIONAL_REPHRASE_INDICATORS["Same rule, new seat: only if"].family).toBe(
      "requirement",
    );
    expect(CONDITIONAL_REPHRASE_INDICATORS["Stacked negatives: unless"].indicator).toBe("unless");
  });

  it("answers only for an Activity somebody has grouped", () => {
    expect(indicatorMapFor("Conditional Rephrase")).toBeTruthy();
    expect(indicatorMapFor("Vocab Rehab")).toBeNull();
    expect(indicatorMapFor(undefined)).toBeNull();
  });
});

/** A hand-built run, so the arithmetic is checkable by reading it. */
function itemFor(order: number, category: string): ActivityItem {
  return { order, prompt: `p${order}`, credited_answers: ["a"], explanation: "e", category };
}

const ITEMS: ActivityItem[] = [
  itemFor(1, "Negative requirement: unless"),
  itemFor(2, "Same rule, new seat: unless"),
  itemFor(3, "Negative requirement: without"),
  itemFor(4, "Trigger word: if"),
  itemFor(5, "Trigger word: when"),
  itemFor(6, "Requirement word: only if"),
];

describe("the ledger", () => {
  it("groups the misses by family and names the words inside each", () => {
    const v: Record<number, Verdict | null> = {
      1: "incorrect",
      2: "incorrect",
      3: "incorrect",
      4: "correct",
      5: "correct",
      6: "correct",
    };
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, v)!;
    expect(l.missedFamilies).toHaveLength(1);
    expect(l.missedFamilies[0].label).toBe("Negative requirements");
    expect(l.missedFamilies[0].missed).toBe(3);
    expect(l.missedFamilies[0].indicators.map((i) => [i.indicator, i.missed])).toEqual([
      ["unless", 2],
      ["without", 1],
    ]);
    expect(l.cleanFamilies.map((f) => f.label)).toEqual(["Trigger words", "Requirement words"]);
  });

  it("counts a partial as a miss, because the score already docks it half a mark", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, { 1: "partial" })!;
    expect(l.missed).toBe(1);
    expect(l.missedOrders).toEqual([1]);
  });

  it("treats an unjudged item as no evidence, not as a miss and not as clean", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, {
      1: null,
      4: "correct",
    })!;
    expect(l.asked).toBe(1);
    expect(l.missed).toBe(0);
    expect(l.missedFamilies).toEqual([]);
    expect(l.cleanFamilies.map((f) => f.label)).toEqual(["Trigger words"]);
  });

  it("returns the missed orders ascending, which is what a re-drill runs", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, {
      6: "incorrect",
      1: "incorrect",
      3: "partial",
      4: "correct",
    })!;
    expect(l.missedOrders).toEqual([1, 3, 6]);
  });

  it("orders families worst first, breaking a tie toward the smaller family", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, {
      1: "incorrect", // negative-requirement, family asked 3
      4: "incorrect", // trigger, family asked 2
      5: "correct",
      3: "correct",
      2: "correct",
    })!;
    expect(l.missedFamilies.map((f) => f.label)).toEqual([
      "Trigger words",
      "Negative requirements",
    ]);
  });

  it("says nothing at all when there is nothing to say", () => {
    // No map for this Activity.
    expect(buildIndicatorLedger("Vocab Rehab", ITEMS, { 1: "incorrect" })).toBeNull();
    // Nothing judged.
    expect(buildIndicatorLedger("Conditional Rephrase", ITEMS, {})).toBeNull();
    expect(buildIndicatorLedger("Conditional Rephrase", ITEMS, { 1: null })).toBeNull();
  });

  it("counts an item whose category is not in the map rather than dropping it", () => {
    const items = [...ITEMS, itemFor(7, "Newly authored category")];
    const l = buildIndicatorLedger("Conditional Rephrase", items, {
      4: "correct",
      7: "incorrect",
    })!;
    expect(l.unmapped).toBe(1);
    expect(l.asked).toBe(1);
    expect(l.missed).toBe(0);
  });

  it("runs over the whole real bank with nothing unmapped", () => {
    const all = Object.fromEntries(
      conditional.items.map((i) => [i.order, "incorrect" as Verdict]),
    );
    const l = buildIndicatorLedger("Conditional Rephrase", conditional.items, all)!;
    expect(l.unmapped).toBe(0);
    expect(l.asked).toBe(62);
    expect(l.missed).toBe(62);
    expect(l.missedOrders).toHaveLength(62);
    expect(l.missedFamilies).toHaveLength(Object.keys(INDICATOR_FAMILIES).length);
  });
});

describe("the headline", () => {
  it("names the word that cost the most", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, {
      1: "incorrect",
      2: "incorrect",
      3: "incorrect",
    })!;
    expect(ledgerHeadline(l)).toBe("unless cost you 2 questions.");
  });

  it("says one question rather than 1 questions", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, { 3: "incorrect" })!;
    expect(ledgerHeadline(l)).toBe("without cost you one question.");
  });

  it("stays quiet on a tie, rather than crowning one of two equals", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, {
      1: "incorrect",
      3: "incorrect",
    })!;
    expect(ledgerHeadline(l)).toBeNull();
  });

  it("stays quiet on a clean run, which has a better sentence of its own", () => {
    const l = buildIndicatorLedger("Conditional Rephrase", ITEMS, { 1: "correct" })!;
    expect(ledgerHeadline(l)).toBeNull();
  });
});
