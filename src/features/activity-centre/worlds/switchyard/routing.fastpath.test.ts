import { describe, expect, it } from "vitest";
import bank from "../../content/conditional-rephrase.json";
import { matchesAnyCredited, parseRouting, PARSER_VERSION } from "./routing";

// The fast path decides `correct` locally, with no model call. That authority
// is only safe if it recognises exactly what the author wrote and nothing more,
// so the suite runs the whole 62-item bank rather than a sample.

interface BankItem {
  order: number;
  prompt: string;
  credited_answers: string[];
  explanation: string;
  category: string;
}

const items = (bank as { items: BankItem[] }).items;
const itemAt = (order: number) => {
  const found = items.find((i) => i.order === order);
  if (!found) throw new Error(`item ${order} missing from the bank`);
  return found;
};

describe("matchesAnyCredited", () => {
  it("covers the whole authored bank", () => {
    expect(items).toHaveLength(62);
  });

  // The bug this stage exists to prevent: checking only credited_answers[0]
  // graded the authored contrapositive as a reversal.
  it("matches EVERY credited answer that parses, on every item", () => {
    const misses: string[] = [];
    for (const item of items) {
      for (const credited of item.credited_answers) {
        if (!parseRouting(credited)) continue; // shorthand: the Coach takes it
        if (!matchesAnyCredited(item.credited_answers, credited)) {
          misses.push(`item ${item.order}: ${credited}`);
        }
      }
    }
    expect(misses).toEqual([]);
  });

  it("matches the first credited answer on all 62 items", () => {
    for (const item of items) {
      expect(matchesAnyCredited(item.credited_answers, item.credited_answers[0])).toBe(true);
    }
  });

  it("credits item 1's contrapositive, which diagnose() called a reversal", () => {
    const item = itemAt(1);
    expect(matchesAnyCredited(item.credited_answers, item.credited_answers[1])).toBe(true);
  });

  // 46, 47 and 48 author both logical directions as credited answers. Grading
  // against slot 0 alone marks the second one wrong.
  it.each([46, 47, 48])("credits both authored directions on item %i", (order) => {
    const item = itemAt(order);
    expect(item.credited_answers.filter((c) => parseRouting(c))).toHaveLength(2);
    for (const credited of item.credited_answers) {
      expect(matchesAnyCredited(item.credited_answers, credited)).toBe(true);
    }
  });

  it("ignores wording that is not part of the routing", () => {
    const item = itemAt(1);
    expect(
      matchesAnyCredited(item.credited_answers, "If the fans run overnight, then the orchids bloom by morning"),
    ).toBe(true);
  });

  // The whole point of the design: falling through is the safe failure.
  it("does not credit nonsense that diagnose() would have called a partial", () => {
    const item = itemAt(18);
    expect(
      matchesAnyCredited(item.credited_answers, "If the generator is not refueled by dusk, then bananas dance"),
    ).toBe(false);
  });

  it("does not credit a reversal", () => {
    const item = itemAt(1);
    expect(
      matchesAnyCredited(item.credited_answers, "If the orchids bloom by morning, then the fans run overnight"),
    ).toBe(false);
  });

  it("does not credit a dropped negation", () => {
    const item = itemAt(18);
    expect(
      matchesAnyCredited(item.credited_answers, "If the generator is refueled by dusk, then the beacon goes dark"),
    ).toBe(false);
  });

  it("does not credit an unparseable answer", () => {
    const item = itemAt(1);
    expect(matchesAnyCredited(item.credited_answers, "Fans overnight means orchids bloom.")).toBe(false);
    expect(matchesAnyCredited(item.credited_answers, "")).toBe(false);
  });

  it("returns false rather than throwing when an item has no credited answers", () => {
    expect(matchesAnyCredited(undefined, "If a, then b")).toBe(false);
    expect(matchesAnyCredited([], "If a, then b")).toBe(false);
  });

  it("names a parser version so shadow telemetry is attributable", () => {
    expect(PARSER_VERSION).toBe("routing-1");
  });
});
