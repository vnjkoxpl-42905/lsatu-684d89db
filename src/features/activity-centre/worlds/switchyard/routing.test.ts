import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { flip, isNegated, parseRouting } from "./routing";

// The whole Switchyard is driven by this parse. If an item does not yield two
// clauses the world has nothing to route, so the coverage assertion below is
// the real test: it fails the moment a bank edit breaks the authored form.

const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;

describe("parseRouting", () => {
  it("splits an authored credited answer into its two clauses", () => {
    const r = parseRouting("If the fans run overnight, then the orchids bloom by morning.")!;
    expect(r.ifClause.text).toBe("the fans run overnight");
    expect(r.thenClause.text).toBe("the orchids bloom by morning");
    expect(r.ifClause.negated).toBe(false);
    expect(r.thenClause.negated).toBe(false);
  });

  it("marks a negated clause so its polarity lamp lights", () => {
    const r = parseRouting(
      "If the generator is not refueled by dusk, then the beacon goes dark.",
    )!;
    expect(r.ifClause.negated).toBe(true);
    expect(r.thenClause.negated).toBe(false);
  });

  it("returns null rather than guessing when the answer is not in if-then form", () => {
    expect(parseRouting("Missing either, not cleared.")).toBeNull();
    expect(parseRouting("Ratified, hearings held.")).toBeNull();
    expect(parseRouting("")).toBeNull();
  });

  it("parses the credited answer of every item the world can honestly route", () => {
    // The routing animation is this drill's reveal, so an item the world cannot
    // route is an item that cannot be run. This started at 88% because six
    // placement-study items carried shorthand ("Same translation exactly") in
    // the credited-answer slot, which the Coach would have judged students
    // against.
    //
    // Full coverage was the invariant until item 62 showed that a PARSE is not
    // the same thing as a correct one: its credited answer carries two
    // conditionals, and the regex handed the whole tail back as a single
    // clause, so the yard drew an entire second rule inside one capsule. It is
    // refused now. Refusing is the honest outcome -- the world falls back to
    // the plain prompt and the authored answers, which are correct -- and the
    // count is asserted so a second refusal cannot appear unnoticed.
    const unroutable = conditional.items.filter((i) => !parseRouting(i.credited_answers[0]));
    expect(unroutable.map((i) => i.order)).toEqual([62]);
  });

  it("refuses a sentence carrying two conditionals rather than guessing its clauses", () => {
    expect(
      parseRouting("If A is confirmed, then B dates to spring; and if C is trustworthy, then D was sealed."),
    ).toBeNull();
    // A single conditional with the same punctuation is still fine.
    expect(parseRouting("If A is confirmed, then B dates to spring.")).not.toBeNull();
  });

  it("gives every item a distinct authored contrapositive to show on the plate", () => {
    for (const item of conditional.items) {
      expect(item.credited_answers.length, `item ${item.order}`).toBeGreaterThanOrEqual(2);
      expect(item.credited_answers[1], `item ${item.order}`).not.toBe(item.credited_answers[0]);
    }
  });

  it("never yields an empty clause on anything it does parse", () => {
    for (const item of conditional.items) {
      const r = parseRouting(item.credited_answers[0]);
      if (!r) continue;
      expect(r.ifClause.text.length, `item ${item.order} if`).toBeGreaterThan(0);
      expect(r.thenClause.text.length, `item ${item.order} then`).toBeGreaterThan(0);
      expect(r.ifClause.text, `item ${item.order}`).not.toMatch(/^then\b/i);
    }
  });
});

describe("isNegated", () => {
  it.each([
    ["the fans run overnight", false],
    ["the generator is not refueled by dusk", true],
    ["a climber cannot attempt the summit", true],
    ["no vendor may sell at the night market", true],
    ["the orchids did not bloom by morning", true],
    ["two floor managers are present", false],
    ["the culture stays viable", false],
  ])("%s -> %s", (clause, expected) => {
    expect(isNegated(clause)).toBe(expected);
  });
});

describe("flip", () => {
  it("swaps the tracks and inverts both polarities in one move", () => {
    const r = parseRouting("If the fans run overnight, then the orchids bloom by morning.")!;
    const f = flip(r);
    expect(f.ifClause.text).toBe("the orchids bloom by morning");
    expect(f.ifClause.negated).toBe(true);
    expect(f.thenClause.text).toBe("the fans run overnight");
    expect(f.thenClause.negated).toBe(true);
  });

  it("is its own inverse, which is what makes it one mechanism and not two facts", () => {
    for (const item of conditional.items.slice(0, 20)) {
      const r = parseRouting(item.credited_answers[0]);
      if (!r) continue;
      expect(flip(flip(r))).toEqual(r);
    }
  });
});
